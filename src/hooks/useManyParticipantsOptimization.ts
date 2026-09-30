import { useState, useEffect, useRef, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import type { MeetingPlanLimits } from '@/lib/meetingPlanLimits';
import { VIDEO_BITRATE_BPS, VIDEO_FRAMERATE, videoCaptureConstraints } from '@/lib/videoQuality';

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
  const planLimitsRef = useRef<MeetingPlanLimits | null>(null);
  const lastToastCountRef = useRef(0);

  const setPlanLimits = useCallback((limits: MeetingPlanLimits) => {
    planLimitsRef.current = limits;
  }, []);
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
      maxParticipants: 500,
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
    let maxVideoStreams = 25;
    let enableVirtualization = false;
    let enablePagination = false;

    // Keep 1080p for typical rooms; step down only when the grid gets large
    if (participantCount > 60) {
      videoQuality = 'potato';
      maxVideoStreams = 6;
      enableVirtualization = true;
      enablePagination = true;
    } else if (participantCount > 36) {
      videoQuality = 'low';
      maxVideoStreams = 9;
      enableVirtualization = true;
      enablePagination = true;
    } else if (participantCount > 20) {
      videoQuality = 'medium';
      maxVideoStreams = 16;
      enableVirtualization = true;
      enablePagination = true;
    } else {
      videoQuality = 'high';
      maxVideoStreams = 25;
    }

    if (participantCount > 20 && lastToastCountRef.current <= 20) {
      lastToastCountRef.current = participantCount;
      toast({
        title: 'Large meeting',
        description: `${participantCount} participants — optimizing for stability while keeping video sharp.`,
        duration: 3000,
      });
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
    const maxHeight = planLimitsRef.current?.maxVideoHeight ?? 1080;

    if (!isVideo) {
      return {
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: participantCount > 25 ? 24000 : 48000,
          channelCount: 1,
        },
      };
    }

    const videoConstraints = videoCaptureConstraints(videoQuality, maxHeight);

    return {
      video: videoConstraints,
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
        sampleRate: participantCount > 25 ? 24000 : 48000,
        channelCount: 1,
      },
    };
  }, [optimizationSettings]);

  // Get bitrate settings optimized for participant count
  const getOptimizedBitrate = useCallback(() => {
    const { videoQuality, participantCount } = optimizationSettings;
    
    let baseBitrate = 0;
    
    switch (videoQuality) {
      case 'potato':
        baseBitrate = VIDEO_BITRATE_BPS.potato;
        break;
      case 'low':
        baseBitrate = VIDEO_BITRATE_BPS.low;
        break;
      case 'medium':
        baseBitrate = VIDEO_BITRATE_BPS.medium;
        break;
      case 'high':
        baseBitrate = VIDEO_BITRATE_BPS.high;
        break;
    }

    if (participantCount > 50) {
      baseBitrate *= 0.6;
    } else if (participantCount > 30) {
      baseBitrate *= 0.8;
    }

    return Math.max(baseBitrate, 350000);
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
            params.encodings[0].maxFramerate = VIDEO_FRAMERATE[optimizationSettings.videoQuality];
            
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
    setOptimizationSettings,
    setPlanLimits,
  };
};