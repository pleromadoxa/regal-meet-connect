
import React, { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { User, Mic, MicOff, Crown, X, Mail, Phone, Shield } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';

interface Participant {
  id: string;
  user_id: string;
  user_name: string;
  is_host: boolean;
  is_muted: boolean;
  joined_at: string;
}

interface ParticipantsListProps {
  participants: Participant[];
  remoteStreams?: Array<{ id: string; stream: MediaStream; userName: string }>;
  localStream?: MediaStream | null;
  isCurrentUserHost: boolean;
  currentUserId: string;
  userName: string;
  onClose: () => void;
  onToggleMute?: (participantId: string, isMuted: boolean) => void;
  onSelectVideo?: (streamId: string) => void;
  selectedVideoId?: string;
}

export const ParticipantsList = ({
  participants: initialParticipants,
  remoteStreams = [],
  localStream,
  isCurrentUserHost,
  currentUserId,
  userName,
  onClose,
  onToggleMute,
  onSelectVideo,
  selectedVideoId
}: ParticipantsListProps) => {
  const [participants, setParticipants] = useState<Participant[]>(initialParticipants);
  const { toast } = useToast();
  const { user } = useAuth();

  // Update participants when props change
  useEffect(() => {
    setParticipants(initialParticipants);
  }, [initialParticipants]);

  // Real-time updates for participants
  useEffect(() => {
    if (participants.length === 0) return;

    const meetingId = participants[0]?.id ? participants[0].id.split('-')[0] : null;
    if (!meetingId) return;

    const channel = supabase
      .channel(`participants-realtime-${meetingId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'meeting_participants'
        },
        (payload) => {
          console.log('Participant update:', payload);
          
          if (payload.eventType === 'UPDATE') {
            setParticipants(prev => 
              prev.map(p => 
                p.id === payload.new.id 
                  ? { ...p, ...payload.new }
                  : p
              )
            );
          } else if (payload.eventType === 'INSERT') {
            setParticipants(prev => {
              const exists = prev.find(p => p.id === payload.new.id);
              if (!exists) {
                return [...prev, payload.new as Participant];
              }
              return prev;
            });
          } else if (payload.eventType === 'DELETE') {
            setParticipants(prev => 
              prev.filter(p => p.id !== payload.old.id)
            );
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [participants.length]);

  const handleMuteToggle = async (participant: Participant) => {
    if (!isCurrentUserHost || participant.user_id === currentUserId) return;

    try {
      const newMutedState = !participant.is_muted;
      
      // Update in database
      const { error } = await supabase
        .from('meeting_participants')
        .update({ is_muted: newMutedState })
        .eq('id', participant.id);

      if (error) {
        console.error('Error updating mute status:', error);
        toast({
          title: "Error",
          description: "Failed to update mute status",
          variant: "destructive"
        });
        return;
      }

      // Update local state immediately for better UX
      setParticipants(prev => 
        prev.map(p => 
          p.id === participant.id 
            ? { ...p, is_muted: newMutedState }
            : p
        )
      );

      // Send signaling to participant to mute/unmute
      const channel = supabase.channel(`meeting-mute-${participant.user_id}`);
      channel.send({
        type: 'broadcast',
        event: 'mute-toggle',
        payload: {
          participantId: participant.user_id,
          isMuted: newMutedState,
          fromHost: true
        }
      });

      // Call the callback if provided
      if (onToggleMute) {
        onToggleMute(participant.id, newMutedState);
      }

      toast({
        title: newMutedState ? "Participant Muted" : "Participant Unmuted",
        description: `${participant.user_name} has been ${newMutedState ? 'muted' : 'unmuted'}`
      });

    } catch (error) {
      console.error('Error in handleMuteToggle:', error);
      toast({
        title: "Error",
        description: "Failed to update participant mute status",
        variant: "destructive"
      });
    }
  };

  // Add current user to the list if not already present
  const allParticipants = React.useMemo(() => {
    const currentUserExists = participants.find(p => p.user_id === currentUserId);
    if (!currentUserExists) {
      return [
        {
          id: `current-${currentUserId}`,
          user_name: userName,
          user_id: currentUserId,
          is_host: isCurrentUserHost,
          is_muted: false,
          joined_at: new Date().toISOString()
        },
        ...participants
      ];
    }
    return participants;
  }, [participants, currentUserId, userName, isCurrentUserHost]);

  const ParticipantCard = ({ participant }: { participant: Participant }) => {
    const isCurrentUser = participant.user_id === currentUserId;
    const canViewEmail = isCurrentUserHost || isCurrentUser;
    const canMute = isCurrentUserHost && !isCurrentUser;

    // Get the actual user email if it's the current user, otherwise use a placeholder
    const displayEmail = isCurrentUser && user?.email 
      ? user.email 
      : `${participant.user_name.toLowerCase().replace(' ', '.')}@example.com`;

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
                    {displayEmail}
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
            {canMute && (
              <Button
                onClick={() => handleMuteToggle(participant)}
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
        {/* Header with close button */}
        <div className="flex items-center justify-between p-4 border-b border-slate-700/60">
          <div>
            <h2 className="text-lg font-semibold text-white">
              Participants ({allParticipants.length})
            </h2>
            {isCurrentUserHost && (
              <p className="text-xs text-slate-400 mt-1">
                <Shield className="h-3 w-3 inline mr-1" />
                As host, you can see contact details and mute participants
              </p>
            )}
          </div>
          <Button
            onClick={onClose}
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 hover:bg-slate-700/60 text-white"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Participants List */}
        <ScrollArea className="h-[calc(100vh-80px)]">
          <div className="p-4 space-y-3">
            {/* Host Bulk Controls */}
            {isCurrentUserHost && allParticipants.length > 1 && (
              <div className="mb-4 p-3 bg-slate-700/30 rounded-lg border border-slate-600/30">
                <p className="text-xs text-slate-400 mb-2">Host Controls</p>
                <div className="flex space-x-2">
                  <Button
                    onClick={() => {
                      allParticipants.forEach(p => {
                        if (p.user_id !== currentUserId && !p.is_muted) {
                          handleMuteToggle(p);
                        }
                      });
                    }}
                    variant="outline"
                    size="sm"
                    className="flex-1 bg-red-500/20 border-red-500/40 text-red-400 hover:bg-red-500/30"
                  >
                    <MicOff className="h-3 w-3 mr-1" />
                    Mute All
                  </Button>
                  <Button
                    onClick={() => {
                      allParticipants.forEach(p => {
                        if (p.user_id !== currentUserId && p.is_muted) {
                          handleMuteToggle(p);
                        }
                      });
                    }}
                    variant="outline"
                    size="sm"
                    className="flex-1 bg-green-500/20 border-green-500/40 text-green-400 hover:bg-green-500/30"
                  >
                    <Mic className="h-3 w-3 mr-1" />
                    Unmute All
                  </Button>
                </div>
              </div>
            )}

            {allParticipants.map((participant) => (
              <ParticipantCard
                key={participant.id}
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
