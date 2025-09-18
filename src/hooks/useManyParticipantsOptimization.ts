import { useState, useEffect, useRef, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';

interface ParticipantLimits {
  maxVideoStreams: number;
  maxParticipants: number;
  autoQualityThreshold: number;
  speakerPriority: boolean;
  enableVirtualization: boolean;
}

interface OptimizationSettings {
  participantCount: number;
  videoQuality: 'high' | 'medium' | 'low' | 'potato';
  enabledFeatures: {
    speakerHighlight: boolean;
    automaticQuality: boolean;
    limitVideoStreams: boolean;
    paginateParticipants: boolean;
  };
  limits: ParticipantLimits;
}

export const useManyParticipantsOptimization = () => {
  const { toast } = useToast();
  const [optimizationSettings, setOptimizationSettings] = useState<OptimizationSettings>({
    participantCount: 0,
    videoQuality: 'high',
    enabledFeatures: {
      speakerHighlight: true,
      automaticQuality: true,
      limitVideoStreams: true,
      paginateParticipants: false
    },
    limits: {
      maxVideoStreams: 9, // Default to 3x3 grid
      maxParticipants: 50,
      autoQualityThreshold: 6,
      speakerPriority: true,
      enableVirtualization: false
    }
  });

  const [visibleParticipantIds, setVisibleParticipantIds] = useState<Set<string>>(new Set());
  const [speakingParticipants, setSpeakingParticipants] = useState<Set<string>>(new Set());
  const [prioritizedStreams, setPrioritizedStreams] = useState<string[]>([]);

  // Calculate optimal settings based on participant count
  const calculateOptimalSettings = useCallback((participantCount: number) => {
    let videoQuality: OptimizationSettings['videoQuality'] = 'high';
    let maxVideoStreams = 25; // 5x5 grid max
    let enableVirtualization = false;
    let enablePagination = false;

    // Auto-adjust quality and limits based on participant count
    if (participantCount > 20) {
      videoQuality = 'potato';
      maxVideoStreams = 9; // 3x3 grid
      enableVirtualization = true;
      enablePagination = true;
      
      toast({
        title: "Large Meeting Detected",
        description: `${participantCount} participants detected. Enabling performance optimizations.`,
        duration: 3000,
      });
    } else if (participantCount > 12) {
      videoQuality = 'low';
      maxVideoStreams = 16; // 4x4 grid
      enableVirtualization = true;
    } else if (participantCount > 8) {
      videoQuality = 'medium';
      maxVideoStreams = 16; // 4x4 grid
    } else if (participantCount > 4) {
      videoQuality = 'medium';
      maxVideoStreams = 25; // 5x5 grid
    }

    return {
      videoQuality,
      limits: {
        ...optimizationSettings.limits,
        maxVideoStreams,
        enableVirtualization
      },
      enabledFeatures: {
        ...optimizationSettings.enabledFeatures,
        paginateParticipants: enablePagination,
        limitVideoStreams: participantCount > 6,
        automaticQuality: participantCount > optimizationSettings.limits.autoQualityThreshold
      }
    };
  }, [optimizationSettings.limits, optimizationSettings.enabledFeatures, toast]);

  // Update optimization settings when participant count changes
  const updateParticipantCount = useCallback((count: number) => {
    console.log(`Updating participant count: ${count}`);
    
    const newSettings = calculateOptimalSettings(count);
    
    setOptimizationSettings(prev => ({
      ...prev,
      participantCount: count,
      ...newSettings
    }));

    // Log performance optimizations
    if (count > 6) {
      console.log('Performance optimizations applied:', {
        participantCount: count,
        videoQuality: newSettings.videoQuality,
        maxVideoStreams: newSettings.limits.maxVideoStreams,
        virtualization: newSettings.limits.enableVirtualization
      });
    }
  }, [calculateOptimalSettings]);

  // Prioritize speaking participants for video display
  const updateSpeakingParticipants = useCallback((speakers: Set<string>) => {
    setSpeakingParticipants(speakers);
    
    if (optimizationSettings.enabledFeatures.speakerHighlight) {
      // Prioritize speaking participants in video streams
      setPrioritizedStreams(prev => {
        const speakersArray = Array.from(speakers);
        const nonSpeakers = prev.filter(id => !speakers.has(id));
        
        // Speaking participants first, then others
        return [...speakersArray, ...nonSpeakers].slice(0, optimizationSettings.limits.maxVideoStreams);
      });
    }
  }, [optimizationSettings.enabledFeatures.speakerHighlight, optimizationSettings.limits.maxVideoStreams]);

  // Get media constraints optimized for participant count
  const getOptimizedMediaConstraints = useCallback((isVideo = true) => {
    const { videoQuality, participantCount } = optimizationSettings;
    
    if (!isVideo) {
      return {
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: participantCount > 10 ? 16000 : 44100, // Lower sample rate for many participants
          channelCount: 1 // Always mono for efficiency
        }
      };
    }

    let videoConstraints: MediaTrackConstraints = {};

    switch (videoQuality) {
      case 'potato':
        videoConstraints = {
          width: { ideal: 160, max: 320 },
          height: { ideal: 120, max: 240 },
          frameRate: { ideal: 5, max: 10 }
        };
        break;
      case 'low':
        videoConstraints = {
          width: { ideal: 320, max: 480 },
          height: { ideal: 240, max: 360 },
          frameRate: { ideal: 10, max: 15 }
        };
        break;
      case 'medium':
        videoConstraints = {
          width: { ideal: 640, max: 854 },
          height: { ideal: 480, max: 640 },
          frameRate: { ideal: 15, max: 24 }
        };
        break;
      case 'high':
      default:
        videoConstraints = {
          width: { ideal: 1280, max: 1920 },
          height: { ideal: 720, max: 1080 },
          frameRate: { ideal: 24, max: 30 }
        };
        break;
    }

    return {
      video: videoConstraints,
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
        sampleRate: participantCount > 10 ? 16000 : 44100,
        channelCount: 1
      }
    };
  }, [optimizationSettings]);

  // Get bitrate settings optimized for participant count
  const getOptimizedBitrate = useCallback(() => {
    const { videoQuality, participantCount } = optimizationSettings;
    
    let baseBitrate = 0;
    
    switch (videoQuality) {
      case 'potato':
        baseBitrate = 50000; // 50 Kbps
        break;
      case 'low':
        baseBitrate = 150000; // 150 Kbps
        break;
      case 'medium':
        baseBitrate = 500000; // 500 Kbps
        break;
      case 'high':
        baseBitrate = 1000000; // 1 Mbps
        break;
    }

    // Reduce bitrate further based on participant count
    if (participantCount > 15) {
      baseBitrate *= 0.3; // 70% reduction
    } else if (participantCount > 10) {
      baseBitrate *= 0.5; // 50% reduction
    } else if (participantCount > 6) {
      baseBitrate *= 0.7; // 30% reduction
    }

    return Math.max(baseBitrate, 25000); // Minimum 25 Kbps
  }, [optimizationSettings]);

  // Apply bitrate optimization to all peer connections
  const applyOptimizedBitrate = useCallback(async (peerConnections: Map<string, RTCPeerConnection>) => {
    const targetBitrate = getOptimizedBitrate();
    
    for (const [peerId, pc] of peerConnections) {
      try {
        const senders = pc.getSenders();
        const videoSender = senders.find(sender => 
          sender.track && sender.track.kind === 'video'
        );

        if (videoSender && videoSender.track) {
          const params = videoSender.getParameters();
          
          if (params.encodings && params.encodings.length > 0) {
            params.encodings[0].maxBitrate = targetBitrate;
            params.encodings[0].maxFramerate = optimizationSettings.videoQuality === 'potato' ? 5 : 15;
            
            await videoSender.setParameters(params);
            console.log(`Applied optimized bitrate ${Math.round(targetBitrate / 1000)}Kbps to peer ${peerId}`);
          }
        }
      } catch (error) {
        console.error(`Error applying bitrate optimization to peer ${peerId}:`, error);
      }
    }
  }, [getOptimizedBitrate, optimizationSettings.videoQuality]);

  // Get grid configuration optimized for participant count
  const getOptimizedGridConfig = useCallback((totalParticipants: number) => {
    const { maxVideoStreams, enableVirtualization } = optimizationSettings.limits;
    const { paginateParticipants } = optimizationSettings.enabledFeatures;
    
    // Limit displayed participants for performance
    const displayedParticipants = Math.min(totalParticipants, maxVideoStreams);
    
    let cols: number, rows: number;
    
    if (displayedParticipants <= 1) {
      cols = 1; rows = 1;
    } else if (displayedParticipants <= 2) {
      cols = 2; rows = 1;
    } else if (displayedParticipants <= 4) {
      cols = 2; rows = 2;
    } else if (displayedParticipants <= 6) {
      cols = 3; rows = 2;
    } else if (displayedParticipants <= 9) {
      cols = 3; rows = 3;
    } else if (displayedParticipants <= 12) {
      cols = 4; rows = 3;
    } else if (displayedParticipants <= 16) {
      cols = 4; rows = 4;
    } else {
      // For many participants, use a more compact layout
      cols = Math.min(5, Math.ceil(Math.sqrt(displayedParticipants)));
      rows = Math.ceil(displayedParticipants / cols);
    }

    return {
      cols,
      rows,
      displayedCount: displayedParticipants,
      totalCount: totalParticipants,
      hasOverflow: totalParticipants > displayedParticipants,
      overflowCount: Math.max(0, totalParticipants - displayedParticipants),
      enableVirtualization,
      enablePagination: paginateParticipants
    };
  }, [optimizationSettings.limits, optimizationSettings.enabledFeatures]);

  // Determine which participants should have video enabled
  const shouldRenderVideo = useCallback((participantId: string, index: number) => {
    const { maxVideoStreams } = optimizationSettings.limits;
    const { speakerHighlight, limitVideoStreams } = optimizationSettings.enabledFeatures;
    
    // Always render if video stream limiting is disabled
    if (!limitVideoStreams) return true;
    
    // Prioritize speaking participants
    if (speakerHighlight && speakingParticipants.has(participantId)) {
      return true;
    }
    
    // Limit based on grid capacity
    return index < maxVideoStreams;
  }, [optimizationSettings.limits, optimizationSettings.enabledFeatures, speakingParticipants]);

  // Monitor and warn about performance
  const monitorPerformance = useCallback(() => {
    const { participantCount } = optimizationSettings;
    
    if (participantCount > 25 && !optimizationSettings.enabledFeatures.paginateParticipants) {
      toast({
        title: "Performance Warning",
        description: "Large meeting detected. Consider enabling pagination for better performance.",
        variant: "destructive",
        duration: 5000,
      });
    }
  }, [optimizationSettings, toast]);

  // Effect to monitor performance
  useEffect(() => {
    monitorPerformance();
  }, [monitorPerformance]);

  return {
    optimizationSettings,
    visibleParticipantIds,
    speakingParticipants,
    prioritizedStreams,
    updateParticipantCount,
    updateSpeakingParticipants,
    getOptimizedMediaConstraints,
    getOptimizedBitrate,
    applyOptimizedBitrate,
    getOptimizedGridConfig,
    shouldRenderVideo,
    setOptimizationSettings
  };
};