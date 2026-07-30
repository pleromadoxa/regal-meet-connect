import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { waitForChannelSubscribed } from '@/lib/meetingBroadcast';

export interface MeetingChatMessage {
  id: string;
  userName: string;
  message: string;
  timestamp: Date;
}

interface ChatBroadcastPayload {
  userName: string;
  text: string;
  ts: number;
  id?: string;
}

/** Realtime in-meeting chat over Supabase broadcast (meeting-chat-{id}). */
export function useMeetingChatChannel(meetingId: string | undefined, userName: string) {
  const [messages, setMessages] = useState<MeetingChatMessage[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const subscribedRef = useRef(false);

  useEffect(() => {
    if (!meetingId) return;

    subscribedRef.current = false;
    setIsConnected(false);
    setMessages([]);

    const channel = supabase.channel(`meeting-chat-${meetingId}`);
    channel
      .on('broadcast', { event: 'message' }, ({ payload }) => {
        const data = payload as ChatBroadcastPayload;
        if (!data?.text?.trim()) return;

        setMessages((prev) => {
          const id = data.id ?? `${data.userName}-${data.ts}`;
          if (prev.some((m) => m.id === id)) return prev;
          return [
            ...prev,
            {
              id,
              userName: data.userName,
              message: data.text.trim(),
              timestamp: new Date(data.ts),
            },
          ];
        });
      })
      .subscribe((status) => {
        const connected = status === 'SUBSCRIBED';
        subscribedRef.current = connected;
        setIsConnected(connected);
      });

    channelRef.current = channel;

    return () => {
      subscribedRef.current = false;
      setIsConnected(false);
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [meetingId]);

  const sendMessage = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || !meetingId || !channelRef.current) return false;

      const ready = await waitForChannelSubscribed(subscribedRef);
      if (!ready) return false;

      const ts = Date.now();
      const id = `${userName}-${ts}-${Math.random().toString(36).slice(2, 7)}`;
      const payload: ChatBroadcastPayload = { userName, text: trimmed, ts, id };

      await channelRef.current.send({
        type: 'broadcast',
        event: 'message',
        payload,
      });

      setMessages((prev) => {
        if (prev.some((m) => m.id === id)) return prev;
        return [...prev, { id, userName, message: trimmed, timestamp: new Date(ts) }];
      });

      return true;
    },
    [meetingId, userName]
  );

  return { messages, sendMessage, isConnected };
}
