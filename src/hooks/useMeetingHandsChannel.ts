import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { waitForChannelSubscribed } from '@/lib/meetingBroadcast';

export interface HandRaisePayload {
  userName: string;
  handRaised: boolean;
  timestamp: number;
}

export interface HandNotification {
  id: string;
  userName: string;
  timestamp: number;
}

interface UseMeetingHandsChannelOptions {
  userName?: string;
  onRemoteHandRaise?: (payload: HandRaisePayload) => void;
}

/** Persistent subscribed channel for meeting hand-raise broadcasts + listener. */
export function useMeetingHandsChannel(
  meetingId: string | undefined,
  options: UseMeetingHandsChannelOptions = {}
) {
  const { userName, onRemoteHandRaise } = options;
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const subscribedRef = useRef(false);
  const onRemoteHandRaiseRef = useRef(onRemoteHandRaise);
  onRemoteHandRaiseRef.current = onRemoteHandRaise;

  const [raisedHands, setRaisedHands] = useState<Set<string>>(new Set());
  const [handNotifications, setHandNotifications] = useState<HandNotification[]>([]);

  useEffect(() => {
    if (!meetingId) return;

    subscribedRef.current = false;
    setRaisedHands(new Set());
    setHandNotifications([]);

    const channel = supabase.channel(`meeting-hands-${meetingId}`);
    channel
      .on('broadcast', { event: 'hand-raised' }, ({ payload }) => {
        const data = payload as HandRaisePayload;
        if (!data?.userName) return;

        setRaisedHands((prev) => {
          const next = new Set(prev);
          if (data.handRaised) next.add(data.userName);
          else next.delete(data.userName);
          return next;
        });

        if (userName && data.userName !== userName) {
          if (data.handRaised) {
            const notification: HandNotification = {
              id: `${data.userName}-${data.timestamp}`,
              userName: data.userName,
              timestamp: data.timestamp,
            };
            setHandNotifications((prev) => [...prev, notification]);
          } else {
            setHandNotifications((prev) => prev.filter((n) => n.userName !== data.userName));
          }
          onRemoteHandRaiseRef.current?.(data);
        }
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
  }, [meetingId, userName]);

  const broadcastHandRaise = useCallback(
    async (payload: HandRaisePayload) => {
      if (!meetingId || !channelRef.current) return false;

      const ready = await waitForChannelSubscribed(subscribedRef);
      if (!ready) return false;

      await channelRef.current.send({
        type: 'broadcast',
        event: 'hand-raised',
        payload,
      });

      setRaisedHands((prev) => {
        const next = new Set(prev);
        if (payload.handRaised) next.add(payload.userName);
        else next.delete(payload.userName);
        return next;
      });

      return true;
    },
    [meetingId]
  );

  const dismissHandNotification = useCallback((id: string) => {
    setHandNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  return {
    broadcastHandRaise,
    raisedHands,
    handNotifications,
    dismissHandNotification,
    isSubscribed: subscribedRef.current,
  };
}
