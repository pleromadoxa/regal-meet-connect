
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
  maxAlternatives: number;
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
  const [currentTranscript, setCurrentTranscript] = useState('');
  const recognitionRef = useRef<SpeechRecognitionInterface | null>(null);
  const restartTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastTranscriptRef = useRef<string>('');
  const { toast } = useToast();

  const startListening = useCallback(() => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      toast({
        title: "Not Supported",
        description: "Speech recognition is not supported in this browser. Please use Chrome, Edge, or Safari.",
        variant: "destructive"
      });
      return;
    }

    if (!participantId || !meetingId) {
      console.warn('Cannot start speech recognition - missing participant ID or meeting ID');
      return;
    }

    try {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      const recognition = new SpeechRecognition() as SpeechRecognitionInterface;
      
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';
      recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        console.log('Speech recognition started');
        setIsListening(true);
        setCurrentTranscript('');
        if (restartTimeoutRef.current) {
          clearTimeout(restartTimeoutRef.current);
          restartTimeoutRef.current = null;
        }
      };

      recognition.onresult = async (event: SpeechRecognitionEvent) => {
        let interimTranscript = '';
        let finalTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          
          if (event.results[i].isFinal) {
            finalTranscript += transcript + ' ';
          } else {
            interimTranscript += transcript;
          }
        }

        // Show interim results
        if (interimTranscript) {
          setCurrentTranscript(interimTranscript);
        }

        // Process final results
        if (finalTranscript.trim() && finalTranscript.trim() !== lastTranscriptRef.current) {
          const cleanTranscript = finalTranscript.trim();
          lastTranscriptRef.current = cleanTranscript;
          setCurrentTranscript('');
          
          console.log('Final speech transcript:', cleanTranscript);

          try {
            const { data, error } = await supabase
              .from('meeting_captions')
              .insert({
                meeting_id: meetingId,
                participant_id: participantId,
                content: cleanTranscript
              })
              .select();

            if (error) {
              console.error('Error saving caption:', error);
              toast({
                title: "Caption Error",
                description: "Failed to save caption. Check your connection.",
                variant: "destructive"
              });
            } else {
              console.log('Caption saved successfully:', data);
            }
          } catch (error) {
            console.error('Error saving caption:', error);
          }
        }
      };

      recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
        setCurrentTranscript('');
        
        if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
          toast({
            title: "Microphone Access Required",
            description: "Please allow microphone access and try again. Check your browser settings.",
            variant: "destructive"
          });
          setIsEnabled(false);
          return;
        }
        
        if (event.error === 'no-speech') {
          console.log('No speech detected, continuing...');
          // Don't show error for no speech, just continue
        } else if (event.error === 'audio-capture') {
          toast({
            title: "Microphone Error",
            description: "No microphone was found. Please connect a microphone and try again.",
            variant: "destructive"
          });
          setIsEnabled(false);
          return;
        }
        
        // Auto-restart on recoverable errors
        if (isEnabled && (event.error === 'network' || event.error === 'aborted' || event.error === 'no-speech')) {
          restartTimeoutRef.current = setTimeout(() => {
            if (isEnabled) {
              console.log('Restarting speech recognition after error:', event.error);
              startListening();
            }
          }, 1000);
        }
      };

      recognition.onend = () => {
        console.log('Speech recognition ended');
        setIsListening(false);
        setCurrentTranscript('');
        
        // Auto-restart if still enabled
        if (isEnabled && !restartTimeoutRef.current) {
          restartTimeoutRef.current = setTimeout(() => {
            if (isEnabled) {
              console.log('Auto-restarting speech recognition');
              startListening();
            }
          }, 500);
        }
      };

      recognitionRef.current = recognition;
      recognition.start();
      console.log('Starting speech recognition for participant:', participantId);
    } catch (error) {
      console.error('Error starting speech recognition:', error);
      setIsListening(false);
      toast({
        title: "Recognition Error",
        description: "Failed to start speech recognition. Please try again.",
        variant: "destructive"
      });
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
    setCurrentTranscript('');
    lastTranscriptRef.current = '';
  }, []);

  const toggleCaptions = useCallback(() => {
    const newEnabled = !isEnabled;
    console.log('Toggling captions:', newEnabled);
    setIsEnabled(newEnabled);
    
    if (newEnabled) {
      if (participantId && meetingId) {
        // Request microphone permissions first
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
      if (restartTimeoutRef.current) {
        clearTimeout(restartTimeoutRef.current);
      }
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
