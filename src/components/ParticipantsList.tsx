import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { User, Mic, MicOff, Crown, Volume2, UserMinus, VolumeX } from 'lucide-react';
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
  /** Fired with the participant's user id (not the roster row id). */
  onToggleMute: (userId: string, isMuted: boolean) => void;
  /** Host-only: remove someone from the meeting entirely. */
  onRemoveParticipant?: (userId: string) => void;
  onSelectVideo: (streamId: string) => void;
  selectedVideoId?: string;
}

const ParticipantItem = ({
  participant,
  stream,
  isCurrentUser,
  canModerate,
  onToggleMute,
  onRemoveParticipant,
  onSelectVideo,
  isSelected,
}: {
  participant: Participant;
  stream: MediaStream | null;
  isCurrentUser: boolean;
  canModerate: boolean;
  onToggleMute: (userId: string, isMuted: boolean) => void;
  onRemoveParticipant?: (userId: string) => void;
  onSelectVideo: (streamId: string) => void;
  isSelected: boolean;
}) => {
  const { volume, isActive } = useAudioVisualizer(stream);

  return (
    <div
      className={`flex items-center justify-between gap-2 p-3 rounded-lg border transition-all duration-200 cursor-pointer ${
        isSelected
          ? 'bg-orange-500/20 border-orange-400/60'
          : 'bg-white/5 border-white/10 hover:bg-white/10'
      }`}
      onClick={() => onSelectVideo(participant.user_id)}
    >
      <div className="flex items-center space-x-3 min-w-0 flex-1">
        <div className="relative shrink-0">
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
              {isCurrentUser && ' (You)'}
            </p>
            {participant.is_host && (
              <Badge variant="secondary" className="bg-yellow-500/20 text-yellow-300 text-xs">
                Host
              </Badge>
            )}
            {participant.is_muted && (
              <Badge variant="secondary" className="bg-red-500/20 text-red-300 text-xs">
                Muted
              </Badge>
            )}
          </div>

          <div className="flex items-center space-x-2 mt-1">
            <div className="flex items-center space-x-1">
              <Volume2 className={`h-3 w-3 ${isActive ? 'text-green-400' : 'text-gray-500'}`} />
              <div className="w-12 h-1 bg-gray-600 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-100 ${
                    isActive ? 'bg-green-400' : 'bg-gray-500'
                  }`}
                  style={{ width: `${volume}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center space-x-1.5 shrink-0">
        {participant.is_muted && !canModerate && (
          <MicOff className="h-4 w-4 text-red-400" />
        )}

        {canModerate && !isCurrentUser && (
          <>
            <Button
              onClick={(e) => {
                e.stopPropagation();
                onToggleMute(participant.user_id, !participant.is_muted);
              }}
              size="sm"
              variant="outline"
              title={participant.is_muted ? 'Allow to speak' : 'Mute'}
              className={`border-white/20 ${
                participant.is_muted
                  ? 'bg-red-500/20 text-red-300 hover:bg-red-500/30'
                  : 'bg-white/10 text-white hover:bg-white/20'
              }`}
            >
              {participant.is_muted ? (
                <VolumeX className="h-3.5 w-3.5" />
              ) : (
                <Mic className="h-3.5 w-3.5" />
              )}
            </Button>

            {onRemoveParticipant && (
              <Button
                onClick={(e) => {
                  e.stopPropagation();
                  onRemoveParticipant(participant.user_id);
                }}
                size="sm"
                variant="outline"
                title="Remove from meeting"
                className="border-white/20 bg-white/10 text-red-300 hover:bg-red-500/25"
              >
                <UserMinus className="h-3.5 w-3.5" />
              </Button>
            )}
          </>
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
  onRemoveParticipant,
  onSelectVideo,
  selectedVideoId,
}: ParticipantsListProps) => {
  const [pendingRemoval, setPendingRemoval] = useState<Participant | null>(null);

  const confirmRemove = () => {
    if (pendingRemoval && onRemoveParticipant) {
      onRemoveParticipant(pendingRemoval.user_id);
    }
    setPendingRemoval(null);
  };

  return (
    <Card className="bg-black/40 backdrop-blur-xl border-white/20">
      <CardHeader className="pb-3 flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-white text-lg flex items-center space-x-2">
          <User className="h-5 w-5" />
          <span>In this meeting ({participants.length})</span>
        </CardTitle>
        {isHost && participants.length > 1 && (
          <Button
            size="sm"
            variant="outline"
            className="border-white/20 bg-white/10 text-white hover:bg-white/20"
            onClick={() => {
              participants
                .filter((p) => p.user_id !== currentUserId && !p.is_muted)
                .forEach((p) => onToggleMute(p.user_id, true));
            }}
          >
            <MicOff className="mr-1.5 h-3.5 w-3.5" />
            Mute all
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-2">
        {participants.length === 0 && (
          <p className="text-sm text-white/50 text-center py-6">
            Connecting to the participant list…
          </p>
        )}

        {participants.length === 1 && participants[0].user_id === currentUserId && (
          <p className="text-sm text-white/50 text-center py-6">
            You&apos;re the only one here — share the meeting code to invite people.
          </p>
        )}

        {participants.map((participant) => {
          const isCurrentUser = participant.user_id === currentUserId;
          const stream = isCurrentUser
            ? localStream
            : remoteStreams.find((s) => s.id === participant.user_id)?.stream || null;

          return (
            <ParticipantItem
              key={participant.id}
              participant={participant}
              stream={stream}
              isCurrentUser={isCurrentUser}
              canModerate={isHost}
              onToggleMute={onToggleMute}
              onRemoveParticipant={
                onRemoveParticipant
                  ? (userId) => {
                      const target = participants.find((p) => p.user_id === userId);
                      if (target) setPendingRemoval(target);
                    }
                  : undefined
              }
              onSelectVideo={onSelectVideo}
              isSelected={selectedVideoId === participant.user_id}
            />
          );
        })}
      </CardContent>

      <AlertDialog
        open={pendingRemoval !== null}
        onOpenChange={(open) => {
          if (!open) setPendingRemoval(null);
        }}
      >
        <AlertDialogContent className="border-white/15 bg-[#0b0b0f] text-white">
          <AlertDialogHeader>
            <AlertDialogTitle>Remove {pendingRemoval?.user_name}?</AlertDialogTitle>
            <AlertDialogDescription className="text-white/70">
              They will be dropped from the meeting immediately and sent back to
              the lobby. They can only rejoin if you admit them again.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-white/20 bg-transparent text-white hover:bg-white/10 hover:text-white">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmRemove}
              className="bg-red-500 text-white hover:bg-red-600"
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
};
