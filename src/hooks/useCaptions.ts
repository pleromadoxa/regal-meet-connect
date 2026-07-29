import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Caption {
  id: string;
  content: string;
  participant_id: string;
  meeting_id: string;
  timestamp: string;
}

export const useCaptions = (meetingId: string, currentParticipantId: string | null) => {
  const [captions, setCaptions] = useState<Caption[]>([]);
  const [isEnabled, setIsEnabled] = useState(false);
  const [currentTranscript, setCurrentTranscript] = useState('');
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const { toast } = useToast();

  // Fetch meeting UUID from meeting_id text
  const [meetingUuid, setMeetingUuid] = useState<string | null>(null);

  useEffect(() => {
    const fetchMeetingUuid = async () => {
      if (!meetingId) return;
      
      try {
        const { data: meeting, error } = await supabase
          .from('meetings')
          .select('id')
          .eq('meeting_id', meetingId.toUpperCase().trim())
          .maybeSingle();

        if (error) {
          console.error('Error fetching meeting UUID:', error);
          return;
        }

        if (meeting) {
          setMeetingUuid(meeting.id);
        }
      } catch (error) {
        console.error('Error in fetchMeetingUuid:', error);
      }
    };

    fetchMeetingUuid();
  }, [meetingId]);

  const fetchCaptions = useCallback(async () => {
    if (!meetingUuid) return;

    try {
      console.log('Fetching captions for meeting UUID:', meetingUuid);
      
      const { data, error } = await supabase
        .from('meeting_captions')
        .select('*')
        .eq('meeting_id', meetingUuid)
        .order('timestamp', { ascending: true });

      if (error) {
        console.error('Error fetching captions:', error);
        return;
      }

      setCaptions(data || []);
    } catch (error) {
      console.error('Error fetching captions:', error);
    }
  }, [meetingUuid]);

  useEffect(() => {
    if (meetingUuid) {
      fetchCaptions();

      // Set up real-time subscription for captions
      const channel = supabase
        .channel(`captions-${meetingUuid}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'meeting_captions',
            filter: `meeting_id=eq.${meetingUuid}`
          },
          (payload) => {
            console.log('New caption received:', payload);
            setCaptions(prev => [...prev, payload.new as Caption]);
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [meetingUuid, fetchCaptions]);

  const saveCaptionToDatabase = useCallback(async (content: string) => {
    if (!meetingUuid || !currentParticipantId || !content.trim()) return;

    try {
      const { error } = await supabase
        .from('meeting_captions')
        .insert({
          meeting_id: meetingUuid,
          participant_id: currentParticipantId,
          content: content.trim(),
        });

      if (error) {
        console.error('Error saving caption:', error);
      }
    } catch (error) {
      console.error('Error saving caption:', error);
    }
  }, [meetingUuid, currentParticipantId]);

  const toggleCaptions = useCallback(() => {
    if (!isEnabled) {
      // Start captions
      if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
        const SpeechRecognitionConstructor = window.webkitSpeechRecognition || window.SpeechRecognition;
        const recognition = new SpeechRecognitionConstructor();
        
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'en-US';
        
        recognition.onstart = () => {
          console.log('Speech recognition started');
          setIsEnabled(true);
          toast({
            title: "Captions Enabled",
            description: "Live captions are now active"
          });
        };
        
        recognition.onresult = (event: SpeechRecognitionEvent) => {
          let interim = '';
          let final = '';
          
          for (let i = event.resultIndex; i < event.results.length; i++) {
            const transcript = event.results[i][0].transcript;
            if (event.results[i].isFinal) {
              final += transcript;
            } else {
              interim += transcript;
            }
          }
          
          setCurrentTranscript(interim);
          
          if (final) {
            saveCaptionToDatabase(final);
            setCurrentTranscript('');
          }
        };
        
        recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
          console.error('Speech recognition error:', event.error);
          setIsEnabled(false);
          toast({
            title: "Caption Error",
            description: "There was an error with speech recognition",
            variant: "destructive"
          });
        };
        
        recognition.onend = () => {
          console.log('Speech recognition ended');
          setIsEnabled(false);
          setCurrentTranscript('');
        };
        
        recognitionRef.current = recognition;
        recognition.start();
      } else {
        toast({
          title: "Not Supported",
          description: "Speech recognition is not supported in this browser",
          variant: "destructive"
        });
      }
    } else {
      // Stop captions
      if (recognitionRef.current) {
        recognitionRef.current.stop();
        recognitionRef.current = null;
      }
      setIsEnabled(false);
      setCurrentTranscript('');
      toast({
        title: "Captions Disabled",
        description: "Live captions have been turned off"
      });
    }
  }, [isEnabled, saveCaptionToDatabase, toast]);

  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);

  return {
    captions,
    isEnabled,
    currentTranscript,
    toggleCaptions
  };
};
