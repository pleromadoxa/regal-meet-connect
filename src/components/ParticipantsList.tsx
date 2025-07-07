
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { User, Mic, MicOff, Crown, Volume2 } from 'lucide-react';
import { useAudioVisualizer } from '@/hooks/useAudioVisualizer';

interface Participant {
  id: string;
  user_id: string;
  user_name: string;
  is_host: boolean;
  is_muted: boolean;
  joined_at: string;
}

interface RemoteStream {
  id: string;
  stream: MediaStream;
  userName: string;
}

interface ParticipantsListProps {
  participants: Participant[];
  remoteStreams: RemoteStream[];
  localStream: MediaStream | null;
  currentUserId: string;
  isHost: boolean;
  onToggleMute: (participantId: string, isMuted: boolean) => void;
  onSelectVideo: (streamId: string) => void;
  selectedVideoId?: string;
}

const ParticipantItem = ({ 
  participant, 
  stream, 
  isCurrentUser, 
  isHost, 
  onToggleMute, 
  onSelectVideo,
  isSelected 
}: {
  participant: Participant;
  stream: MediaStream | null;
  isCurrentUser: boolean;
  isHost: boolean;
  onToggleMute: (participantId: string, isMuted: boolean) => void;
  onSelectVideo: (streamId: string) => void;
  isSelected: boolean;
}) => {
  const { audioLevel, isActive } = useAudioVisualizer(stream);

  return (
    <div 
      className={`flex items-center justify-between p-3 rounded-lg border transition-all duration-200 cursor-pointer ${
        isSelected 
          ? 'bg-orange-500/20 border-orange-400/60' 
          : 'bg-white/5 border-white/10 hover:bg-white/10'
      }`}
      onClick={() => onSelectVideo(participant.user_id)}
    >
      <div className="flex items-center space-x-3">
        <div className="relative">
          <div className="p-2 bg-slate-600/80 rounded-full">
            <User className="h-4 w-4 text-white" />
          </div>
          {participant.is_host && (
            <Crown className="absolute -top-1 -right-1 h-4 w-4 text-yellow-400" />
          )}
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center space-x-2">
            <p className="text-white font-medium truncate">
              {participant.user_name}
              {isCurrentUser && " (You)"}
            </p>
            {participant.is_host && (
              <Badge variant="secondary" className="bg-yellow-500/20 text-yellow-300 text-xs">
                Host
              </Badge>
            )}
          </div>
          
          <div className="flex items-center space-x-2 mt-1">
            {/* Audio Visualizer */}
            <div className="flex items-center space-x-1">
              <Volume2 className={`h-3 w-3 ${isActive ? 'text-green-400' : 'text-gray-500'}`} />
              <div className="w-12 h-1 bg-gray-600 rounded-full overflow-hidden">
                <div 
                  className={`h-full transition-all duration-100 ${
                    isActive ? 'bg-green-400' : 'bg-gray-500'
                  }`}
                  style={{ width: `${audioLevel}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center space-x-2">
        {isHost && !isCurrentUser && (
          <Button
            onClick={(e) => {
              e.stopPropagation();
              onToggleMute(participant.id, !participant.is_muted);
            }}
            size="sm"
            variant="outline"
            className={`border-white/20 ${
              participant.is_muted 
                ? 'bg-red-500/20 text-red-300 hover:bg-red-500/30' 
                : 'bg-white/10 text-white hover:bg-white/20'
            }`}
          >
            {participant.is_muted ? (
              <MicOff className="h-3 w-3" />
            ) : (
              <Mic className="h-3 w-3" />
            )}
          </Button>
        )}
        
        {participant.is_muted && (
          <MicOff className="h-4 w-4 text-red-400" />
        )}
      </div>
    </div>
  );
};

export const ParticipantsList = ({
  participants,
  remoteStreams,
  localStream,
  currentUserId,
  isHost,
  onToggleMute,
  onSelectVideo,
  selectedVideoId
}: ParticipantsListProps) => {
  return (
    <Card className="bg-black/40 backdrop-blur-xl border-white/20">
      <CardHeader className="pb-3">
        <CardTitle className="text-white text-lg flex items-center space-x-2">
          <User className="h-5 w-5" />
          <span>Participants ({participants.length})</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {participants.map((participant) => {
          const isCurrentUser = participant.user_id === currentUserId;
          const stream = isCurrentUser 
            ? localStream 
            : remoteStreams.find(s => s.id === participant.user_id)?.stream || null;
          
          return (
            <ParticipantItem
              key={participant.id}
              participant={participant}
              stream={stream}
              isCurrentUser={isCurrentUser}
              isHost={isHost}
              onToggleMute={onToggleMute}
              onSelectVideo={onSelectVideo}
              isSelected={selectedVideoId === participant.user_id}
            />
          );
        })}
      </CardContent>
    </Card>
  );
};
