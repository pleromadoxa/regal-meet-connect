
import React from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { User, Mic, MicOff, Crown } from 'lucide-react';

interface RemoteStream {
  id: string;
  stream: MediaStream;
  userName: string;
}

interface MobileParticipantGridProps {
  localStream: MediaStream | null;
  remoteStreams: RemoteStream[];
  userName: string;
  selectedVideoId: string;
  onVideoSelect: (streamId: string) => void;
  isCurrentUserHost: boolean;
  participants: any[];
}

export const MobileParticipantGrid = ({
  localStream,
  remoteStreams,
  userName,
  selectedVideoId,
  onVideoSelect,
  isCurrentUserHost,
  participants
}: MobileParticipantGridProps) => {
  const totalParticipants = remoteStreams.length + 1;
  
  // Calculate grid layout for mobile
  const getGridCols = (count: number) => {
    if (count === 1) return 'grid-cols-1';
    if (count === 2) return 'grid-cols-1';
    if (count <= 4) return 'grid-cols-2';
    return 'grid-cols-2';
  };

  // Check if participant is host
  const isParticipantHost = (participantName: string) => {
    const participant = participants.find(p => p.user_name === participantName);
    return participant?.is_host || false;
  };

  const ParticipantCard = ({ 
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
    const isSelected = selectedVideoId === streamId;
    const hasVideo = stream && stream.getVideoTracks().length > 0 && stream.getVideoTracks()[0].enabled;
    const hasAudio = stream && stream.getAudioTracks().length > 0 && stream.getAudioTracks()[0].enabled;
    const isHost = isLocal ? isCurrentUserHost : isParticipantHost(participantName);

    return (
      <Card 
        className={`relative overflow-hidden cursor-pointer transition-all duration-300 ${
          isSelected 
            ? 'ring-2 ring-orange-400 bg-orange-500/10 border-orange-400/40' 
            : 'bg-slate-800/80 border-slate-700/60 hover:bg-slate-700/80'
        } backdrop-blur-sm`}
        onClick={() => onVideoSelect(streamId)}
      >
        <div className="aspect-video relative min-h-[140px]">
          {hasVideo ? (
            <video
              ref={(video) => {
                if (video && stream) {
                  video.srcObject = stream;
                  video.play().catch(console.warn);
                }
              }}
              autoPlay
              playsInline
              muted={isLocal}
              className="w-full h-full object-cover rounded-lg"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-slate-700 to-slate-800 rounded-lg">
              <div className="text-center">
                <User className="h-12 w-12 text-slate-400 mx-auto mb-2" />
                <p className="text-slate-300 text-sm font-medium">
                  {participantName}
                  {isLocal && " (You)"}
                </p>
              </div>
            </div>
          )}

          {/* Status indicators */}
          <div className="absolute top-2 right-2 flex space-x-1">
            {!hasAudio && (
              <div className="p-1.5 bg-red-500/90 rounded-full shadow-lg">
                <MicOff className="h-3 w-3 text-white" />
              </div>
            )}
            {isHost && (
              <div className="p-1.5 bg-yellow-500/90 rounded-full shadow-lg">
                <Crown className="h-3 w-3 text-white" />
              </div>
            )}
          </div>

          {/* Name overlay */}
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 to-transparent p-3">
            <div className="flex items-center justify-between">
              <p className="text-white text-sm font-medium truncate">
                {participantName}
                {isLocal && " (You)"}
              </p>
              {hasAudio && (
                <Mic className="h-4 w-4 text-green-400 flex-shrink-0 ml-2" />
              )}
            </div>
          </div>

          {/* Selection indicator */}
          {isSelected && (
            <div className="absolute top-2 left-2">
              <div className="w-3 h-3 bg-orange-400 rounded-full animate-pulse shadow-lg"></div>
            </div>
          )}
        </div>
      </Card>
    );
  };

  return (
    <div className={`grid ${getGridCols(totalParticipants)} gap-3 p-3 h-full overflow-y-auto`}>
      {/* Local user */}
      <ParticipantCard
        stream={localStream}
        streamId="local"
        participantName={userName}
        isLocal={true}
      />

      {/* Remote participants */}
      {remoteStreams.map((remoteStream) => (
        <ParticipantCard
          key={remoteStream.id}
          stream={remoteStream.stream}
          streamId={remoteStream.id}
          participantName={remoteStream.userName}
        />
      ))}
    </div>
  );
};
