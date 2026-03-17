import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface ChatMessage {
  id: string;
  meeting_id: string;
  user_id: string;
  user_name: string;
  message: string;
  created_at: string;
}

export const useMeetingChat = (meetingId: string, userId: string, userName: string) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchMessages = useCallback(async () => {
    if (!meetingId) return;

    try {
      const { data, error } = await supabase
        .from('meeting_messages')
        .select('*')
        .eq('meeting_id', meetingId)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error fetching messages:', error);
        return;
      }

      setMessages(data || []);
    } catch (error) {
      console.error('Failed to fetch messages:', error);
    } finally {
      setIsLoading(false);
    }
  }, [meetingId]);

  const sendMessage = async (message: string) => {
    if (!meetingId || !userId || !message.trim()) return;

    try {
      const { error } = await supabase
        .from('meeting_messages')
        .insert({
          meeting_id: meetingId,
          user_id: userId,
          user_name: userName,
          message: message.trim()
        });

      if (error) {
        console.error('Error sending message:', error);
      }
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  };

  useEffect(() => {
    if (!meetingId) return;

    fetchMessages();

    const channel = supabase
      .channel(`meeting-messages-${meetingId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'meeting_messages',
        filter: `meeting_id=eq.${meetingId}`
      }, (payload) => {
        const newMessage = payload.new as ChatMessage;
        setMessages(prev => [...prev, newMessage]);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [meetingId, fetchMessages]);

  return {
    messages,
    isLoading,
    sendMessage
  };
};
