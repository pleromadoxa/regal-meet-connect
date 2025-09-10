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
    // Suppress AbortError logs as they're normal during stream updates
    if (error instanceof ErrorEvent && !error.message.includes('AbortError')) {
      console.warn('Video error:', error);
    }
    onError?.(error);
  }, [onError]);

  const handleLoadedMetadata = useCallback(() => {
    onLoadedMetadata?.();
  }, [onLoadedMetadata]);

  const playVideo = useCallback(async (videoElement: HTMLVideoElement) => {
    if (isPlayingRef.current || !videoElement.srcObject) return;
    
    try {
      if (videoElement.readyState >= 2) {
        isPlayingRef.current = true;
        await videoElement.play();
      }
    } catch (error) {
      isPlayingRef.current = false;
      // Only log non-AbortError issues
      if (error instanceof Error && !error.message.includes('AbortError')) {
        console.warn('Video play failed:', error);
      }
    }
  }, []);

  useEffect(() => {
    const videoElement = videoRef.current;
    if (!videoElement) return;

    // Only update srcObject if the stream actually changed
    const currentStreamId = stream?.id || streamId;
    const streamChanged = streamIdRef.current !== currentStreamId || currentStreamRef.current !== stream;
    
    if (!streamChanged) return;

    // Clean up previous stream
    if (currentStreamRef.current) {
      videoElement.pause();
      isPlayingRef.current = false;
    }

    if (!stream) {
      videoElement.srcObject = null;
      currentStreamRef.current = null;
      streamIdRef.current = '';
      return;
    }

    // Set new stream with debounce to prevent rapid updates
    const updateTimeout = setTimeout(() => {
      if (!videoElement || videoElement.srcObject === stream) return;
      
      streamIdRef.current = currentStreamId;
      currentStreamRef.current = stream;
      
      videoElement.addEventListener('loadedmetadata', handleLoadedMetadata, { once: true });
      videoElement.addEventListener('error', handleError, { once: true });

      videoElement.srcObject = stream;
      isPlayingRef.current = false;

      // Use requestAnimationFrame for smooth updates
      requestAnimationFrame(() => {
        if (autoPlay) {
          playVideo(videoElement);
        }
      });
    }, 100); // Debounce rapid stream changes

    return () => {
      clearTimeout(updateTimeout);
      videoElement.removeEventListener('loadedmetadata', handleLoadedMetadata);
      videoElement.removeEventListener('error', handleError);
    };
  }, [stream, streamId, autoPlay, handleError, handleLoadedMetadata, playVideo]);

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

    return () => {
      videoElement.removeEventListener('play', handlePlay);
      videoElement.removeEventListener('pause', handlePause);
    };
  }, []);

  return (
    <video
      ref={videoRef}
      autoPlay={autoPlay}
      playsInline={playsInline}
      muted={muted || isLocal}
      preload="metadata"
      webkit-playsinline="true"
      x5-playsinline="true"
      x5-video-player-type="h5"
      x5-video-player-fullscreen="true"
      className={className}
    />
  );
});

StableVideoElement.displayName = 'StableVideoElement';