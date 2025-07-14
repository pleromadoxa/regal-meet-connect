
import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export const useMeetingValidation = () => {
  const { toast } = useToast();

  const validateMeetingId = useCallback(async (meetingId: string): Promise<boolean> => {
    if (!meetingId?.trim()) {
      toast({
        title: "Invalid Meeting ID",
        description: "Please enter a valid meeting ID",
        variant: "destructive"
      });
      return false;
    }

    try {
      console.log('Validating meeting ID:', meetingId);
      
      // Query by meeting_id (text field) not by id (uuid field)
      // Normalize the meeting ID to uppercase and trim whitespace
      const normalizedMeetingId = meetingId.trim().toUpperCase();
      const { data: meeting, error } = await supabase
        .from('meetings')
        .select('id, meeting_id, is_active, status, title')
        .eq('meeting_id', normalizedMeetingId)
        .eq('is_active', true)
        .maybeSingle();

      if (error) {
        console.error('Error validating meeting:', error);
        toast({
          title: "Validation Error",
          description: "Unable to validate meeting ID. Please try again.",
          variant: "destructive"
        });
        return false;
      }

      if (!meeting) {
        console.error('Meeting not found:', normalizedMeetingId);
        toast({
          title: "Invalid Meeting ID",
          description: "The meeting ID you entered does not exist or is no longer active. Please check the ID and try again.",
          variant: "destructive"
        });
        return false;
      }

      if (meeting.status === 'ended' || meeting.status === 'cancelled') {
        toast({
          title: "Meeting Unavailable",
          description: "This meeting has ended or been cancelled.",
          variant: "destructive"
        });
        return false;
      }

      console.log('Meeting validation successful:', meeting);
      return true;
      
    } catch (error) {
      console.error('Error validating meeting:', error);
      toast({
        title: "Validation Error",
        description: "Unable to validate meeting ID. Please try again.",
        variant: "destructive"
      });
      return false;
    }
  }, [toast]);

  return { validateMeetingId };
};
