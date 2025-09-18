import React, { useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { User, Mic, MicOff, Crown, MapPin } from 'lucide-react';
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

interface AudioOnlyGridProps {
  localStream: MediaStream | null;
  remoteStreams: RemoteStream[];
  userName: string;
  participants: Participant[];
  currentUserId: string;
  isCurrentUserHost: boolean;
  onToggleMute?: (participantId: string, isMuted: boolean) => void;
  speakingParticipants?: Set<string>;
}

export const AudioOnlyGrid = ({
  localStream,
  remoteStreams,
  userName,
  participants,
  currentUserId,
  isCurrentUserHost,
  onToggleMute,
  speakingParticipants
}: AudioOnlyGridProps) => {
  // Get participant info
  const getParticipantInfo = (streamUserName: string, isLocal = false) => {
    if (isLocal) {
      return {
        name: userName,
        isHost: isCurrentUserHost,
        isMuted: !localStream?.getAudioTracks()?.[0]?.enabled,
        country: undefined,
        city: undefined
      };
    }
    
    const participant = participants.find(p => p.user_name === streamUserName);
    return {
      name: participant?.user_name || streamUserName,
      isHost: participant?.is_host || false,
      isMuted: participant?.is_muted || false,
      country: participant?.country,
      city: participant?.city
    };
  };

  // Combine all streams for uniform handling
  const allStreams = useMemo(() => [
    { 
      id: 'local', 
      stream: localStream, 
      userName: userName,
      isLocal: true
    },
    ...remoteStreams.map(stream => ({ ...stream, isLocal: false }))
  ], [localStream, remoteStreams, userName]);

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
    const participantInfo = getParticipantInfo(participantName, isLocal);
    const hasAudio = stream?.getAudioTracks()?.[0]?.enabled || false;
    
    return (
      <Card className="relative overflow-hidden bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-600/60 hover:border-slate-500/60 transition-all duration-300 aspect-square flex flex-col items-center justify-center p-6">
        {/* Profile Circle */}
        <div className={`w-20 h-20 rounded-full flex items-center justify-center mb-4 transition-all duration-300 ${
          participantInfo.isHost 
            ? 'bg-gradient-to-br from-orange-400 to-orange-600' 
            : 'bg-gradient-to-br from-blue-500 to-blue-700'
        }`}>
          <span className="text-white font-bold text-2xl">
            {participantInfo.name.charAt(0).toUpperCase()}
          </span>
        </div>

        {/* Name */}
        <h3 className="text-white font-semibold text-lg mb-2 text-center truncate max-w-full">
          {participantInfo.name}
          {isLocal && " (You)"}
        </h3>

        {/* Status indicators */}
        <div className="flex items-center space-x-3 mb-4">
          {/* Audio indicator */}
          <div className={`flex items-center space-x-1 px-2 py-1 rounded-full ${
            hasAudio ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
          }`}>
            {hasAudio ? (
              <Mic className="h-3 w-3" />
            ) : (
              <MicOff className="h-3 w-3" />
            )}
            <span className="text-xs font-medium">
              {hasAudio ? 'Unmuted' : 'Muted'}
            </span>
          </div>

          {/* Host indicator */}
          {participantInfo.isHost && (
            <div className="flex items-center space-x-1 px-2 py-1 rounded-full bg-yellow-500/20 text-yellow-400">
              <Crown className="h-3 w-3" />
              <span className="text-xs font-medium">Host</span>
            </div>
          )}
        </div>

        {/* Location */}
        {(participantInfo.country || participantInfo.city) && !isLocal && (
          <div className="flex items-center space-x-1 text-slate-400 text-sm mb-2">
            <MapPin className="h-3 w-3" />
            <span>
              {participantInfo.city && participantInfo.country 
                ? `${participantInfo.city}, ${participantInfo.country}`
                : participantInfo.country || participantInfo.city}
            </span>
          </div>
        )}

        {/* Audio Visualizer */}
        {stream && (
          <div className="absolute bottom-4 right-4">
            <AudioIndicator stream={stream} className="opacity-90" />
          </div>
        )}

        {/* Speaking indicator */}
        {hasAudio && (
          <div className="absolute top-4 right-4">
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
          </div>
        )}
      </Card>
    );
  };

  // Calculate grid layout
  const totalParticipants = allStreams.length;
  const getGridCols = (count: number) => {
    if (count <= 1) return 1;
    if (count <= 4) return 2;
    if (count <= 9) return 3;
    if (count <= 16) return 4;
    return 5;
  };

  const gridCols = getGridCols(totalParticipants);

  return (
    <div className="h-full w-full p-4 pb-24">
      <div className="text-center mb-6">
        <h2 className="text-white text-2xl font-bold mb-2">Audio-Only Meeting</h2>
        <p className="text-slate-400">
          {totalParticipants} participant{totalParticipants !== 1 ? 's' : ''} in the meeting
        </p>
      </div>

      <div 
        className="grid gap-4 justify-items-center"
        style={{
          gridTemplateColumns: `repeat(${gridCols}, minmax(200px, 1fr))`,
          maxWidth: '1200px',
          margin: '0 auto'
        }}
      >
        {allStreams.map((streamData) => (
          <AudioParticipantCard
            key={streamData.id}
            stream={streamData.stream}
            streamId={streamData.id}
            participantName={streamData.userName}
            isLocal={streamData.isLocal}
          />
        ))}
      </div>

      {/* Audio-only meeting tips */}
      <div className="mt-8 text-center">
        <div className="bg-slate-800/50 backdrop-blur-sm rounded-lg p-4 max-w-md mx-auto">
          <h3 className="text-white font-medium mb-2">Audio-Only Mode</h3>
          <p className="text-slate-400 text-sm">
            Turn on your camera to switch to video mode, or enjoy the focused audio experience.
          </p>
        </div>
      </div>
    </div>
  );
};