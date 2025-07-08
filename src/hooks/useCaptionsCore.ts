
import { useState, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
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

export const useCaptionsCore = (meetingId: string, participantId: string) => {
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

        if (interimTranscript) {
          setCurrentTranscript(interimTranscript);
        }

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
          return;
        }
        
        if (event.error === 'no-speech') {
          console.log('No speech detected, continuing...');
        } else if (event.error === 'audio-capture') {
          toast({
            title: "Microphone Error",
            description: "No microphone was found. Please connect a microphone and try again.",
            variant: "destructive"
          });
          return;
        }
      };

      recognition.onend = () => {
        console.log('Speech recognition ended');
        setIsListening(false);
        setCurrentTranscript('');
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
  }, [meetingId, participantId, toast]);

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

  return {
    isListening,
    currentTranscript,
    startListening,
    stopListening
  };
};
