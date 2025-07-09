
import React from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { User, Mic, MicOff, Crown, X, Mail, Phone, Shield } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

interface ParticipantsListProps {
  participants: any[];
  isCurrentUserHost: boolean;
  currentUserId: string;
  userName: string;
  onClose: () => void;
  onToggleMute?: (participantId: string, isMuted: boolean) => void;
}

export const ParticipantsList = ({
  participants,
  isCurrentUserHost,
  currentUserId,
  userName,
  onClose,
  onToggleMute
}: ParticipantsListProps) => {
  // Add current user to the list if not already present
  const allParticipants = [
    {
      id: currentUserId,
      user_name: userName,
      user_id: currentUserId,
      is_host: isCurrentUserHost,
      is_muted: false,
      joined_at: new Date().toISOString(),
      email: 'current@user.com' // This would normally come from user profile
    },
    ...participants.filter(p => p.user_id !== currentUserId)
  ];

  const ParticipantCard = ({ participant }: { participant: any }) => {
    const isCurrentUser = participant.user_id === currentUserId;
    const canViewEmail = isCurrentUserHost || isCurrentUser;

    return (
      <Card className="p-4 bg-slate-800/60 border-slate-700/60 backdrop-blur-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            {/* Avatar */}
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
              <User className="h-5 w-5 text-white" />
            </div>

            {/* User Info */}
            <div className="flex-1">
              <div className="flex items-center space-x-2">
                <h4 className="font-semibold text-white">
                  {participant.user_name}
                  {isCurrentUser && " (You)"}
                </h4>
                
                {participant.is_host && (
                  <Badge variant="secondary" className="bg-yellow-500/20 text-yellow-400 border-yellow-400/40">
                    <Crown className="h-3 w-3 mr-1" />
                    Host
                  </Badge>
                )}
              </div>

              {/* Email - Only visible to host or current user */}
              {canViewEmail && (
                <div className="flex items-center space-x-1 mt-1">
                  <Mail className="h-3 w-3 text-slate-400" />
                  <span className="text-xs text-slate-400">
                    {participant.email || `${participant.user_name.toLowerCase().replace(' ', '.')}@example.com`}
                  </span>
                </div>
              )}

              {/* Privacy indicator for non-hosts */}
              {!canViewEmail && (
                <div className="flex items-center space-x-1 mt-1">
                  <Shield className="h-3 w-3 text-slate-500" />
                  <span className="text-xs text-slate-500">Contact info hidden</span>
                </div>
              )}

              <p className="text-xs text-slate-500 mt-1">
                Joined {new Date(participant.joined_at).toLocaleTimeString()}
              </p>
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center space-x-2">
            {/* Mute Status */}
            <div className={`p-2 rounded-full ${
              participant.is_muted 
                ? 'bg-red-500/20 text-red-400' 
                : 'bg-green-500/20 text-green-400'
            }`}>
              {participant.is_muted ? (
                <MicOff className="h-4 w-4" />
              ) : (
                <Mic className="h-4 w-4" />
              )}
            </div>

            {/* Host Controls */}
            {isCurrentUserHost && !isCurrentUser && onToggleMute && (
              <Button
                onClick={() => onToggleMute(participant.id, !participant.is_muted)}
                variant="outline"
                size="sm"
                className="h-8 w-16 text-xs bg-slate-700/60 border-slate-600/60 hover:bg-slate-600/60"
              >
                {participant.is_muted ? 'Unmute' : 'Mute'}
              </Button>
            )}

            {/* Contact Actions for Host */}
            {isCurrentUserHost && !isCurrentUser && (
              <div className="flex space-x-1">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 hover:bg-blue-500/20"
                  title="Send Message"
                >
                  <Mail className="h-3 w-3" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 hover:bg-green-500/20"
                  title="Call"
                >
                  <Phone className="h-3 w-3" />
                </Button>
              </div>
            )}
          </div>
        </div>
      </Card>
    );
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm">
      <div className="fixed right-0 top-0 h-full w-96 bg-slate-900/95 backdrop-blur-xl border-l border-slate-700/60 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-700/60">
          <div>
            <h2 className="text-lg font-semibold text-white">
              Participants ({allParticipants.length})
            </h2>
            {isCurrentUserHost && (
              <p className="text-xs text-slate-400 mt-1">
                <Shield className="h-3 w-3 inline mr-1" />
                As host, you can see contact details
              </p>
            )}
          </div>
          <Button
            onClick={onClose}
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 hover:bg-slate-700/60"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Participants List */}
        <ScrollArea className="h-[calc(100vh-80px)]">
          <div className="p-4 space-y-3">
            {allParticipants.map((participant) => (
              <ParticipantCard
                key={participant.id || participant.user_id}
                participant={participant}
              />
            ))}

            {allParticipants.length === 0 && (
              <div className="text-center py-8">
                <User className="h-12 w-12 text-slate-400 mx-auto mb-3" />
                <p className="text-slate-400">No participants found</p>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Footer */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-slate-700/60 bg-slate-900/80">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>Meeting in progress</span>
            <span>{new Date().toLocaleTimeString()}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
