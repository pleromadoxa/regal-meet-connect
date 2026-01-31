
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface ChatMessage {
  id: string;
  meeting_id: string;
  user_id: string;
  user_name: string;
  message: string;
  created_at: string;
}

export const useMeetingChat = (meetingId: string, currentUserId: string, userName: string) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  // Fetch initial messages
  const fetchMessages = useCallback(async () => {
    if (!meetingId) return;

    try {
      const { data, error } = await (supabase as any)
        .from('meeting_messages')
        .select('*')
        .eq('meeting_id', meetingId)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error fetching messages:', error);
        return;
      }

      setMessages((data as ChatMessage[]) || []);
    } catch (error) {
      console.error('Failed to fetch messages:', error);
    } finally {
      setIsLoading(false);
    }
  }, [meetingId]);

  // Subscribe to real-time updates
  useEffect(() => {
    if (!meetingId) return;

    fetchMessages();

    const channel = supabase
      .channel(`meeting-chat-${meetingId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'meeting_messages' as any,
        filter: `meeting_id=eq.${meetingId}`
      }, (payload) => {
        const newMessage = payload.new as ChatMessage;
        setMessages(prev => {
          if (prev.find(m => m.id === newMessage.id)) return prev;
          return [...prev, newMessage];
        });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [meetingId, fetchMessages]);

  // Send message function
  const sendMessage = async (message: string) => {
    if (!message.trim() || !meetingId || !currentUserId) return;

    try {
      const { error } = await (supabase as any)
        .from('meeting_messages')
        .insert({
          meeting_id: meetingId,
          user_id: currentUserId,
          user_name: userName,
          message: message.trim()
        });

      if (error) {
        console.error('Error sending message:', error);
        toast({
          title: "Error",
          description: "Failed to send message",
          variant: "destructive"
        });
        throw error;
      }
    } catch (error) {
      console.error('Failed to send message:', error);
      throw error;
    }
  };

  return {
    messages,
    isLoading,
    sendMessage
  };
};
