
import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';

export const useMeetingActions = () => {
  const { toast } = useToast();
  const { user } = useAuth();

  const createMeeting = useCallback(async (meetingId: string, title: string, description?: string) => {
    if (!user?.id) return null;

    try {
      console.log('Creating meeting:', { meetingId, title, description, hostId: user.id });
      
      const { data, error } = await supabase
        .from('meetings')
        .insert({
          meeting_id: meetingId,
          host_id: user.id,
          title,
          description,
          is_active: true
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating meeting:', error);
        throw error;
      }
      
      console.log('Meeting created successfully:', data);
      return data;
    } catch (error) {
      console.error('Error in createMeeting:', error);
      toast({
        title: "Error",
        description: "Failed to create meeting. Please try again.",
        variant: "destructive"
      });
      return null;
    }
  }, [user?.id, toast]);

  const removeMeeting = useCallback(async (meetingId: string) => {
    if (!user?.id) return;

    try {
      console.log('Deleting meeting:', meetingId);
      
      const { error } = await supabase
        .from('meetings')
        .delete()
        .eq('id', meetingId)
        .eq('host_id', user.id);

      if (error) {
        console.error('Error deleting meeting:', error);
        throw error;
      }
      
      toast({
        title: "Success",
        description: "Meeting deleted successfully"
      });
      
      console.log('Meeting deleted successfully');
    } catch (error) {
      console.error('Error in removeMeeting:', error);
      toast({
        title: "Error",
        description: "Failed to delete meeting. You may not have permission.",
        variant: "destructive"
      });
    }
  }, [user?.id, toast]);

  return {
    createMeeting,
    removeMeeting
  };
};
