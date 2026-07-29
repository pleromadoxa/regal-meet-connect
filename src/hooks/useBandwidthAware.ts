import { useCallback } from 'react';

interface VideoConstraints {
  width: { min: number; ideal: number; max: number };
  height: { min: number; ideal: number; max: number };
  frameRate: { min: number; ideal: number; max: number };
}

interface NetworkQualityLevel {
  qualityLevel: 'high' | 'medium' | 'low' | 'potato';
}

export const useBandwidthAware = () => {
  
  const getVideoConstraints = useCallback((quality: NetworkQualityLevel['qualityLevel']): VideoConstraints => {
    switch (quality) {
      case 'high':
        return {
          width: { min: 640, ideal: 1280, max: 1920 },
          height: { min: 480, ideal: 720, max: 1080 },
          frameRate: { min: 15, ideal: 30, max: 30 }
        };
      case 'medium':
        return {
          width: { min: 320, ideal: 640, max: 1280 },
          height: { min: 240, ideal: 480, max: 720 },
          frameRate: { min: 10, ideal: 24, max: 24 }
        };
      case 'low':
        return {
          width: { min: 240, ideal: 480, max: 640 },
          height: { min: 180, ideal: 360, max: 480 },
          frameRate: { min: 8, ideal: 15, max: 15 }
        };
      case 'potato':
        return {
          width: { min: 160, ideal: 320, max: 480 },
          height: { min: 120, ideal: 240, max: 360 },
          frameRate: { min: 5, ideal: 10, max: 10 }
        };
      default:
        return {
          width: { min: 640, ideal: 1280, max: 1920 },
          height: { min: 480, ideal: 720, max: 1080 },
          frameRate: { min: 15, ideal: 30, max: 30 }
        };
    }
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