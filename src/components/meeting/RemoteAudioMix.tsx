import { useEffect, useRef } from 'react';

interface RemoteAudioMixProps {
  streams: Map<string, MediaStream>;
}

/**
 * Sole remote-audio sink for meetings.
 * Video tiles must stay muted — this element owns playback so we avoid double-audio.
 *
 * Reliability notes:
 *  - one `<audio>` per peer, bound to that peer's *stable* stream (see
 *    `lib/remoteTracks`), so a late-arriving screen/tab-audio track can no
 *    longer silently replace the mic stream and mute someone,
 *  - playback is re-attempted on every user gesture, on window focus, on stream
 *    `addtrack`, and on a slow watchdog — autoplay policy and transient
 *    `pause()`s used to leave elements silently stopped forever.
 */
export const RemoteAudioMix = ({ streams }: RemoteAudioMixProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const elementsRef = useRef<Map<string, HTMLAudioElement>>(new Map());
  const watchedStreamsRef = useRef<Map<MediaStream, () => void>>(new Map());

  const tryPlay = (audio: HTMLAudioElement) => {
    try {
      const p = audio.play();
      if (p && typeof p.then === 'function') p.catch(() => undefined);
    } catch {
      /* ignore — retried by the watchdog / gesture handlers */
    }
  };

  const unbindStream = (stream: MediaStream, onChange: () => void) => {
    stream.removeEventListener('addtrack', onChange);
    stream.removeEventListener('removetrack', onChange);
  };

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const elements = elementsRef.current;
    const activeIds = new Set<string>();

    streams.forEach((stream, peerId) => {
      const hasLiveAudio = stream.getAudioTracks().some((t) => t.readyState !== 'ended');
      if (!hasLiveAudio) return;
      activeIds.add(peerId);

      let audio = elements.get(peerId);
      if (!audio) {
        const el = document.createElement('audio');
        el.autoplay = true;
        el.setAttribute('playsinline', 'true');
        (el as HTMLAudioElement & { playsInline?: boolean }).playsInline = true;
        el.preload = 'auto';
        el.addEventListener('canplay', () => tryPlay(el));
        el.addEventListener('loadedmetadata', () => tryPlay(el));
        container.appendChild(el);
        elements.set(peerId, el);
        audio = el;
      }

      // Keep volume up even if track.enabled flips — browser still mixes silenced tracks
      audio.muted = false;
      audio.volume = 1;

      if (audio.srcObject !== stream) {
        audio.srcObject = stream;
      }

      // Re-arming when tracks are added *after* we bound the element is what
      // used to fail silently (e.g. tab audio announced a moment later).
      if (!watchedStreamsRef.current.has(stream)) {
        const onChange = () => {
          const el = elements.get(peerId);
          if (!el) return;
          el.srcObject = null;
          el.srcObject = stream;
          tryPlay(el);
        };
        stream.addEventListener('addtrack', onChange);
        stream.addEventListener('removetrack', onChange);
        watchedStreamsRef.current.set(stream, onChange);
      }

      tryPlay(audio);
    });

    elements.forEach((audio, peerId) => {
      if (activeIds.has(peerId)) return;
      audio.pause();
      audio.srcObject = null;
      audio.remove();
      elements.delete(peerId);
    });

    // Drop stream listeners for peers that are gone.
    const liveStreams = new Set<MediaStream>(streams.values());
    watchedStreamsRef.current.forEach((onChange, stream) => {
      if (liveStreams.has(stream)) return;
      unbindStream(stream, onChange);
      watchedStreamsRef.current.delete(stream);
    });
  }, [streams]);

  // Retry playback on user interaction, refocus and tab visibility (autoplay
  // policies and transient pauses otherwise leave the meeting silently muted).
  useEffect(() => {
    const retryAll = () => {
      elementsRef.current.forEach((audio) => {
        audio.muted = false;
        audio.volume = 1;
        if (audio.paused || audio.ended) tryPlay(audio);
      });
    };

    window.addEventListener('pointerdown', retryAll, { capture: true });
    window.addEventListener('keydown', retryAll, { capture: true });
    window.addEventListener('touchstart', retryAll, { capture: true });
    window.addEventListener('focus', retryAll);
    document.addEventListener('visibilitychange', retryAll);

    return () => {
      window.removeEventListener('pointerdown', retryAll, true);
      window.removeEventListener('keydown', retryAll, true);
      window.removeEventListener('touchstart', retryAll, true);
      window.removeEventListener('focus', retryAll);
      document.removeEventListener('visibilitychange', retryAll);
    };
  }, []);

  // Watchdog: restart any sink that stopped without us asking.
  useEffect(() => {
    const timer = window.setInterval(() => {
      elementsRef.current.forEach((audio) => {
        if (audio.paused || audio.ended) tryPlay(audio);
      });
    }, 4000);
    return () => window.clearInterval(timer);
  }, []);

  // Full cleanup on unmount
  useEffect(() => {
    const elements = elementsRef.current;
    const watched = watchedStreamsRef.current;
    return () => {
      elements.forEach((audio) => {
        audio.pause();
        audio.srcObject = null;
        audio.remove();
      });
      elements.clear();
      watched.forEach((onChange, stream) => unbindStream(stream, onChange));
      watched.clear();
    };
  }, []);

  return <div ref={containerRef} className="sr-only" aria-hidden />;
};
