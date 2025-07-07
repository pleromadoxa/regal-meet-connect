
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';

interface Meeting {
  id: string;
  meeting_id: string;
  host_id: string;
  title: string;
  description?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface MeetingParticipant {
  id: string;
  meeting_id: string;
  user_id: string;
  user_name: string;
  is_host: boolean;
  is_muted: boolean;
  joined_at: string;
}

export const useMeetingManagement = () => {
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [participants, setParticipants] = useState<MeetingParticipant[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const { user } = useAuth();

  const fetchMeetings = useCallback(async () => {
    if (!user?.id) return;

    try {
      const { data, error } = await supabase
        .from('meetings')
        .select('*')
        .eq('host_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setMeetings(data || []);
    } catch (error) {
      console.error('Error fetching meetings:', error);
      toast({
        title: "Error",
        description: "Failed to fetch meetings",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  }, [user?.id, toast]);

  const fetchParticipants = useCallback(async (meetingId: string) => {
    try {
      const { data, error } = await supabase
        .from('meeting_participants')
        .select('*')
        .eq('meeting_id', meetingId)
        .order('joined_at', { ascending: true });

      if (error) throw error;
      setParticipants(data || []);
    } catch (error) {
      console.error('Error fetching participants:', error);
      toast({
        title: "Error",
        description: "Failed to fetch participants",
        variant: "destructive"
      });
    }
  }, [toast]);

  const createMeeting = async (meetingId: string, title: string, description?: string) => {
    if (!user?.id) return null;

    try {
      const { data, error } = await supabase
        .from('meetings')
        .insert({
          meeting_id: meetingId,
          host_id: user.id,
          title,
          description
        })
        .select()
        .single();

      if (error) throw error;
      
      await fetchMeetings();
      return data;
    } catch (error) {
      console.error('Error creating meeting:', error);
      toast({
        title: "Error",
        description: "Failed to create meeting",
        variant: "destructive"
      });
      return null;
    }
  };

  const joinMeeting = async (meetingId: string, userName: string) => {
    if (!user?.id) return null;

    try {
      // First get the meeting
      const { data: meeting, error: meetingError } = await supabase
        .from('meetings')
        .select('id')
        .eq('meeting_id', meetingId)
        .single();

      if (meetingError) throw meetingError;

      // Join as participant
      const { data, error } = await supabase
        .from('meeting_participants')
        .insert({
          meeting_id: meeting.id,
          user_id: user.id,
          user_name: userName,
          is_host: false
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error joining meeting:', error);
      toast({
        title: "Error",
        description: "Failed to join meeting",
        variant: "destructive"
      });
      return null;
    }
  };

  const joinAsHost = async (meetingId: string, userName: string) => {
    if (!user?.id) return null;

    try {
      // Get the meeting
      const { data: meeting, error: meetingError } = await supabase
        .from('meetings')
        .select('*')
        .eq('meeting_id', meetingId)
        .eq('host_id', user.id)
        .single();

      if (meetingError) throw meetingError;

      // Join as host
      const { data, error } = await supabase
        .from('meeting_participants')
        .insert({
          meeting_id: meeting.id,
          user_id: user.id,
          user_name: userName,
          is_host: true
        })
        .select()
        .single();

      if (error) throw error;
      return { meeting, participant: data };
    } catch (error) {
      console.error('Error joining as host:', error);
      toast({
        title: "Error",
        description: "Failed to join as host",
        variant: "destructive"
      });
      return null;
    }
  };

  const toggleMuteParticipant = async (participantId: string, isMuted: boolean) => {
    try {
      const { error } = await supabase
        .from('meeting_participants')
        .update({ is_muted: isMuted })
        .eq('id', participantId);

      if (error) throw error;
      
      // Update local state
      setParticipants(prev => 
        prev.map(p => p.id === participantId ? { ...p, is_muted: isMuted } : p)
      );
    } catch (error) {
      console.error('Error updating participant mute status:', error);
      toast({
        title: "Error",
        description: "Failed to update mute status",
        variant: "destructive"
      });
    }
  };

  const removeMeeting = async (meetingId: string) => {
    try {
      const { error } = await supabase
        .from('meetings')
        .delete()
        .eq('id', meetingId);

      if (error) throw error;
      
      await fetchMeetings();
      toast({
        title: "Success",
        description: "Meeting deleted successfully"
      });
    } catch (error) {
      console.error('Error deleting meeting:', error);
      toast({
        title: "Error",
        description: "Failed to delete meeting",
        variant: "destructive"
      });
    }
  };

  useEffect(() => {
    fetchMeetings();
  }, [fetchMeetings]);

  return {
    meetings,
    participants,
    loading,
    createMeeting,
    joinMeeting,
    joinAsHost,
    fetchParticipants,
    toggleMuteParticipant,
    removeMeeting,
    fetchMeetings
  };
};
