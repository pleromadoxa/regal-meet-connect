import React, { useEffect, useRef, useState } from 'react';
import { Card } from '@/components/ui/card';
import { User, Mic, MicOff, Crown } from 'lucide-react';

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
}

interface ResponsiveVideoGridProps {
  localStream: MediaStream | null;
  remoteStreams: RemoteStream[];
  userName: string;
  isVideoEnabled: boolean;
  participants: Participant[];
  currentUserId: string;
  isCurrentUserHost: boolean;
}

export const ResponsiveVideoGrid = ({
  localStream,
  remoteStreams,
  userName,
  isVideoEnabled,
  participants,
  currentUserId,
  isCurrentUserHost
}: ResponsiveVideoGridProps) => {
  // Calculate grid dimensions based on participant count
  const totalParticipants = remoteStreams.length + 1; // +1 for local user
  
  const getGridConfig = (count: number) => {
    if (count <= 1) return { cols: 1, rows: 1 };
    if (count <= 2) return { cols: 2, rows: 1 };
    if (count <= 4) return { cols: 2, rows: 2 };
    if (count <= 6) return { cols: 3, rows: 2 };
    if (count <= 9) return { cols: 3, rows: 3 };
    if (count <= 12) return { cols: 4, rows: 3 };
    if (count <= 16) return { cols: 4, rows: 4 };
    if (count <= 20) return { cols: 5, rows: 4 };
    if (count <= 25) return { cols: 5, rows: 5 };
    // For very large groups, use 6 columns
    return { cols: 6, rows: Math.ceil(count / 6) };
  };

  const gridConfig = getGridConfig(totalParticipants);

  // Get participant info from participants array
  const getParticipantInfo = (streamUserName: string, isLocal = false) => {
    if (isLocal) {
      return {
        name: userName,
        isHost: isCurrentUserHost,
        isMuted: !localStream?.getAudioTracks()?.[0]?.enabled
      };
    }
    
    const participant = participants.find(p => p.user_name === streamUserName);
    return {
      name: participant?.user_name || streamUserName,
      isHost: participant?.is_host || false,
      isMuted: participant?.is_muted || false
    };
  };

  // Combine all streams for uniform handling
  const allStreams = [
    { 
      id: 'local', 
      stream: localStream, 
      userName: userName,
      isLocal: true
    },
    ...remoteStreams.map(stream => ({ ...stream, isLocal: false }))
  ];

  const VideoTile = ({ 
    stream, 
    streamId, 
    participantName, 
    isLocal = false 
  }: {
    stream: MediaStream | null;
    streamId: string;
    participantName: string;
    isLocal?: boolean;
  }) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const [isVideoLoaded, setIsVideoLoaded] = useState(false);
    const participantInfo = getParticipantInfo(participantName, isLocal);
    
    const hasVideo = stream && stream.getVideoTracks().length > 0 && stream.getVideoTracks()[0].enabled;
    const hasAudio = stream && stream.getAudioTracks().length > 0 && stream.getAudioTracks()[0].enabled;
    
    useEffect(() => {
      const videoElement = videoRef.current;
      if (!videoElement || !stream || !hasVideo) return;

      if (videoElement.srcObject !== stream) {
        videoElement.srcObject = stream;
        
        const handleLoadedMetadata = () => {
          setIsVideoLoaded(true);
        };

        videoElement.addEventListener('loadedmetadata', handleLoadedMetadata);

        const playVideo = async () => {
          try {
            await videoElement.play();
          } catch (error) {
            console.warn('Video play failed:', error);
          }
        };

        playVideo();

        return () => {
          videoElement.removeEventListener('loadedmetadata', handleLoadedMetadata);
        };
      }
    }, [stream, hasVideo]);

    return (
      <Card className="relative overflow-hidden bg-slate-800/90 border border-slate-600/60 hover:border-slate-500/60 transition-all duration-200 aspect-video">
        {hasVideo && isVideoLoaded ? (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted={isLocal}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-slate-700 to-slate-800">
            <div className="flex flex-col items-center">
              <div className="w-8 h-8 sm:w-12 sm:h-12 bg-slate-600 rounded-full flex items-center justify-center mb-2">
                <User className="h-4 w-4 sm:h-6 sm:w-6 text-slate-300" />
              </div>
              <span className="text-xs sm:text-sm text-slate-300 font-medium truncate max-w-full px-2">
                {participantInfo.name}
                {isLocal && " (You)"}
              </span>
            </div>
          </div>
        )}

        {/* Status indicators */}
        <div className="absolute top-2 right-2 flex space-x-1">
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

        {/* Name overlay */}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 via-black/50 to-transparent p-2">
          <div className="flex items-center justify-between">
            <span className="text-white text-xs sm:text-sm font-medium truncate pr-2">
              {participantInfo.name}
              {isLocal && " (You)"}
            </span>
            {hasAudio && (
              <div className="flex items-center space-x-1">
                <Mic className="h-3 w-3 text-green-400" />
                <div className="w-1 h-1 sm:w-2 sm:h-2 bg-green-400 rounded-full animate-pulse"></div>
              </div>
            )}
          </div>
        </div>
      </Card>
    );
  };

  return (
    <div className="h-full w-full p-2 sm:p-4 pb-20 sm:pb-24">
      <div 
        className="grid gap-1 sm:gap-2 h-full w-full"
        style={{
          gridTemplateColumns: `repeat(${gridConfig.cols}, minmax(0, 1fr))`,
          gridTemplateRows: `repeat(${gridConfig.rows}, minmax(0, 1fr))`
        }}
      >
        {allStreams.slice(0, gridConfig.cols * gridConfig.rows).map((streamData) => (
          <VideoTile
            key={streamData.id}
            stream={streamData.stream}
            streamId={streamData.id}
            participantName={streamData.userName}
            isLocal={streamData.isLocal}
          />
        ))}
      </div>
      
      {/* Overflow indicator if there are too many participants */}
      {totalParticipants > gridConfig.cols * gridConfig.rows && (
        <div className="absolute bottom-4 left-4 bg-black/70 backdrop-blur-md px-3 py-2 rounded-full">
          <span className="text-white text-sm font-medium">
            +{totalParticipants - (gridConfig.cols * gridConfig.rows)} more
          </span>
        </div>
      )}
    </div>
  );
};