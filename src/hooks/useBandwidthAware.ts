import { useCallback } from 'react';
import { videoCaptureConstraints, type VideoQualityLevel } from '@/lib/videoQuality';

interface VideoConstraints {
  width: { min: number; ideal: number; max: number };
  height: { min: number; ideal: number; max: number };
  frameRate: { min: number; ideal: number; max: number };
}

interface NetworkQualityLevel {
  qualityLevel: VideoQualityLevel;
}

export const useBandwidthAware = () => {
  
  const getVideoConstraints = useCallback((quality: NetworkQualityLevel['qualityLevel']): VideoConstraints => {
    const capture = videoCaptureConstraints(quality);
    const width = capture.width as { ideal?: number; max?: number };
    const height = capture.height as { ideal?: number; max?: number };
    const frameRate = capture.frameRate as { ideal?: number; max?: number };
    return {
      width: { ideal: width.ideal ?? 1920 },
      height: { ideal: height.ideal ?? 1080 },
      frameRate: { ideal: frameRate.ideal ?? 30 },
    };
  }, []);

  const getOptimalConstraints = useCallback((
    quality: NetworkQualityLevel['qualityLevel'] = 'high',
    facingMode: 'user' | 'environment' = 'user'
  ): MediaStreamConstraints => {
    const videoConstraints = getVideoConstraints(quality);

    return {
      video: {
        ...videoConstraints,
        facingMode,
        // Additional mobile optimizations
        aspectRatio: { ideal: 16/9 },
        // Prioritize frame rate over resolution for poor connections
        ...(quality === 'potato' || quality === 'low' ? {
          width: { ideal: videoConstraints.width.min },
          height: { ideal: videoConstraints.height.min }
        } : {})
      },
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
        // Reduce audio quality for very poor connections
        ...(quality === 'potato' ? {
          sampleRate: 16000,
          channelCount: 1
        } : {
          sampleRate: 48000,
          channelCount: 2
        })
      }
    };
  }, [getVideoConstraints]);

  const getScreenShareConstraints = useCallback((quality: NetworkQualityLevel['qualityLevel'] = 'high'): MediaStreamConstraints => {
    const baseConstraints = {
      cursor: 'always' as const,
      displaySurface: 'monitor' as const,
    };

    switch (quality) {
      case 'high':
        return {
          video: {
            ...baseConstraints,
            width: { ideal: 1920, max: 1920 },
            height: { ideal: 1080, max: 1080 },
            frameRate: { ideal: 30, max: 30 }
          },
          audio: true
        };
      case 'medium':
        return {
          video: {
            ...baseConstraints,
            width: { ideal: 1280, max: 1280 },
            height: { ideal: 720, max: 720 },
            frameRate: { ideal: 24, max: 24 }
          },
          audio: true
        };
      case 'low':
        return {
          video: {
            ...baseConstraints,
            width: { ideal: 1024, max: 1024 },
            height: { ideal: 768, max: 768 },
            frameRate: { ideal: 15, max: 15 }
          },
          audio: true
        };
      case 'potato':
        return {
          video: {
            ...baseConstraints,
            width: { ideal: 640, max: 640 },
            height: { ideal: 480, max: 480 },
            frameRate: { ideal: 10, max: 10 }
          },
          audio: false // Disable screen share audio for very poor connections
        };
      default:
        return {
          video: baseConstraints,
          audio: true
        };
    }
  }, []);

  return {
    getVideoConstraints,
    getOptimalConstraints,
    getScreenShareConstraints
  };
};