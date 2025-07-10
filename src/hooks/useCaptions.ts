
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Caption {
  id: string;
  meeting_id: string;
  participant_id: string;
  content: string;
  timestamp: string;
}

export const useCaptions = (meetingId: string, participantId?: string) => {
  const [captions, setCaptions] = useState<Caption[]>([]);
  const [isEnabled, setIsEnabled] = useState(false);
  const [currentTranscript, setCurrentTranscript] = useState('');
  const { toast } = useToast();

  const fetchCaptions = useCallback(async () => {
    if (!meetingId) return;

    try {
      const { data, error } = await supabase
        .from('meeting_captions')
        .select('*')
        .eq('meeting_id', meetingId)
        .order('timestamp', { ascending: true });

      if (error) {
        console.error('Error fetching captions:', error);
        return;
      }

      setCaptions(data || []);
    } catch (error) {
      console.error('Error in fetchCaptions:', error);
    }
  }, [meetingId]);

  const addCaption = useCallback(async (content: string) => {
    if (!meetingId || !participantId || !content.trim()) return;

    try {
      const { error } = await supabase
        .from('meeting_captions')
        .insert({
          meeting_id: meetingId,
          participant_id: participantId,
          content: content.trim()
        });

      if (error) {
        console.error('Error adding caption:', error);
        toast({
          title: "Caption Error",
          description: "Failed to add caption",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error in addCaption:', error);
    }
  }, [meetingId, participantId, toast]);

  const toggleCaptions = useCallback(() => {
    setIsEnabled(prev => !prev);
    if (isEnabled) {
      setCurrentTranscript('');
    }
  }, [isEnabled]);

  // Subscribe to real-time caption updates
  useEffect(() => {
    if (!meetingId) return;

    fetchCaptions();

    const channel = supabase
      .channel(`captions-${meetingId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'meeting_captions',
          filter: `meeting_id=eq.${meetingId}`
        },
        (payload) => {
          console.log('New caption:', payload);
          setCaptions(prev => [...prev, payload.new as Caption]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [meetingId, fetchCaptions]);

  return {
    captions,
    isEnabled,
    currentTranscript,
    toggleCaptions,
    addCaption,
    setCurrentTranscript
  };
};
