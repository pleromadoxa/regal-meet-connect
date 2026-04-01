import React, { useState, useEffect } from 'react';
import { X, Users, Shield, Mic, MicOff, User, Upload, Files, Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { FileSharing } from './FileSharing';

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
  meetingId: string;
  onClose: () => void;
  onToggleMute?: (participantId: string, isMuted: boolean) => void;
  onSelectVideo?: (streamId: string) => void;
  selectedVideoId?: string;
  waitingUsers?: Set<string>;
  onAdmitUser?: (userId: string) => void;
}

export const ParticipantsList = ({
  participants: initialParticipants,
  remoteStreams = [],
  localStream,
  isCurrentUserHost,
  currentUserId,
  userName,
  meetingId,
  onClose,
  onToggleMute,
  onSelectVideo,
  selectedVideoId,
  waitingUsers,
  onAdmitUser
}: ParticipantsListProps) => {
  const [participants, setParticipants] = useState<Participant[]>(initialParticipants);
  const { toast } = useToast();
  const { user } = useAuth();

  // Update participants when props change
  useEffect(() => {
    console.log('ParticipantsList: Props changed', {
      initialParticipants: initialParticipants.length,
      isCurrentUserHost,
      currentUserId,
      meetingId
    });
    setParticipants(initialParticipants);
  }, [initialParticipants, isCurrentUserHost, currentUserId, meetingId]);

  const handleMuteToggle = async (participant: Participant) => {
    if (!isCurrentUserHost) {
      toast({
        title: "Permission denied",
        description: "Only the host can mute/unmute participants",
        variant: "destructive"
      });
      return;
    }

    const newMutedState = !participant.is_muted;
    
    try {
      const { error } = await supabase
        .from('meeting_participants')
        .update({ is_muted: newMutedState })
        .eq('id', participant.id);

      if (error) throw error;

      // Update local state
      setParticipants(prev => 
        prev.map(p => 
          p.id === participant.id 
            ? { ...p, is_muted: newMutedState }
            : p
        )
      );

      // Call the callback if provided
      if (onToggleMute) {
        onToggleMute(participant.user_id, newMutedState);
      }

      toast({
        title: newMutedState ? "Participant muted" : "Participant unmuted",
        description: `${participant.user_name} has been ${newMutedState ? 'muted' : 'unmuted'}`
      });
    } catch (error: any) {
      console.error('Error toggling mute:', error);
      toast({
        title: "Error",
        description: `Failed to ${newMutedState ? 'mute' : 'unmute'} participant`,
        variant: "destructive"
      });
    }
  };

  const handleRemoveParticipant = async (participant: Participant) => {
    if (!isCurrentUserHost) {
      toast({
        title: "Permission denied", 
        description: "Only the host can remove participants",
        variant: "destructive"
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('meeting_participants')
        .delete()
        .eq('id', participant.id);

      if (error) throw error;

      setParticipants(prev => prev.filter(p => p.id !== participant.id));

      toast({
        title: "Participant removed",
        description: `${participant.user_name} has been removed from the meeting`
      });
    } catch (error: any) {
      console.error('Error removing participant:', error);
      toast({
        title: "Error",
        description: "Failed to remove participant",
        variant: "destructive"
      });
    }
  };

  // Include current user in participants list if not already there
  const currentUserParticipant: Participant = {
    id: `local-${currentUserId}`,
    user_id: currentUserId,
    user_name: userName,
    is_host: isCurrentUserHost,
    is_muted: false,
    joined_at: new Date().toISOString()
  };

  // Get all participants including current user, but avoid duplicates
  const allParticipants = React.useMemo(() => {
    const existingParticipant = participants.find(p => p.user_id === currentUserId);
    if (existingParticipant) {
      // Update existing participant with current host status
      return participants.map(p => 
        p.user_id === currentUserId 
          ? { ...p, is_host: isCurrentUserHost }
          : p
      );
    } else {
      // Add current user as participant
      return [currentUserParticipant, ...participants];
    }
  }, [participants, currentUserId, userName, isCurrentUserHost, currentUserParticipant]);

  const ParticipantCard = ({ participant }: { participant: Participant }) => {
    const isCurrentUser = participant.user_id === currentUserId;
    const canViewEmail = isCurrentUserHost || isCurrentUser;
    const canMute = isCurrentUserHost && !isCurrentUser;
    const actualIsHost = isCurrentUser ? isCurrentUserHost : participant.is_host;
    
    console.log('ParticipantCard Debug:', {
      participantName: participant.user_name,
      isCurrentUserHost,
      isCurrentUser,
      canMute,
      actualIsHost,
      currentUserId,
      participantUserId: participant.user_id,
      allParticipantsCount: allParticipants.length,
      urlParams: window.location.search
    });

    // Get the actual user email if it's the current user, otherwise use a placeholder
    const displayEmail = isCurrentUser && user?.email 
      ? user.email 
      : canViewEmail 
        ? `${participant.user_name.toLowerCase().replace(' ', '.')}@email.com`
        : 'Hidden';

    return (
      <div className="p-3 rounded-lg bg-slate-800/40 border border-slate-600/30 hover:bg-slate-800/60 transition-all duration-200">
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-3 min-w-0 flex-1">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold ${
              actualIsHost 
                ? 'bg-gradient-to-br from-orange-400 to-orange-600 text-white' 
                : 'bg-gradient-to-br from-blue-500 to-blue-700 text-white'
            }`}>
              {participant.user_name.charAt(0).toUpperCase()}
            </div>
            
            <div className="min-w-0 flex-1">
              <div className="flex items-center space-x-2">
                <h4 className="text-white font-medium text-sm truncate">
                  {participant.user_name}
                  {isCurrentUser && " (You)"}
                </h4>
                {actualIsHost && (
                  <Badge variant="secondary" className="bg-orange-500/20 text-orange-400 text-xs">
                    <Shield className="h-3 w-3 mr-1" />
                    Host
                  </Badge>
                )}
              </div>
              
              <p className="text-slate-400 text-xs truncate">
                {displayEmail}
              </p>
              
              <div className="flex items-center space-x-2 mt-1">
                <div className={`flex items-center space-x-1 text-xs ${
                  participant.is_muted ? 'text-red-400' : 'text-green-400'
                }`}>
                  {participant.is_muted ? (
                    <MicOff className="h-3 w-3" />
                  ) : (
                    <Mic className="h-3 w-3" />
                  )}
                  <span>{participant.is_muted ? 'Muted' : 'Unmuted'}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Control buttons for host */}
          {canMute && (
            <div className="flex items-center space-x-1">
              <Button
                onClick={() => handleMuteToggle(participant)}
                variant="ghost"
                size="sm"
                className={`h-8 w-8 p-0 ${
                  participant.is_muted 
                    ? 'text-green-400 hover:text-green-300 hover:bg-green-500/10' 
                    : 'text-red-400 hover:text-red-300 hover:bg-red-500/10'
                }`}
              >
                {participant.is_muted ? (
                  <Mic className="h-3 w-3" />
                ) : (
                  <MicOff className="h-3 w-3" />
                )}
              </Button>

              <Button
                onClick={() => handleRemoveParticipant(participant)}
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 text-red-400 hover:text-red-300 hover:bg-red-500/10"
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-slate-900/95 backdrop-blur-lg border border-slate-700/50 shadow-2xl w-full max-w-md h-full flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-700/60">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-500/20 rounded-lg">
              <Users className="h-4 w-4 text-blue-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">Meeting Hub</h2>
              <p className="text-sm text-slate-400">Participants & Files</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Button
              onClick={() => {
                const url = `${window.location.origin}/?join=${meetingId}`;
                navigator.clipboard.writeText(url);
                toast({
                  title: "Link Copied",
                  description: "Meeting invite link copied to clipboard"
                });
              }}
              variant="outline"
              size="sm"
              className="text-white border-slate-600 bg-slate-800 hover:bg-slate-700 h-8 px-3"
            >
              <Copy className="h-3 w-3 mr-2" />
              Invite
            </Button>
            <Button
              onClick={onClose}
              variant="ghost"
              size="sm"
              className="text-slate-400 hover:text-white hover:bg-slate-700/50 h-8 w-8 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="participants" className="flex-1 flex flex-col">
          <TabsList className="grid w-full grid-cols-2 mx-4 mt-4 bg-slate-800/50">
            <TabsTrigger value="participants" className="data-[state=active]:bg-slate-700">
              <Users className="h-4 w-4 mr-2" />
              Participants ({allParticipants.length})
            </TabsTrigger>
            <TabsTrigger value="files" className="data-[state=active]:bg-slate-700">
              <Files className="h-4 w-4 mr-2" />
              Files
            </TabsTrigger>
          </TabsList>

          {/* Participants Tab */}
          <TabsContent value="participants" className="flex-1 mt-0">
            <ScrollArea className="h-[calc(100vh-200px)]">
              <div className="p-4 space-y-3">
                {/* Host Instructions */}
                {isCurrentUserHost && (
                  <div className="mb-4 p-3 bg-slate-700/30 rounded-lg border border-slate-600/30">
                <p className="text-xs text-slate-400 mb-2 flex items-center">
                  <Shield className="h-3 w-3 mr-1" />
                  Host controls active - Manage participants below
                </p>
                  </div>
                )}
                {!isCurrentUserHost && (
                  <div className="mb-4 p-3 bg-slate-700/30 rounded-lg border border-slate-600/30">
                  <p className="text-xs text-slate-500 mb-2">
                    You are a participant in this meeting.
                  </p>
                  </div>
                )}

                {/* Waiting Room Section */}
                {isCurrentUserHost && waitingUsers && waitingUsers.size > 0 && (
                  <div className="mb-4 p-3 bg-orange-900/20 rounded-lg border border-orange-500/30">
                    <p className="text-xs text-orange-400 mb-2 font-semibold">Waiting Room ({waitingUsers.size})</p>
                    <div className="space-y-2">
                      {Array.from(waitingUsers).map(userId => (
                        <div key={userId} className="flex items-center justify-between bg-slate-800/60 p-2 rounded">
                          <span className="text-sm text-white truncate">Guest ({userId.slice(0, 4)}...)</span>
                          <Button
                            size="sm"
                            className="bg-green-600 hover:bg-green-700 text-xs h-7"
                            onClick={() => onAdmitUser && onAdmitUser(userId)}
                          >
                            Admit
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

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

                {allParticipants.length === 1 && allParticipants[0].user_id === currentUserId && (
                  <div className="text-center py-8">
                    <User className="h-12 w-12 text-slate-400 mx-auto mb-3" />
                    <p className="text-slate-400 mb-2">You're the only participant</p>
                    <p className="text-xs text-slate-500">Share the meeting ID to invite others</p>
                  </div>
                )}
                
                {allParticipants.length === 0 && (
                  <div className="text-center py-8">
                    <User className="h-12 w-12 text-slate-400 mx-auto mb-3" />
                    <p className="text-slate-400">No participants found</p>
                  </div>
                )}
              </div>
            </ScrollArea>
          </TabsContent>

          {/* Files Tab */}
          <TabsContent value="files" className="flex-1 mt-0 p-4">
            <FileSharing meetingId={meetingId} isHost={isCurrentUserHost} />
          </TabsContent>
        </Tabs>

        {/* Footer */}
        <div className="p-4 border-t border-slate-700/60 bg-slate-900/80">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>Meeting in progress</span>
            <span>{new Date().toLocaleTimeString()}</span>
          </div>
        </div>
      </div>
    </div>
  );
};