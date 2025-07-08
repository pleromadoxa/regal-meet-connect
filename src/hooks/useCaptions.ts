
import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useCaptionsCore } from './useCaptionsCore';

interface Caption {
  id: string;
  meeting_id: string;
  participant_id: string;
  content: string;
  timestamp: string;
}

export const useCaptions = (meetingId: string, participantId: string) => {
  const [captions, setCaptions] = useState<Caption[]>([]);
  const [isEnabled, setIsEnabled] = useState(false);
  const { toast } = useToast();
  const { isListening, currentTranscript, startListening, stopListening } = useCaptionsCore(meetingId, participantId);

  const toggleCaptions = useCallback(() => {
    const newEnabled = !isEnabled;
    console.log('Toggling captions:', newEnabled);
    setIsEnabled(newEnabled);
    
    if (newEnabled) {
      if (participantId && meetingId) {
        navigator.mediaDevices.getUserMedia({ audio: true })
          .then(() => {
            startListening();
            toast({
              title: "Captions Enabled",
              description: "Live captions are now active. Speak clearly into your microphone."
            });
          })
          .catch((error) => {
            console.error('Microphone permission denied:', error);
            setIsEnabled(false);
            toast({
              title: "Microphone Access Required", 
              description: "Please allow microphone access to use live captions.",
              variant: "destructive"
            });
          });
      } else {
        toast({
          title: "Cannot Enable Captions",
          description: "Please join the meeting first",
          variant: "destructive"
        });
        setIsEnabled(false);
      }
    } else {
      stopListening();
      toast({
        title: "Captions Disabled",
        description: "Live captions have been turned off"
      });
    }
  }, [isEnabled, startListening, stopListening, toast, participantId, meetingId]);

  const fetchCaptions = useCallback(async () => {
    if (!meetingId) return;
    
    try {
      const { data, error } = await supabase
        .from('meeting_captions')
        .select('*')
        .eq('meeting_id', meetingId)
        .order('timestamp', { ascending: true })
        .limit(50);

      if (error) throw error;
      console.log('Fetched captions:', data);
      setCaptions(data || []);
    } catch (error) {
      console.error('Error fetching captions:', error);
    }
  }, [meetingId]);

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
          console.log('New caption received:', payload.new);
          setCaptions(prev => [...prev, payload.new as Caption].slice(-50));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [meetingId, fetchCaptions]);

  useEffect(() => {
    return () => {
      stopListening();
    };
  }, [stopListening]);

  return {
    captions,
    isEnabled,
    isListening,
    currentTranscript,
    toggleCaptions
  };
};
