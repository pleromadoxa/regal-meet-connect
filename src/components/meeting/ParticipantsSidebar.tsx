
import React from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { User, Mic, MicOff, Crown, Volume2, VolumeX } from 'lucide-react';
import { AudioVisualizer } from '@/components/AudioVisualizer';
import { useAudioVisualizer } from '@/hooks/useAudioVisualizer';

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
  onToggleMute?: (participantId: string, isMuted: boolean) => void;
}

export const ParticipantsSidebar = ({
  localStream,
  remoteStreams,
  userName,
  selectedVideoId,
  onVideoSelect,
  isCurrentUserHost,
  participants,
  currentUserId,
  onToggleMute
}: ParticipantsSidebarProps) => {
  // Check if participant is host
  const isParticipantHost = (participantName: string) => {
    const participant = participants.find(p => p.user_name === participantName);
    return participant?.is_host || false;
  };

  // Check if participant is muted
  const isParticipantMuted = (participantName: string) => {
    const participant = participants.find(p => p.user_name === participantName);
    return participant?.is_muted || false;
  };

  // Get participant ID for mute controls
  const getParticipantId = (participantName: string) => {
    const participant = participants.find(p => p.user_name === participantName);
    return participant?.id || participant?.user_id;
  };

  // Handle mute toggle
  const handleMuteToggle = (participantName: string, streamId: string) => {
    if (!isCurrentUserHost || !onToggleMute) return;
    
    const participantId = getParticipantId(participantName);
    const isMuted = isParticipantMuted(participantName);
    
    if (participantId) {
      onToggleMute(participantId, !isMuted);
    }
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
    const isMuted = isLocal ? false : isParticipantMuted(participantName);
    
    // Audio visualization for this participant's stream
    const audioData = useAudioVisualizer(stream, hasAudio && !isMuted);

    return (
      <Card 
        className={`relative overflow-hidden cursor-pointer transition-all duration-300 ${
          isSelected 
            ? 'ring-2 ring-orange-400 bg-orange-500/10 border-orange-400/40' 
            : 'bg-slate-800/60 border-slate-700/60 hover:bg-slate-700/60'
        } backdrop-blur-sm`}
        onClick={() => onVideoSelect(streamId)}
      >
        <div className="aspect-video relative min-h-[120px]">
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
          <div className="absolute top-2 right-2 flex flex-col space-y-1">
            {/* Host indicator */}
            {isHost && (
              <div className="p-1 bg-yellow-500/80 backdrop-blur-sm rounded-full">
                <Crown className="h-3 w-3 text-white" />
              </div>
            )}
            
            {/* Audio status and mute control */}
            <div className="flex items-center space-x-1">
              {/* Audio visualizer or mute indicator */}
              <div className="p-1 bg-black/50 backdrop-blur-sm rounded-full">
                <AudioVisualizer
                  volume={audioData.volume}
                  isActive={audioData.isActive}
                  avgVolume={audioData.avgVolume}
                  hasAudio={hasAudio && !isMuted}
                  size="sm"
                />
              </div>
              
              {/* Host mute control */}
              {isCurrentUserHost && !isLocal && onToggleMute && (
                <Button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleMuteToggle(participantName, streamId);
                  }}
                  variant="ghost"
                  size="sm"
                  className={`h-6 w-6 p-0 ${
                    isMuted 
                      ? 'bg-red-500/80 hover:bg-red-500/60 text-white' 
                      : 'bg-green-500/80 hover:bg-green-500/60 text-white'
                  } backdrop-blur-sm rounded-full`}
                  title={isMuted ? 'Unmute participant' : 'Mute participant'}
                >
                  {isMuted ? (
                    <VolumeX className="h-3 w-3" />
                  ) : (
                    <Volume2 className="h-3 w-3" />
                  )}
                </Button>
              )}
            </div>
          </div>

          {/* Name overlay with audio activity */}
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-2">
            <div className="flex items-center justify-between">
              <p className={`text-white text-sm font-medium truncate ${
                audioData.isActive ? 'text-green-300' : ''
              }`}>
                {participantName}
                {isLocal && " (You)"}
              </p>
              
              {/* Real-time audio level indicator */}
              {audioData.isActive && hasAudio && (
                <div className="flex items-center space-x-1 ml-2">
                  <div className="w-1 h-1 bg-green-400 rounded-full animate-pulse"></div>
                  <span className="text-xs text-green-400 font-mono">
                    {audioData.avgVolume}%
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Selection indicator */}
          {isSelected && (
            <div className="absolute top-2 left-2">
              <div className="w-2 h-2 bg-orange-400 rounded-full animate-pulse"></div>
            </div>
          )}

          {/* Speaking indicator border */}
          {audioData.isActive && hasAudio && (
            <div className="absolute inset-0 border-2 border-green-400/50 rounded-lg pointer-events-none animate-pulse"></div>
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
        {isCurrentUserHost && (
          <Badge variant="outline" className="text-xs bg-yellow-500/20 border-yellow-500/40 text-yellow-400">
            <Crown className="h-3 w-3 mr-1" />
            Host Controls
          </Badge>
        )}
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
      
      {/* Audio legend */}
      <div className="mt-4 p-3 bg-slate-800/30 rounded-lg border border-slate-700/30">
        <h4 className="text-sm font-medium text-slate-300 mb-2">Audio Activity</h4>
        <div className="space-y-1 text-xs text-slate-400">
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
            <span>Speaking</span>
          </div>
          <div className="flex items-center space-x-2">
            <Mic className="h-3 w-3 text-green-400" />
            <span>Microphone on</span>
          </div>
          <div className="flex items-center space-x-2">
            <MicOff className="h-3 w-3 text-red-400" />
            <span>Muted</span>
          </div>
          {isCurrentUserHost && (
            <div className="flex items-center space-x-2 mt-2 pt-2 border-t border-slate-700/30">
              <Volume2 className="h-3 w-3 text-blue-400" />
              <span>Click to mute/unmute participants</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
