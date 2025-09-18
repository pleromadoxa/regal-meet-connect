import React, { useRef, useEffect, useCallback, memo } from 'react';

interface StableVideoElementProps {
  stream: MediaStream | null;
  streamId: string;
  isLocal?: boolean;
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
  className = "w-full h-full object-cover",
  muted = false,
  autoPlay = true,
  playsInline = true,
  onLoadedMetadata,
  onError
}: StableVideoElementProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const currentStreamRef = useRef<MediaStream | null>(null);
  const streamIdRef = useRef<string>('');
  const isPlayingRef = useRef<boolean>(false);

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

    // Don't update if it's the same stream and stream ID
    if (currentStreamRef.current === stream && streamIdRef.current === streamId && stream) {
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
      className={className}
      muted={muted || isLocal}
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
        background: 'linear-gradient(45deg, #1e293b, #334155)'
      }}
    />
  );
});

StableVideoElement.displayName = 'StableVideoElement';