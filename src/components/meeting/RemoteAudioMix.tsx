import { useEffect, useRef } from 'react';

interface RemoteAudioMixProps {
  streams: Map<string, MediaStream>;
}

/**
 * Sole remote-audio sink for meetings.
 * Video tiles must stay muted — this element owns playback so we avoid double-audio.
 */
export const RemoteAudioMix = ({ streams }: RemoteAudioMixProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const elementsRef = useRef<Map<string, HTMLAudioElement>>(new Map());
  const unlockBoundRef = useRef(false);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const elements = elementsRef.current;
    const activeIds = new Set<string>();

    const tryPlay = (audio: HTMLAudioElement) => {
      const p = audio.play();
      if (p && typeof p.then === 'function') {
        p.catch(() => {
          /* autoplay blocked until user gesture — unlock listeners below */
        });
      }
    };

    streams.forEach((stream, peerId) => {
      const hasAudio = stream.getAudioTracks().length > 0;
      if (!hasAudio) return;
      activeIds.add(peerId);

      let audio = elements.get(peerId);
      if (!audio) {
        audio = document.createElement('audio');
        audio.autoplay = true;
        audio.setAttribute('playsinline', 'true');
        (audio as HTMLAudioElement & { playsInline?: boolean }).playsInline = true;
        audio.preload = 'auto';
        container.appendChild(audio);
        elements.set(peerId, audio);
      }

      // Keep volume up even if track.enabled flips — browser still mixes silenced tracks
      audio.muted = false;
      audio.volume = 1;

      if (audio.srcObject !== stream) {
        audio.srcObject = stream;
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
  }, [streams]);

  // Unlock playback after first user gesture (autoplay policies)
  useEffect(() => {
    const unlock = () => {
      if (unlockBoundRef.current) return;
      unlockBoundRef.current = true;
      elementsRef.current.forEach((audio) => {
        void audio.play().catch(() => undefined);
      });
    };

    window.addEventListener('pointerdown', unlock, { once: true, capture: true });
    window.addEventListener('keydown', unlock, { once: true, capture: true });
    window.addEventListener('touchstart', unlock, { once: true, capture: true });

    return () => {
      window.removeEventListener('pointerdown', unlock, true);
      window.removeEventListener('keydown', unlock, true);
      window.removeEventListener('touchstart', unlock, true);
    };
  }, []);

  // Full cleanup on unmount
  useEffect(() => {
    return () => {
      elementsRef.current.forEach((audio) => {
        audio.pause();
        audio.srcObject = null;
        audio.remove();
      });
      elementsRef.current.clear();
    };
  }, []);

  return <div ref={containerRef} className="sr-only" aria-hidden />;
};
