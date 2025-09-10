
import { useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

// Cache for meeting validations to avoid duplicate requests
const validationCache = new Map<string, { result: boolean; timestamp: number }>();
const CACHE_DURATION = 2 * 60 * 1000; // 2 minutes

export const useMeetingValidation = () => {
  const { toast } = useToast();
  const abortControllerRef = useRef<AbortController | null>(null);

  const validateMeetingId = useCallback(async (meetingId: string, skipToast = false): Promise<boolean> => {
    if (!meetingId?.trim()) {
      if (!skipToast) {
        toast({
          title: "Invalid Meeting ID",
          description: "Please enter a valid meeting ID",
          variant: "destructive"
        });
      }
      return false;
    }

    // Normalize the meeting ID to uppercase and trim whitespace
    const normalizedMeetingId = meetingId.trim().toUpperCase();
    
    // Check cache first
    const cached = validationCache.get(normalizedMeetingId);
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      console.log('Using cached validation result for:', normalizedMeetingId);
      return cached.result;
    }

    // Cancel any previous validation request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    abortControllerRef.current = new AbortController();

    try {
      console.log('Validating meeting ID:', normalizedMeetingId);
      
      // Retry logic with exponential backoff
      let attempts = 0;
      const maxAttempts = 3;
      
      while (attempts < maxAttempts) {
        try {
          const { data: meeting, error } = await supabase
            .from('meetings')
            .select('id, meeting_id, is_active, status, title')
            .eq('meeting_id', normalizedMeetingId)
            .abortSignal(abortControllerRef.current.signal)
            .maybeSingle();

          if (error) {
            if (error.name === 'AbortError') {
              console.log('Validation request was cancelled');
              return false;
            }
            
            attempts++;
            if (attempts >= maxAttempts) {
              console.error('Error validating meeting after retries:', error);
              if (!skipToast) {
                toast({
                  title: "Connection Error",
                  description: "Unable to validate meeting ID. Please check your connection and try again.",
                  variant: "destructive"
                });
              }
              validationCache.set(normalizedMeetingId, { result: false, timestamp: Date.now() });
              return false;
            }
            
            // Wait before retry (exponential backoff)
            await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempts) * 500));
            continue;
          }

          if (!meeting) {
            console.error('Meeting not found:', normalizedMeetingId);
            const result = false;
            validationCache.set(normalizedMeetingId, { result, timestamp: Date.now() });
            
            if (!skipToast) {
              toast({
                title: "Invalid Meeting ID",
                description: "The meeting ID you entered does not exist or is no longer active. Please check the ID and try again.",
                variant: "destructive"
              });
            }
            return result;
          }

          if (!meeting.is_active) {
            const result = false;
            validationCache.set(normalizedMeetingId, { result, timestamp: Date.now() });
            
            if (!skipToast) {
              toast({
                title: "Meeting Unavailable",
                description: "This meeting is no longer active.",
                variant: "destructive"
              });
            }
            return result;
          }

          if (meeting.status === 'ended' || meeting.status === 'cancelled') {
            const result = false;
            validationCache.set(normalizedMeetingId, { result, timestamp: Date.now() });
            
            if (!skipToast) {
              toast({
                title: "Meeting Unavailable",
                description: "This meeting has ended or been cancelled.",
                variant: "destructive"
              });
            }
            return result;
          }

          console.log('Meeting validation successful:', meeting);
          const result = true;
          validationCache.set(normalizedMeetingId, { result, timestamp: Date.now() });
          return result;
          
        } catch (retryError) {
          if (retryError.name === 'AbortError') {
            console.log('Validation request was cancelled');
            return false;
          }
          
          attempts++;
          if (attempts >= maxAttempts) {
            console.error('Error validating meeting after retries:', retryError);
            if (!skipToast) {
              toast({
                title: "Validation Error",
                description: "Unable to validate meeting ID. Please try again.",
                variant: "destructive"
              });
            }
            return false;
          }
          
          // Wait before retry
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempts) * 500));
        }
      }
      
      return false;
    } catch (error) {
      if (error.name === 'AbortError') {
        console.log('Validation request was cancelled');
        return false;
      }
      
      console.error('Unexpected error during validation:', error);
      if (!skipToast) {
        toast({
          title: "Validation Error", 
          description: "An unexpected error occurred. Please try again.",
          variant: "destructive"
        });
      }
      return false;
    }
  }, [toast]);

  return { validateMeetingId };
};
