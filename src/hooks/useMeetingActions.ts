
import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';

export const useMeetingActions = () => {
  const { toast } = useToast();
  const { user } = useAuth();

  const createMeeting = useCallback(async (meetingId: string, title: string, description?: string) => {
    if (!user?.id) {
      console.error('No user ID available');
      toast({
        title: "Authentication Error",
        description: "You must be logged in to create a meeting",
        variant: "destructive"
      });
      return null;
    }

    try {
      console.log('Creating meeting with details:', { 
        meeting_id: meetingId, 
        host_id: user.id, 
        title, 
        description,
        is_active: true,
        status: 'active'
      });
      
      // First, check if meeting ID already exists
      const { data: existingMeeting, error: checkError } = await supabase
        .from('meetings')
        .select('meeting_id')
        .eq('meeting_id', meetingId)
        .eq('is_active', true)
        .maybeSingle();

      if (checkError) {
        console.error('Error checking existing meeting:', checkError);
        throw new Error(`Failed to check existing meeting: ${checkError.message}`);
      }

      if (existingMeeting) {
        console.error('Meeting ID already exists:', meetingId);
        throw new Error('Meeting ID already exists. Please try again.');
      }

      // Create the meeting
      const { data, error } = await supabase
        .from('meetings')
        .insert({
          meeting_id: meetingId,
          host_id: user.id,
          title: title.trim(),
          description: description?.trim() || null,
          is_active: true,
          status: 'active'
        })
        .select('*')
        .single();

      if (error) {
        console.error('Supabase error creating meeting:', error);
        throw new Error(`Failed to create meeting: ${error.message}`);
      }
      
      if (!data) {
        console.error('No data returned from meeting creation');
        throw new Error('No meeting data returned from database');
      }
      
      console.log('Meeting created successfully:', data);
      
      toast({
        title: "Meeting Created",
        description: `"${title}" has been created successfully`,
      });
      
      return data;
      
    } catch (error) {
      console.error('Error in createMeeting:', error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
      toast({
        title: "Failed to Create Meeting",
        description: errorMessage,
        variant: "destructive"
      });
      return null;
    }
  }, [user?.id, toast]);

  const removeMeeting = useCallback(async (meetingId: string) => {
    if (!user?.id) {
      toast({
        title: "Authentication Error", 
        description: "You must be logged in to delete a meeting",
        variant: "destructive"
      });
      return;
    }

    try {
      console.log('Deleting meeting:', meetingId);
      
      const { error } = await supabase
        .from('meetings')
        .delete()
        .eq('id', meetingId)
        .eq('host_id', user.id);

      if (error) {
        console.error('Error deleting meeting:', error);
        throw new Error(`Failed to delete meeting: ${error.message}`);
      }
      
      toast({
        title: "Success",
        description: "Meeting deleted successfully"
      });
      
      console.log('Meeting deleted successfully');
    } catch (error) {
      console.error('Error in removeMeeting:', error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
      toast({
        title: "Delete Failed",
        description: errorMessage,
        variant: "destructive"
      });
    }
  }, [user?.id, toast]);

  return {
    createMeeting,
    removeMeeting
  };
};
