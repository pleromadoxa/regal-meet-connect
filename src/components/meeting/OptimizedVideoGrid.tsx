import React, { useRef, useEffect, useState, useMemo, useCallback } from 'react';
import { Card } from '@/components/ui/card';
import { User, Mic, MicOff, Crown, MapPin, ChevronLeft, ChevronRight } from 'lucide-react';
import { StableVideoElement } from './StableVideoElement';
import { Button } from '@/components/ui/button';
import { useManyParticipantsOptimization } from '@/hooks/useManyParticipantsOptimization';
import { AudioIndicator } from '@/components/AudioIndicator';

interface RemoteStream {
  id: string;
  stream: MediaStream;
  userName: string;
}

interface Participant {
  id: string;
  user_id: string;
  user_name: string;
  is_host: boolean;
  is_muted: boolean;
  joined_at: string;
  country?: string;
  city?: string;
}

interface OptimizedVideoGridProps {
  localStream: MediaStream | null;
  remoteStreams: RemoteStream[];
  userName: string;
  isVideoEnabled: boolean;
  participants: Participant[];
  currentUserId: string;
  isCurrentUserHost: boolean;
  speakingParticipants?: Set<string>;
}

export const OptimizedVideoGrid = ({
  localStream,
  remoteStreams,
  userName,
  isVideoEnabled,
  participants,
  currentUserId,
  isCurrentUserHost,
  speakingParticipants = new Set()
}: OptimizedVideoGridProps) => {
  const [currentPage, setCurrentPage] = useState(0);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const gridRef = useRef<HTMLDivElement>(null);

  const {
    optimizationSettings,
    updateParticipantCount,
    updateSpeakingParticipants,
    getOptimizedGridConfig,
    shouldRenderVideo
  } = useManyParticipantsOptimization();

  // Update participant count when it changes
  useEffect(() => {
    const totalParticipants = remoteStreams.length + 1;
    updateParticipantCount(totalParticipants);
  }, [remoteStreams.length, updateParticipantCount]);

  // Update speaking participants
  useEffect(() => {
    updateSpeakingParticipants(speakingParticipants);
  }, [speakingParticipants, updateSpeakingParticipants]);

  // Calculate grid configuration
  const gridConfig = useMemo(() => {
    const totalParticipants = remoteStreams.length + 1;
    return getOptimizedGridConfig(totalParticipants);
  }, [remoteStreams.length, getOptimizedGridConfig]);

  // Get participant info with memoization
  const getParticipantInfo = useCallback((streamUserName: string, isLocal = false) => {
    if (isLocal) {
      return {
        name: userName,
        isHost: isCurrentUserHost,
        isMuted: !localStream?.getAudioTracks()?.[0]?.enabled,
        country: undefined,
        city: undefined,
        isSpeaking: speakingParticipants.has(currentUserId)
      };
    }
    
    const participant = participants.find(p => p.user_name === streamUserName);
    return {
      name: participant?.user_name || streamUserName,
      isHost: participant?.is_host || false,
      isMuted: participant?.is_muted || false,
      country: participant?.country,
      city: participant?.city,
      isSpeaking: speakingParticipants.has(participant?.user_id || '')
    };
  }, [userName, isCurrentUserHost, localStream, participants, speakingParticipants, currentUserId]);

  // Prioritize streams (speaking participants first)
  const prioritizedStreams = useMemo(() => {
    const localStreamData = { 
      id: 'local', 
      stream: localStream, 
      userName: userName,
      isLocal: true,
      isSpeaking: speakingParticipants.has(currentUserId)
    };

    const remoteStreamData = remoteStreams.map(stream => {
      const participant = participants.find(p => p.user_name === stream.userName);
      const isSpeaking = speakingParticipants.has(participant?.user_id || '');
      return { ...stream, isLocal: false, isSpeaking };
    });

    // Sort by speaking status (speaking first), then by join time
    const allStreams = [localStreamData, ...remoteStreamData];
    
    if (optimizationSettings.enabledFeatures.speakerHighlight) {
      return allStreams.sort((a, b) => {
        // Speaking participants first
        if (a.isSpeaking && !b.isSpeaking) return -1;
        if (!a.isSpeaking && b.isSpeaking) return 1;
        
        // Host priority
        const aInfo = getParticipantInfo(a.userName, a.isLocal);
        const bInfo = getParticipantInfo(b.userName, b.isLocal);
        if (aInfo.isHost && !bInfo.isHost) return -1;
        if (!aInfo.isHost && bInfo.isHost) return 1;
        
        return 0;
      });
    }

    return allStreams;
  }, [localStream, remoteStreams, userName, currentUserId, participants, speakingParticipants, optimizationSettings.enabledFeatures.speakerHighlight, getParticipantInfo]);

  // Calculate pagination
  const paginatedStreams = useMemo(() => {
    const { displayedCount, enablePagination } = gridConfig;
    
    if (!enablePagination) {
      return prioritizedStreams.slice(0, displayedCount);
    }

    const startIndex = currentPage * displayedCount;
    return prioritizedStreams.slice(startIndex, startIndex + displayedCount);
  }, [prioritizedStreams, gridConfig, currentPage]);

  const totalPages = Math.ceil(prioritizedStreams.length / gridConfig.displayedCount);

  // Intersection Observer for performance optimization
  useEffect(() => {
    if (!gridConfig.enableVirtualization) return;

    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const video = entry.target.querySelector('video') as HTMLVideoElement;
          if (video) {
            if (entry.isIntersecting) {
              video.play().catch(console.error);
            } else {
              video.pause();
            }
          }
        });
      },
      { threshold: 0.1 }
    );

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [gridConfig.enableVirtualization]);

  const VideoTile = useCallback(({ 
    stream, 
    streamId, 
    participantName, 
    isLocal = false,
    index = 0
  }: {
    stream: MediaStream | null;
    streamId: string;
    participantName: string;
    isLocal?: boolean;
    index?: number;
  }) => {
    const [isVideoLoaded, setIsVideoLoaded] = useState(false);
    const tileRef = useRef<HTMLDivElement>(null);
    
    const participantInfo = useMemo(() => 
      getParticipantInfo(participantName, isLocal), 
      [participantName, isLocal, getParticipantInfo]
    );

    // Determine if video should be rendered based on optimization settings
    const renderVideo = shouldRenderVideo(streamId, index);
    
    // Track states for performance
    const trackStates = useMemo(() => {
      if (!stream || !renderVideo) return { hasVideo: false, hasAudio: false };
      
      const videoTracks = stream.getVideoTracks();
      const audioTracks = stream.getAudioTracks();
      
      return {
        hasVideo: videoTracks.length > 0 && videoTracks[0].enabled,
        hasAudio: audioTracks.length > 0 && audioTracks[0].enabled
      };
    }, [stream, renderVideo]);

    // Set up intersection observer for this tile
    useEffect(() => {
      if (gridConfig.enableVirtualization && tileRef.current && observerRef.current) {
        observerRef.current.observe(tileRef.current);
        
        return () => {
          if (tileRef.current && observerRef.current) {
            observerRef.current.unobserve(tileRef.current);
          }
        };
      }
    }, [gridConfig.enableVirtualization]);

    const { hasVideo, hasAudio } = trackStates;
    
    return (
      <Card 
        ref={tileRef}
        className={`relative overflow-hidden border transition-all duration-200 aspect-video ${
          participantInfo.isSpeaking 
            ? 'border-green-400 shadow-lg shadow-green-400/30 bg-slate-800/95' 
            : 'border-slate-600/60 bg-slate-800/90 hover:border-slate-500/60'
        }`}
      >
        {renderVideo && stream ? (
          <StableVideoElement
            stream={stream}
            streamId={streamId}
            isLocal={isLocal}
            onLoadedMetadata={() => setIsVideoLoaded(true)}
            onError={() => setIsVideoLoaded(false)}
            className={`w-full h-full object-cover transition-opacity duration-200 ${
              hasVideo && isVideoLoaded ? 'opacity-100' : 'opacity-0'
            }`}
          />
        ) : null}
        
        {/* Fallback content */}
        <div className={`absolute inset-0 w-full h-full flex items-center justify-center bg-gradient-to-br from-slate-700 to-slate-800 transition-opacity duration-200 ${
          hasVideo && isVideoLoaded && renderVideo ? 'opacity-0 pointer-events-none' : 'opacity-100'
        }`}>
          <div className="flex flex-col items-center">
            <div className={`w-8 h-8 sm:w-12 sm:h-12 rounded-full flex items-center justify-center mb-2 ${
              participantInfo.isSpeaking ? 'bg-green-500' : 'bg-slate-600'
            }`}>
              <User className="h-4 w-4 sm:h-6 sm:w-6 text-white" />
            </div>
            <span className="text-xs sm:text-sm text-slate-300 font-medium truncate max-w-full px-2">
              {participantInfo.name}
              {isLocal && " (You)"}
            </span>
          </div>
        </div>

        {/* Status indicators */}
        <div className="absolute top-2 right-2 flex space-x-1 z-10">
          {participantInfo.isSpeaking && (
            <div className="p-1 bg-green-500/90 rounded-full animate-pulse">
              <Mic className="h-2 w-2 sm:h-3 sm:w-3 text-white" />
            </div>
          )}
          {!hasAudio && (
            <div className="p-1 bg-red-500/90 rounded-full">
              <MicOff className="h-2 w-2 sm:h-3 sm:w-3 text-white" />
            </div>
          )}
          {participantInfo.isHost && (
            <div className="p-1 bg-yellow-500/90 rounded-full">
              <Crown className="h-2 w-2 sm:h-3 sm:w-3 text-white" />
            </div>
          )}
        </div>

        {/* Location display */}
        {(participantInfo.country || participantInfo.city) && !isLocal && (
          <div className="absolute top-2 left-2 z-10">
            <div className="flex items-center space-x-1 bg-black/70 backdrop-blur-sm rounded-md px-2 py-1">
              <MapPin className="h-2 w-2 sm:h-3 sm:w-3 text-white/80" />
              <span className="text-white text-xs font-medium">
                {participantInfo.city && participantInfo.country 
                  ? `${participantInfo.city}, ${participantInfo.country}`
                  : participantInfo.country || participantInfo.city}
              </span>
            </div>
          </div>
        )}

        {/* Name overlay */}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 via-black/50 to-transparent p-2 z-10">
          <div className="flex items-center justify-between">
            <span className="text-white text-xs sm:text-sm font-medium truncate pr-2">
              {participantInfo.name}
              {isLocal && " (You)"}
            </span>
            <div className="flex items-center space-x-2">
              {/* Audio Visualizer - Always show when stream exists */}
              {stream && (
                <AudioIndicator stream={stream} className="opacity-90" />
              )}
            </div>
          </div>
        </div>

        {/* Performance indicator for limited video */}
        {!renderVideo && (
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-xs text-white/60">
            Audio Only
          </div>
        )}
      </Card>
    );
  }, [getParticipantInfo, shouldRenderVideo, gridConfig.enableVirtualization]);

  return (
    <div className="h-full w-full flex flex-col">
      {/* Performance indicator */}
      {optimizationSettings.participantCount > 6 && (
        <div className="absolute top-4 right-4 z-20 bg-black/70 backdrop-blur-md px-3 py-2 rounded-full">
          <span className="text-white text-sm font-medium">
            Performance Mode: {optimizationSettings.videoQuality.toUpperCase()}
          </span>
        </div>
      )}

      {/* Main grid */}
      <div className="flex-1 p-2 sm:p-4 pb-20 sm:pb-24">
        <div 
          ref={gridRef}
          className="grid gap-1 sm:gap-2 h-full w-full"
          style={{
            gridTemplateColumns: `repeat(${gridConfig.cols}, minmax(0, 1fr))`,
            gridTemplateRows: `repeat(${gridConfig.rows}, minmax(0, 1fr))`
          }}
        >
          {paginatedStreams.map((streamData, index) => (
            <VideoTile
              key={streamData.id}
              stream={streamData.stream}
              streamId={streamData.id}
              participantName={streamData.userName}
              isLocal={streamData.isLocal}
              index={index}
            />
          ))}
        </div>
      </div>

      {/* Overflow indicator */}
      {gridConfig.hasOverflow && !gridConfig.enablePagination && (
        <div className="absolute bottom-4 left-4 bg-black/70 backdrop-blur-md px-3 py-2 rounded-full">
          <span className="text-white text-sm font-medium">
            +{gridConfig.overflowCount} more participants
          </span>
        </div>
      )}

      {/* Pagination controls */}
      {gridConfig.enablePagination && totalPages > 1 && (
        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 z-20">
          <div className="flex items-center space-x-2 bg-black/70 backdrop-blur-md px-4 py-2 rounded-full">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setCurrentPage(Math.max(0, currentPage - 1))}
              disabled={currentPage === 0}
              className="text-white hover:bg-white/20"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-white text-sm font-medium">
              {currentPage + 1} / {totalPages}
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setCurrentPage(Math.min(totalPages - 1, currentPage + 1))}
              disabled={currentPage === totalPages - 1}
              className="text-white hover:bg-white/20"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Speaking participants indicator */}
      {speakingParticipants.size > 0 && optimizationSettings.enabledFeatures.speakerHighlight && (
        <div className="absolute top-4 left-4 z-20 bg-green-500/90 backdrop-blur-md px-3 py-2 rounded-full">
          <span className="text-white text-sm font-medium">
            {speakingParticipants.size} speaking
          </span>
        </div>
      )}
    </div>
  );
};