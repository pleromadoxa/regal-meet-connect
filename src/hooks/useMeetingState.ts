
import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface ParticipantState {
  id: string;
  userId: string;
  userName: string;
  isVideoEnabled: boolean;
  isAudioEnabled: boolean;
  isHost: boolean;
  isMuted: boolean;
  joinedAt: string;
}

export interface ReactionEvent {
  type: string;
  participantId: string;
  participantName: string;
  timestamp: number;
}

export const useMeetingState = (meetingId: string, currentUserId: string) => {
  const [participants, setParticipants] = useState<ParticipantState[]>([]);
  const [reactions, setReactions] = useState<ReactionEvent[]>([]);
  const { toast } = useToast();

  // Subscribe to participant state changes
  useEffect(() => {
    if (!meetingId || !currentUserId) return;

    const channel = supabase.channel(`meeting-state-${meetingId}`);

    // Listen for participant state updates
    channel
      .on('broadcast', { event: 'participant-state' }, (payload) => {
        const { participantId, state } = payload.payload;
        
        setParticipants(prev => 
          prev.map(p => 
            p.id === participantId ? { ...p, ...state } : p
          )
        );
      })
      .on('broadcast', { event: 'reaction' }, (payload) => {
        const reaction: ReactionEvent = payload.payload;
        
        setReactions(prev => [...prev, reaction]);
        
        // Remove reaction after 3 seconds
        setTimeout(() => {
          setReactions(prev => prev.filter(r => r.timestamp !== reaction.timestamp));
        }, 3000);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [meetingId, currentUserId]);

  const broadcastParticipantState = useCallback((participantId: string, state: Partial<ParticipantState>) => {
    if (!meetingId) return;

    const channel = supabase.channel(`meeting-state-${meetingId}`);
    
    channel.send({
      type: 'broadcast',
      event: 'participant-state',
      payload: { participantId, state }
    });
  }, [meetingId]);

  const broadcastReaction = useCallback((reaction: ReactionEvent) => {
    if (!meetingId) return;

    const channel = supabase.channel(`meeting-state-${meetingId}`);
    
    channel.send({
      type: 'broadcast',
      event: 'reaction',
      payload: reaction
    });
  }, [meetingId]);

  const updateParticipantVideoState = useCallback((participantId: string, isVideoEnabled: boolean) => {
    broadcastParticipantState(participantId, { isVideoEnabled });
  }, [broadcastParticipantState]);

  const updateParticipantAudioState = useCallback((participantId: string, isAudioEnabled: boolean) => {
    broadcastParticipantState(participantId, { isAudioEnabled });
  }, [broadcastParticipantState]);

  const sendReaction = useCallback((type: string, participantName: string) => {
    const reaction: ReactionEvent = {
      type,
      participantId: currentUserId,
      participantName,
      timestamp: Date.now()
    };
    
    broadcastReaction(reaction);
  }, [currentUserId, broadcastReaction]);

  return {
    participants,
    setParticipants,
    reactions,
    updateParticipantVideoState,
    updateParticipantAudioState,
    sendReaction
  };
};
