import { useEffect, useRef } from 'react';

interface RemoteAudioMixProps {
  streams: Map<string, MediaStream>;
}

/** Plays all remote audio streams (required for large audio-only meetings) */
export const RemoteAudioMix = ({ streams }: RemoteAudioMixProps) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const elements = new Map<string, HTMLAudioElement>();

    streams.forEach((stream, peerId) => {
      if (!stream.getAudioTracks().some((t) => t.enabled)) return;

      let audio = elements.get(peerId);
      if (!audio) {
        audio = document.createElement('audio');
        audio.autoplay = true;
        audio.playsInline = true;
        audio.setAttribute('playsinline', 'true');
        container.appendChild(audio);
        elements.set(peerId, audio);
      }
      if (audio.srcObject !== stream) {
        audio.srcObject = stream;
        audio.play().catch(() => {
          /* autoplay policy — user gesture elsewhere enables audio */
        });
      }
    });

    elements.forEach((audio, peerId) => {
      if (!streams.has(peerId)) {
        audio.pause();
        audio.srcObject = null;
        audio.remove();
        elements.delete(peerId);
      }
    });
  }, [streams]);

  return <div ref={containerRef} className="sr-only" aria-hidden />;
};
