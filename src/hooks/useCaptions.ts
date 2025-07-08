
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
  const restartTimeoutRef = useRef<NodeJS.Timeout | null>(null);
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

    if (!participantId) {
      console.warn('Cannot start speech recognition - no participant ID');
      return;
    }

    try {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      const recognition = new SpeechRecognition() as SpeechRecognitionInterface;
      
      recognition.continuous = true;
      recognition.interimResults = false;
      recognition.lang = 'en-US';

      recognition.onstart = () => {
        console.log('Speech recognition started');
        setIsListening(true);
        if (restartTimeoutRef.current) {
          clearTimeout(restartTimeoutRef.current);
          restartTimeoutRef.current = null;
        }
      };

      recognition.onresult = async (event: SpeechRecognitionEvent) => {
        console.log('Speech recognition result received');
        
        for (let i = event.resultIndex; i < event.results.length; i++) {
          if (event.results[i].isFinal) {
            const transcript = event.results[i][0].transcript.trim();
            console.log('Final transcript:', transcript);

            if (transcript && participantId && meetingId) {
              try {
                console.log('Saving caption to database:', {
                  meeting_id: meetingId,
                  participant_id: participantId,
                  content: transcript
                });

                const { data, error } = await supabase
                  .from('meeting_captions')
                  .insert({
                    meeting_id: meetingId,
                    participant_id: participantId,
                    content: transcript
                  })
                  .select();

                if (error) {
                  console.error('Error saving caption:', error);
                } else {
                  console.log('Caption saved successfully:', data);
                }
              } catch (error) {
                console.error('Error saving caption:', error);
              }
            }
          }
        }
      };

      recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
        
        if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
          toast({
            title: "Microphone Access Denied",
            description: "Please allow microphone access to use captions",
            variant: "destructive"
          });
        }
        
        // Auto-restart on recoverable errors
        if (isEnabled && (event.error === 'network' || event.error === 'aborted' || event.error === 'no-speech')) {
          restartTimeoutRef.current = setTimeout(() => {
            if (isEnabled) {
              console.log('Restarting speech recognition after error');
              startListening();
            }
          }, 2000);
        }
      };

      recognition.onend = () => {
        console.log('Speech recognition ended');
        setIsListening(false);
        
        // Auto-restart if still enabled
        if (isEnabled && !restartTimeoutRef.current) {
          restartTimeoutRef.current = setTimeout(() => {
            if (isEnabled) {
              console.log('Restarting speech recognition');
              startListening();
            }
          }, 1000);
        }
      };

      recognitionRef.current = recognition;
      recognition.start();
      console.log('Starting speech recognition...');
    } catch (error) {
      console.error('Error starting speech recognition:', error);
      setIsListening(false);
    }
  }, [meetingId, participantId, isEnabled, toast]);

  const stopListening = useCallback(() => {
    console.log('Stopping speech recognition');
    
    if (restartTimeoutRef.current) {
      clearTimeout(restartTimeoutRef.current);
      restartTimeoutRef.current = null;
    }
    
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    setIsListening(false);
  }, []);

  const toggleCaptions = useCallback(() => {
    const newEnabled = !isEnabled;
    console.log('Toggling captions:', newEnabled);
    setIsEnabled(newEnabled);
    
    if (newEnabled) {
      if (participantId) {
        startListening();
        toast({
          title: "Captions Enabled",
          description: "Live captions are now active. Start speaking to see transcriptions."
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
      if (restartTimeoutRef.current) {
        clearTimeout(restartTimeoutRef.current);
      }
    };
  }, [stopListening]);

  return {
    captions,
    isEnabled,
    isListening,
    toggleCaptions
  };
};
