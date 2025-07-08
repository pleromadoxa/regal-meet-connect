
import React from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { User, Mic, MicOff, Crown } from 'lucide-react';

interface RemoteStream {
  id: string;
  stream: MediaStream;
  userName: string;
}

interface ParticipantsSidebarProps {
  localStream: MediaStream | null;
  remoteStreams: RemoteStream[];
  userName: string;
  selectedVideoId: string;
  onVideoSelect: (streamId: string) => void;
  isCurrentUserHost: boolean;
  participants: any[];
  currentUserId: string;
}

export const ParticipantsSidebar = ({
  localStream,
  remoteStreams,
  userName,
  selectedVideoId,
  onVideoSelect,
  isCurrentUserHost,
  participants,
  currentUserId
}: ParticipantsSidebarProps) => {
  // Check if participant is host
  const isParticipantHost = (participantName: string) => {
    const participant = participants.find(p => p.user_name === participantName);
    return participant?.is_host || false;
  };

  const ParticipantThumbnail = ({ 
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
            : 'bg-slate-800/60 border-slate-700/60 hover:bg-slate-700/60'
        } backdrop-blur-sm`}
        onClick={() => onVideoSelect(streamId)}
      >
        <div className="aspect-video relative">
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
              <User className="h-8 w-8 text-slate-400" />
            </div>
          )}

          {/* Status indicators */}
          <div className="absolute top-2 right-2 flex space-x-1">
            {!hasAudio && (
              <div className="p-1 bg-red-500/80 rounded-full">
                <MicOff className="h-3 w-3 text-white" />
              </div>
            )}
            {isHost && (
              <div className="p-1 bg-yellow-500/80 rounded-full">
                <Crown className="h-3 w-3 text-white" />
              </div>
            )}
          </div>

          {/* Name overlay */}
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-2">
            <p className="text-white text-sm font-medium truncate">
              {participantName}
              {isLocal && " (You)"}
            </p>
          </div>

          {/* Selection indicator */}
          {isSelected && (
            <div className="absolute top-2 left-2">
              <div className="w-2 h-2 bg-orange-400 rounded-full animate-pulse"></div>
            </div>
          )}
        </div>
      </Card>
    );
  };

  return (
    <div className="w-80 bg-slate-900/60 backdrop-blur-xl border-l border-slate-700/60 p-4 space-y-4 overflow-y-auto">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white">
          Participants ({remoteStreams.length + 1})
        </h3>
      </div>

      <div className="space-y-3">
        {/* Local user */}
        <ParticipantThumbnail
          stream={localStream}
          streamId="local"
          participantName={userName}
          isLocal={true}
        />

        {/* Remote participants */}
        {remoteStreams.map((remoteStream) => (
          <ParticipantThumbnail
            key={remoteStream.id}
            stream={remoteStream.stream}
            streamId={remoteStream.id}
            participantName={remoteStream.userName}
          />
        ))}
      </div>
    </div>
  );
};
