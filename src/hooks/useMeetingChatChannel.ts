import { useCallback, useEffect, useState } from 'react';
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

/**
 * Chat history is stored per meeting OUTSIDE of React state so it survives
 * minimising/unmounting the chat panel. The broadcast channel is also created
 * once per meeting and stays subscribed for the whole meeting, so messages
 * sent while the panel is closed are still received instead of being lost.
 */
interface MeetingChatStore {
  messages: MeetingChatMessage[];
  listeners: Set<() => void>;
  channel: ReturnType<typeof supabase.channel> | null;
  subscribedRef: { current: boolean };
}

const stores = new Map<string, MeetingChatStore>();

const notify = (store: MeetingChatStore) => {
  store.listeners.forEach((listener) => listener());
};

const appendMessage = (store: MeetingChatStore, message: MeetingChatMessage) => {
  if (store.messages.some((m) => m.id === message.id)) return;
  store.messages = [...store.messages, message];
  notify(store);
};

const getStore = (meetingId: string): MeetingChatStore => {
  const existing = stores.get(meetingId);
  if (existing) return existing;

  const store: MeetingChatStore = {
    messages: [],
    listeners: new Set(),
    channel: null,
    subscribedRef: { current: false },
  };
  stores.set(meetingId, store);

  const channel = supabase.channel(`meeting-chat-${meetingId}`);
  channel
    .on('broadcast', { event: 'message' }, ({ payload }) => {
      const data = payload as ChatBroadcastPayload;
      if (!data?.text?.trim()) return;
      const id = data.id ?? `${data.userName}-${data.ts}`;
      appendMessage(store, {
        id,
        userName: data.userName,
        message: data.text.trim(),
        timestamp: new Date(data.ts),
      });
    })
    .subscribe((status) => {
      store.subscribedRef.current = status === 'SUBSCRIBED';
      notify(store);
    });

  store.channel = channel;
  return store;
};

/** Realtime in-meeting chat over Supabase broadcast (meeting-chat-{id}). */
export function useMeetingChatChannel(meetingId: string | undefined, userName: string) {
  const [messages, setMessages] = useState<MeetingChatMessage[]>([]);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (!meetingId) {
      setMessages([]);
      setIsConnected(false);
      return;
    }

    const store = getStore(meetingId);
    const listener = () => {
      setMessages(store.messages);
      setIsConnected(store.subscribedRef.current);
    };

    store.listeners.add(listener);
    listener();

    return () => {
      store.listeners.delete(listener);
      // The store (and its channel) intentionally outlives this component so
      // the conversation persists for as long as the meeting is running.
    };
  }, [meetingId]);

  const sendMessage = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || !meetingId) return false;

      const store = getStore(meetingId);
      if (!store.channel) return false;

      const ready = await waitForChannelSubscribed(store.subscribedRef);
      if (!ready) return false;

      const ts = Date.now();
      const id = `${userName}-${ts}-${Math.random().toString(36).slice(2, 7)}`;
      const payload: ChatBroadcastPayload = { userName, text: trimmed, ts, id };

      await store.channel.send({
        type: 'broadcast',
        event: 'message',
        payload,
      });

      appendMessage(store, { id, userName, message: trimmed, timestamp: new Date(ts) });

      return true;
    },
    [meetingId, userName]
  );

  return { messages, sendMessage, isConnected };
}
