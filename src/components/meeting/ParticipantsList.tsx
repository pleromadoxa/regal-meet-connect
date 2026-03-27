import React, { useState, useEffect } from 'react';
import { X, Users, Shield, Mic, MicOff, User, Upload, Files, Hand, MoreVertical, Trash2, VideoOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { FileSharing } from './FileSharing';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';

interface Participant {
  id: string;
  user_id: string;
  user_name: string;
  is_host: boolean;
  is_muted: boolean;
  joined_at: string;
  is_video_enabled?: boolean;
  hand_raised?: boolean;
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
  selectedVideoId
}: ParticipantsListProps) => {
  const [participants, setParticipants] = useState<Participant[]>(initialParticipants);
  const { toast } = useToast();
  const { user } = useAuth();

  useEffect(() => {
    setParticipants(initialParticipants);
  }, [initialParticipants]);

  const handleMuteToggle = async (participant: Participant) => {
    if (!isCurrentUserHost && participant.user_id !== currentUserId) {
      toast({
        title: "Permission denied",
        description: "Only the host can mute other participants",
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

      if (onToggleMute) {
        onToggleMute(participant.user_id, newMutedState);
      }

      toast({
        title: newMutedState ? "Participant muted" : "Participant unmuted",
      });
    } catch (error: any) {
      console.error('Error toggling mute:', error);
      toast({
        title: "Error",
        description: `Failed to update mute status`,
        variant: "destructive"
      });
    }
  };

  const handleRemoveParticipant = async (participant: Participant) => {
    if (!isCurrentUserHost) return;

    try {
      const { error } = await supabase
        .from('meeting_participants')
        .delete()
        .eq('id', participant.id);

      if (error) throw error;

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

  const ParticipantCard = ({ participant }: { participant: Participant }) => {
    const isCurrentUser = participant.user_id === currentUserId;
    const canControl = isCurrentUserHost && !isCurrentUser;
    const isSelected = selectedVideoId === participant.user_id || (isCurrentUser && selectedVideoId === 'local');
    
    return (
      <div
        className={cn(
          "p-3 rounded-lg border transition-all duration-200 group cursor-pointer",
          isSelected ? "bg-blue-600/20 border-blue-500/50" : "bg-slate-800/40 border-slate-600/30 hover:bg-slate-800/60"
        )}
        onClick={() => onSelectVideo?.(isCurrentUser ? 'local' : participant.user_id)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3 min-w-0 flex-1">
            <div className="relative">
              <Avatar className="h-10 w-10 border border-white/10">
                <AvatarFallback className={cn(
                  "text-white font-semibold",
                  participant.is_host ? "bg-orange-600" : "bg-blue-600"
                )}>
                  {participant.user_name.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              {participant.hand_raised && (
                <div className="absolute -top-1 -right-1 bg-yellow-500 rounded-full p-1 animate-bounce shadow-lg">
                  <Hand className="h-3 w-3 text-black fill-current" />
                </div>
              )}
            </div>
            
            <div className="min-w-0 flex-1">
              <div className="flex items-center space-x-2">
                <h4 className="text-white font-medium text-sm truncate">
                  {participant.user_name}
                  {isCurrentUser && " (You)"}
                </h4>
                {participant.is_host && (
                  <Badge variant="secondary" className="bg-orange-500/20 text-orange-400 text-[10px] h-4 border-none">
                    Host
                  </Badge>
                )}
              </div>
              
              <div className="flex items-center space-x-2 mt-1">
                {participant.is_muted ? (
                  <MicOff className="h-3 w-3 text-red-400" />
                ) : (
                  <Mic className="h-3 w-3 text-green-400" />
                )}
                {participant.is_video_enabled === false && (
                  <VideoOff className="h-3 w-3 text-red-400" />
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
            {(canControl || isCurrentUser) && (
              <Button
                onClick={(e) => {
                  e.stopPropagation();
                  handleMuteToggle(participant);
                }}
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 text-slate-400 hover:text-white"
              >
                {participant.is_muted ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />}
              </Button>
            )}

            {canControl && (
              <Button
                onClick={(e) => {
                  e.stopPropagation();
                  handleRemoveParticipant(participant);
                }}
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 text-red-400 hover:text-red-300"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}

            <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-slate-400">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between p-4 border-b border-slate-700/60">
        <h2 className="text-lg font-semibold text-white flex items-center">
          <Users className="h-5 w-5 mr-2 text-blue-400" />
          Participants ({participants.length})
        </h2>
        <Button onClick={onClose} variant="ghost" size="sm" className="lg:hidden text-slate-400">
          <X className="h-5 w-5" />
        </Button>
      </div>

      <Tabs defaultValue="list" className="flex-1 flex flex-col">
        <TabsList className="grid w-full grid-cols-2 mx-4 mt-4 bg-slate-800/50">
          <TabsTrigger value="list">All</TabsTrigger>
          <TabsTrigger value="files">Files</TabsTrigger>
        </TabsList>

        <TabsContent value="list" className="flex-1 mt-0">
          <ScrollArea className="h-[calc(100vh-280px)]">
            <div className="p-4 space-y-3">
              {isCurrentUserHost && participants.length > 1 && (
                <div className="flex space-x-2 mb-4">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 text-xs border-slate-700"
                    onClick={() => participants.forEach(p => !p.is_muted && p.user_id !== currentUserId && handleMuteToggle(p))}
                  >
                    Mute All
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 text-xs border-slate-700"
                    onClick={() => participants.forEach(p => p.is_muted && p.user_id !== currentUserId && handleMuteToggle(p))}
                  >
                    Unmute All
                  </Button>
                </div>
              )}

              {participants.map((participant) => (
                <ParticipantCard
                  key={participant.id}
                  participant={participant}
                />
              ))}
            </div>
          </ScrollArea>
        </TabsContent>

        <TabsContent value="files" className="flex-1 mt-0 p-4">
          <FileSharing meetingId={meetingId} isHost={isCurrentUserHost} />
        </TabsContent>
      </Tabs>
    </div>
  );
};
