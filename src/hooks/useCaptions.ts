
import { useState, useRef, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Caption {
  id: string;
  meeting_id: string;
  participant_id: string;
  content: string;
  timestamp: string;
}

interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
}

interface SpeechRecognitionResult {
  readonly [index: number]: SpeechRecognitionAlternative;
  readonly length: number;
  readonly isFinal: boolean;
}

interface SpeechRecognitionAlternative {
  readonly transcript: string;
  readonly confidence: number;
}

interface SpeechRecognitionResultList {
  readonly [index: number]: SpeechRecognitionResult;
  readonly length: number;
}

declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

interface SpeechRecognitionInterface {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onstart: () => void;
  onresult: (event: SpeechRecognitionEvent) => void;
  onerror: (event: SpeechRecognitionErrorEvent) => void;
  onend: () => void;
  start: () => void;
  stop: () => void;
}

export const useCaptions = (meetingId: string, participantId: string) => {
  const [captions, setCaptions] = useState<Caption[]>([]);
  const [isEnabled, setIsEnabled] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<SpeechRecognitionInterface | null>(null);
  const { toast } = useToast();

  const startListening = useCallback(() => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      toast({
        title: "Not Supported",
        description: "Speech recognition is not supported in this browser",
        variant: "destructive"
      });
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition() as SpeechRecognitionInterface;
    
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
      setIsListening(true);
    };

    recognition.onresult = async (event: SpeechRecognitionEvent) => {
      let finalTranscript = '';
      
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcript;
        }
      }

      if (finalTranscript.trim() && participantId) {
        try {
          await supabase
            .from('meeting_captions')
            .insert({
              meeting_id: meetingId,
              participant_id: participantId,
              content: finalTranscript.trim()
            });
        } catch (error) {
          console.error('Error saving caption:', error);
        }
      }
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      console.error('Speech recognition error:', event.error);
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
      if (isEnabled) {
        setTimeout(startListening, 100);
      }
    };

    recognitionRef.current = recognition;
    recognition.start();
  }, [meetingId, participantId, isEnabled, toast]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    setIsListening(false);
  }, []);

  const toggleCaptions = useCallback(() => {
    const newEnabled = !isEnabled;
    setIsEnabled(newEnabled);
    
    if (newEnabled) {
      if (participantId) {
        startListening();
        toast({
          title: "Captions Enabled",
          description: "Live captions are now active"
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
  }, [isEnabled, startListening, stopListening, toast, participantId]);

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
    toggleCaptions
  };
};
