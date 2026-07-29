import { useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { parseMeetingCodeFromInput } from '@/lib/meeting';
import { fetchMeetingByCode } from '@/lib/meetingLookup';

// Cache for meeting validations to avoid duplicate requests
const validationCache = new Map<string, { result: boolean; timestamp: number }>();
const CACHE_DURATION = 2 * 60 * 1000; // 2 minutes
const CACHE_KEY_VERSION = 'v2'; // bump when join RPC semantics change

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
    const normalizedMeetingId = parseMeetingCodeFromInput(meetingId);
    if (!normalizedMeetingId || normalizedMeetingId.length < 4) {
      if (!skipToast) {
        toast({
          title: 'Invalid Meeting ID',
          description: 'Enter a meeting code or paste an invite link',
          variant: 'destructive',
        });
      }
      return false;
    }

    const cacheKey = `${CACHE_KEY_VERSION}:${normalizedMeetingId}`;
    const cached = validationCache.get(cacheKey);
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
          const meeting = await fetchMeetingByCode(normalizedMeetingId);

          if (!meeting) {
            console.error('Meeting not found:', normalizedMeetingId);
            const result = false;
            validationCache.set(cacheKey, { result, timestamp: Date.now() });
            
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
            validationCache.set(cacheKey, { result, timestamp: Date.now() });
            
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
            validationCache.set(cacheKey, { result, timestamp: Date.now() });
            
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
          validationCache.set(cacheKey, { result, timestamp: Date.now() });
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
