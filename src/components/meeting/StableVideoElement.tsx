import React, { useRef, useEffect, useCallback, memo } from 'react';
import { isScreenShareTrack } from '@/lib/largeMeeting';

interface StableVideoElementProps {
  stream: MediaStream | null;
  streamId: string;
  isLocal?: boolean;
  /**
   * Force mirroring on/off. Screens and presentations must NEVER be mirrored
   * (a mirrored screen looks like reversed/"Arabic" text), so screen-share
   * streams ignore `isLocal` unless `mirror` is passed explicitly.
   */
  mirror?: boolean;
  className?: string;
  muted?: boolean;
  autoPlay?: boolean;
  playsInline?: boolean;
  onLoadedMetadata?: () => void;
  onError?: (error: Event) => void;
}

export const StableVideoElement = memo(({
  stream,
  streamId,
  isLocal = false,
  mirror,
  className = "w-full h-full object-cover",
  muted: _mutedProp = true,
  autoPlay = true,
  playsInline = true,
  onLoadedMetadata,
  onError
}: StableVideoElementProps) => {
  void _mutedProp; // API kept for callers; remote audio always goes through RemoteAudioMix
  const videoRef = useRef<HTMLVideoElement>(null);
  const currentStreamRef = useRef<MediaStream | null>(null);
  const streamIdRef = useRef<string>('');
  const isPlayingRef = useRef<boolean>(false);

  const videoTrack = stream?.getVideoTracks()[0];
  const isScreenShare = isScreenShareTrack(videoTrack);

  // Never mirror a screen/presentation: `scaleX(-1)` makes slides and text read
  // backwards ("Arabic style"). Only a local selfie camera is mirrored.
  const shouldMirror = mirror ?? (isLocal && !isScreenShare);

  // Screen shares must keep their aspect ratio — `object-cover` crops them.
  const resolvedClassName = isScreenShare
    ? /\bobject-/.test(className)
      ? className.replace(/\bobject-cover\b/g, 'object-contain')
      : `${className} object-contain`
    : className;

  const handleError = useCallback((error: Event) => {
    onError?.(error);
  }, [onError, streamId]);

  const handleLoadedMetadata = useCallback(() => {
    onLoadedMetadata?.();
  }, [onLoadedMetadata, streamId]);

  const playVideo = useCallback(async (videoElement: HTMLVideoElement) => {
    if (isPlayingRef.current || !videoElement.srcObject) return;
    
    try {
      if (videoElement.readyState >= 2) {
        isPlayingRef.current = true;
        await videoElement.play();
      }
    } catch (error) {
      console.error('Video play failed:', error);
      isPlayingRef.current = false;
    }
  }, []);

  // Effect to handle stream changes with stability checks
  useEffect(() => {
    const videoElement = videoRef.current;
    
    if (!videoElement) {
      return;
    }

    const sameStream = currentStreamRef.current === stream;
    const sameVideoTrack =
      !!stream &&
      !!currentStreamRef.current &&
      stream.getVideoTracks()[0]?.id === currentStreamRef.current.getVideoTracks()[0]?.id;
    if ((sameStream || sameVideoTrack) && streamIdRef.current === streamId && stream) {
      currentStreamRef.current = stream;
      return;
    }

    // Don't process if no stream and already cleared
    if (!stream && !currentStreamRef.current) {
      return;
    }

    // Reset playing state when changing streams
    isPlayingRef.current = false;

    // Set new stream
    videoElement.srcObject = stream;
    currentStreamRef.current = stream;
    streamIdRef.current = streamId;

    if (stream) {
      const refreshPlayback = () => {
        if (autoPlay && videoElement.srcObject === stream) {
          void playVideo(videoElement);
        }
      };
      stream.getVideoTracks().forEach((track) => {
        track.onended = refreshPlayback;
        track.onunmute = refreshPlayback;
      });
    }

    if (stream && autoPlay) {
      // Delay play to ensure stream is ready
      const playTimeout = setTimeout(() => {
        playVideo(videoElement);
      }, 100);

      return () => clearTimeout(playTimeout);
    }
  }, [stream, streamId, autoPlay, playVideo]);

  // Handle play/pause state changes
  useEffect(() => {
    const videoElement = videoRef.current;
    if (!videoElement) return;

    const handlePlay = () => {
      isPlayingRef.current = true;
    };

    const handlePause = () => {
      isPlayingRef.current = false;
    };

    videoElement.addEventListener('play', handlePlay);
    videoElement.addEventListener('pause', handlePause);
    videoElement.addEventListener('loadedmetadata', handleLoadedMetadata);
    videoElement.addEventListener('error', handleError);

    return () => {
      videoElement.removeEventListener('play', handlePlay);
      videoElement.removeEventListener('pause', handlePause);
      videoElement.removeEventListener('loadedmetadata', handleLoadedMetadata);
      videoElement.removeEventListener('error', handleError);
    };
  }, [handleLoadedMetadata, handleError]);

  return (
    <video
      ref={videoRef}
      className={resolvedClassName}
      // Remote audio is owned by RemoteAudioMix — never play it from <video>
      muted
      autoPlay={autoPlay}
      playsInline={playsInline}
      preload="metadata"
      webkit-playsinline="true"
      x5-playsinline="true"
      onCanPlay={() => {
        const video = videoRef.current;
        if (video && autoPlay && !isPlayingRef.current) {
          playVideo(video);
        }
      }}
      style={{
        display: 'block',
        background: 'linear-gradient(45deg, #1e293b, #334155)',
        transform: shouldMirror ? 'scaleX(-1)' : undefined,
      }}
    />
  );
});

StableVideoElement.displayName = 'StableVideoElement';