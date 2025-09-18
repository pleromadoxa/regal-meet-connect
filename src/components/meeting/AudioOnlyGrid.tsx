import React from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { User, Crown, Mic, MicOff, Volume2, VolumeX, MapPin } from 'lucide-react';
import { AudioVisualizer } from '@/components/AudioVisualizer';
import { useAudioVisualizer } from '@/hooks/useAudioVisualizer';

interface RemoteStream {
  id: string;
  stream: MediaStream;
  userName: string;
}

interface AudioOnlyGridProps {
  localStream: MediaStream | null;
  remoteStreams: RemoteStream[];
  userName: string;
  isCurrentUserHost: boolean;
  participants: any[];
  currentUserId: string;
  onToggleMute?: (participantId: string, isMuted: boolean) => void;
  speakingParticipants?: Set<string>;
}

export const AudioOnlyGrid = ({
  localStream,
  remoteStreams,
  userName,
  isCurrentUserHost,
  participants,
  currentUserId,
  onToggleMute,
  speakingParticipants = new Set()
}: AudioOnlyGridProps) => {
  // Helper function to get participant info
  const getParticipantInfo = (participantName: string) => {
    const participant = participants.find(p => p.user_name === participantName || p.userName === participantName);
    return {
      isHost: participant?.is_host || participant?.isHost || false,
      isMuted: participant?.is_muted || participant?.isMuted || false,
      id: participant?.id || participant?.user_id || participant?.userId,
      country: participant?.country,
      city: participant?.city
    };
  };

  const handleMuteToggle = (participantName: string, streamId: string) => {
    const participantInfo = getParticipantInfo(participantName);
    if (participantInfo.id && onToggleMute) {
      onToggleMute(participantInfo.id, !participantInfo.isMuted);
    }
  };

  const AudioParticipantCard = ({ 
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
    const participantInfo = isLocal 
      ? { isHost: isCurrentUserHost, isMuted: false, country: undefined, city: undefined }
      : getParticipantInfo(participantName);
    
    const hasAudio = stream && stream.getAudioTracks().length > 0 && stream.getAudioTracks()[0].enabled;
    const isHost = participantInfo.isHost;
    const isMuted = participantInfo.isMuted;
    const isSpeaking = speakingParticipants.has(streamId) || speakingParticipants.has(participantName);
    
    // Audio visualization for this participant's stream
    const audioData = useAudioVisualizer(stream, hasAudio && !isMuted);

    return (
      <Card className={`relative p-6 transition-all duration-300 ${
        isSpeaking || audioData.isActive
          ? 'ring-2 ring-green-400 bg-green-500/10 border-green-400/40' 
          : 'bg-slate-800/60 border-slate-700/60 hover:bg-slate-700/60'
      } backdrop-blur-sm`}>
        <div className="flex flex-col items-center space-y-4">
          {/* Avatar with audio activity indicator */}
          <div className={`relative w-16 h-16 rounded-full flex items-center justify-center transition-all duration-300 ${
            isSpeaking || audioData.isActive
              ? 'bg-green-500/20 ring-4 ring-green-400/50 animate-pulse'
              : 'bg-slate-700'
          }`}>
            <User className={`h-8 w-8 ${
              isSpeaking || audioData.isActive ? 'text-green-300' : 'text-slate-300'
            }`} />
            
            {/* Host crown */}
            {isHost && (
              <div className="absolute -top-2 -right-2 p-1 bg-yellow-500 rounded-full">
                <Crown className="h-3 w-3 text-white" />
              </div>
            )}
          </div>

          {/* Participant name with speaking indicator */}
          <div className="text-center">
            <h3 className={`font-medium transition-colors duration-300 ${
              isSpeaking || audioData.isActive ? 'text-green-300' : 'text-white'
            }`}>
              {participantName}
              {isLocal && " (You)"}
            </h3>
            
            {/* Location info */}
            {(participantInfo.country || participantInfo.city) && !isLocal && (
              <div className="flex items-center justify-center space-x-1 mt-1">
                <MapPin className="h-3 w-3 text-slate-400" />
                <span className="text-xs text-slate-400">
                  {participantInfo.city && participantInfo.country 
                    ? `${participantInfo.city}, ${participantInfo.country}`
                    : participantInfo.country || participantInfo.city}
                </span>
              </div>
            )}
          </div>

          {/* Audio controls and indicators */}
          <div className="flex items-center space-x-3">
            {/* Audio level indicator */}
            <div className="flex items-center space-x-2">
              <div className={`p-2 rounded-full ${
                hasAudio && !isMuted ? 'bg-green-500/20' : 'bg-red-500/20'
              }`}>
                <AudioVisualizer
                  volume={audioData.volume}
                  isActive={audioData.isActive}
                  avgVolume={audioData.avgVolume}
                  hasAudio={hasAudio && !isMuted}
                  size="md"
                />
              </div>
              
              {/* Volume percentage */}
              {audioData.isActive && hasAudio && (
                <span className="text-xs text-green-400 font-mono min-w-[3ch]">
                  {audioData.avgVolume}%
                </span>
              )}
            </div>

            {/* Mute/Unmute control for host */}
            {isCurrentUserHost && !isLocal && onToggleMute && (
              <Button
                onClick={() => handleMuteToggle(participantName, streamId)}
                variant="ghost"
                size="sm"
                className={`h-8 w-8 p-0 ${
                  isMuted 
                    ? 'bg-red-500/80 hover:bg-red-500/60 text-white' 
                    : 'bg-green-500/80 hover:bg-green-500/60 text-white'
                } backdrop-blur-sm rounded-full`}
                title={isMuted ? 'Unmute participant' : 'Mute participant'}
              >
                {isMuted ? (
                  <VolumeX className="h-4 w-4" />
                ) : (
                  <Volume2 className="h-4 w-4" />
                )}
              </Button>
            )}

            {/* Mute status indicator */}
            <div className={`p-1 rounded-full ${
              hasAudio && !isMuted ? 'bg-green-500/80' : 'bg-red-500/80'
            }`}>
              {hasAudio && !isMuted ? (
                <Mic className="h-3 w-3 text-white" />
              ) : (
                <MicOff className="h-3 w-3 text-white" />
              )}
            </div>
          </div>
        </div>
      </Card>
    );
  };

  const allParticipants = [
    // Local participant first
    {
      stream: localStream,
      streamId: currentUserId,
      participantName: userName,
      isLocal: true
    },
    // Remote participants
    ...remoteStreams.map(remote => ({
      stream: remote.stream,
      streamId: remote.id,
      participantName: remote.userName,
      isLocal: false
    }))
  ];

  return (
    <div className="flex-1 p-6 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Audio meeting header */}
      <div className="text-center mb-8">
        <div className="flex items-center justify-center space-x-2 mb-2">
          <Mic className="h-6 w-6 text-green-400" />
          <h2 className="text-2xl font-bold text-white">Audio Meeting</h2>
        </div>
        <p className="text-slate-400">
          {allParticipants.length} participant{allParticipants.length !== 1 ? 's' : ''} connected
        </p>
      </div>

      {/* Participants grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 max-w-7xl mx-auto">
        {allParticipants.map((participant) => (
          <AudioParticipantCard
            key={participant.streamId}
            stream={participant.stream}
            streamId={participant.streamId}
            participantName={participant.participantName}
            isLocal={participant.isLocal}
          />
        ))}
      </div>

      {/* Audio controls legend */}
      <div className="mt-8 max-w-2xl mx-auto">
        <Card className="p-4 bg-slate-800/60 border-slate-700/60">
          <h4 className="text-sm font-medium text-slate-300 mb-3 text-center">Audio Indicators</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs text-slate-400">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
              <span>Speaking</span>
            </div>
            <div className="flex items-center space-x-2">
              <Mic className="h-3 w-3 text-green-400" />
              <span>Unmuted</span>
            </div>
            <div className="flex items-center space-x-2">
              <MicOff className="h-3 w-3 text-red-400" />
              <span>Muted</span>
            </div>
            {isCurrentUserHost && (
              <div className="flex items-center space-x-2">
                <Volume2 className="h-3 w-3 text-blue-400" />
                <span>Host Controls</span>
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
};