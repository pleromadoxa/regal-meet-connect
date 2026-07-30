import { useCallback, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface HandRaisePayload {
  userName: string;
  handRaised: boolean;
  timestamp: number;
}

/** Persistent subscribed channel for meeting hand-raise broadcasts. */
export function useMeetingHandsChannel(meetingId: string | undefined) {
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const subscribedRef = useRef(false);

  useEffect(() => {
    if (!meetingId) return;

    subscribedRef.current = false;
    const channel = supabase.channel(`meeting-hands-${meetingId}`);
    channel.subscribe((status) => {
      subscribedRef.current = status === 'SUBSCRIBED';
    });
    channelRef.current = channel;

    return () => {
      subscribedRef.current = false;
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [meetingId]);

  const broadcastHandRaise = useCallback(
    async (payload: HandRaisePayload) => {
      if (!meetingId || !channelRef.current) return false;

      if (!subscribedRef.current) {
        await new Promise<void>((resolve) => {
          const deadline = Date.now() + 3000;
          const tick = () => {
            if (subscribedRef.current || Date.now() > deadline) {
              resolve();
              return;
            }
            requestAnimationFrame(tick);
          };
          tick();
        });
      }

      if (!subscribedRef.current) return false;

      await channelRef.current.send({
        type: 'broadcast',
        event: 'hand-raised',
        payload,
      });
      return true;
    },
    [meetingId]
  );

  return { broadcastHandRaise };
}
