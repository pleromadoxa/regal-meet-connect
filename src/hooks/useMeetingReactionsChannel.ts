import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { waitForChannelSubscribed } from '@/lib/meetingBroadcast';

export type MeetingReactionType =
  | 'heart'
  | 'like'
  | 'celebration'
  | 'party'
  | 'energy'
  | 'coffee'
  | 'slow';

export interface MeetingReactionEvent {
  type: MeetingReactionType;
  participantId: string;
  participantName: string;
  timestamp: number;
}

const REACTION_TTL_MS = 4000;

/** Realtime meeting reactions over Supabase broadcast (meeting-reactions-{id}). */
export function useMeetingReactionsChannel(
  meetingId: string | undefined,
  userId: string,
  userName: string
) {
  const [reactions, setReactions] = useState<MeetingReactionEvent[]>([]);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const subscribedRef = useRef(false);

  const pushReaction = useCallback((reaction: MeetingReactionEvent) => {
    setReactions((prev) => {
      if (prev.some((r) => r.timestamp === reaction.timestamp && r.participantId === reaction.participantId)) {
        return prev;
      }
      return [...prev, reaction];
    });

    window.setTimeout(() => {
      setReactions((prev) => prev.filter((r) => r.timestamp !== reaction.timestamp));
    }, REACTION_TTL_MS);
  }, []);

  useEffect(() => {
    if (!meetingId) return;

    subscribedRef.current = false;
    setReactions([]);

    const channel = supabase.channel(`meeting-reactions-${meetingId}`);
    channel
      .on('broadcast', { event: 'reaction' }, ({ payload }) => {
        const data = payload as MeetingReactionEvent;
        if (!data?.type || !data.participantId) return;
        if (data.participantId === userId) return;
        pushReaction(data);
      })
      .subscribe((status) => {
        subscribedRef.current = status === 'SUBSCRIBED';
      });

    channelRef.current = channel;

    return () => {
      subscribedRef.current = false;
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [meetingId, userId, pushReaction]);

  const sendReaction = useCallback(
    async (type: MeetingReactionType) => {
      if (!meetingId || !channelRef.current) return false;

      const ready = await waitForChannelSubscribed(subscribedRef);
      if (!ready) return false;

      const reaction: MeetingReactionEvent = {
        type,
        participantId: userId,
        participantName: userName,
        timestamp: Date.now(),
      };

      await channelRef.current.send({
        type: 'broadcast',
        event: 'reaction',
        payload: reaction,
      });

      pushReaction(reaction);
      return true;
    },
    [meetingId, userId, userName, pushReaction]
  );

  return { reactions, sendReaction };
}
