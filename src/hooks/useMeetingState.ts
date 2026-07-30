
import { useState, useCallback, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { waitForChannelSubscribed } from '@/lib/meetingBroadcast';

export interface ParticipantState {
  id: string;
  userId: string;
  userName: string;
  isVideoEnabled: boolean;
  isAudioEnabled: boolean;
  isHost: boolean;
  isMuted: boolean;
  joinedAt: string;
  country?: string;
  city?: string;
}

export const useMeetingState = (meetingId: string, currentUserId: string) => {
  const [participants, setParticipants] = useState<ParticipantState[]>([]);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const subscribedRef = useRef(false);

  useEffect(() => {
    if (!meetingId || !currentUserId) return;

    const channel = supabase.channel(`meeting-state-${meetingId}`);
    channelRef.current = channel;

    channel
      .on('broadcast', { event: 'participant-state' }, (payload) => {
        const { participantId, state } = payload.payload;

        setParticipants((prev) =>
          prev.map((p) => (p.id === participantId ? { ...p, ...state } : p))
        );
      })
      .subscribe((status) => {
        subscribedRef.current = status === 'SUBSCRIBED';
      });

    return () => {
      subscribedRef.current = false;
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [meetingId, currentUserId]);

  const broadcastParticipantState = useCallback(
    async (participantId: string, state: Partial<ParticipantState>) => {
      if (!meetingId || !channelRef.current) return;

      const ready = await waitForChannelSubscribed(subscribedRef);
      if (!ready) return;

      await channelRef.current.send({
        type: 'broadcast',
        event: 'participant-state',
        payload: { participantId, state },
      });
    },
    [meetingId]
  );

  const updateParticipantVideoState = useCallback(
    (participantId: string, isVideoEnabled: boolean) => {
      broadcastParticipantState(participantId, { isVideoEnabled });
    },
    [broadcastParticipantState]
  );

  const updateParticipantAudioState = useCallback(
    (participantId: string, isAudioEnabled: boolean) => {
      broadcastParticipantState(participantId, { isAudioEnabled });
    },
    [broadcastParticipantState]
  );

  return {
    participants,
    setParticipants,
    updateParticipantVideoState,
    updateParticipantAudioState,
  };
};
