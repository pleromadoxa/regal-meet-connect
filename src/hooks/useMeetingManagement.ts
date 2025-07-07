
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
    if (!user?.id) {
      setLoading(false);
      return;
    }

    try {
      console.log('Fetching meetings for user:', user.id);
      
      // Fetch meetings where user is host
      const { data: hostedMeetings, error: hostedError } = await supabase
        .from('meetings')
        .select('*')
        .eq('host_id', user.id)
        .order('created_at', { ascending: false });

      if (hostedError) {
        console.error('Error fetching hosted meetings:', hostedError);
        throw hostedError;
      }

      // Fetch meetings where user is participant
      const { data: participantMeetings, error: participantError } = await supabase
        .from('meeting_participants')
        .select(`
          meeting_id,
          meetings!inner(*)
        `)
        .eq('user_id', user.id);

      if (participantError) {
        console.error('Error fetching participant meetings:', participantError);
        // Don't throw here, just log the error
      }

      // Combine and deduplicate meetings
      const allMeetings = [...(hostedMeetings || [])];
      
      if (participantMeetings) {
        participantMeetings.forEach((pm: any) => {
          const meeting = pm.meetings;
          if (meeting && !allMeetings.find(m => m.id === meeting.id)) {
            allMeetings.push(meeting);
          }
        });
      }

      console.log('Fetched meetings:', allMeetings);
      setMeetings(allMeetings);
    } catch (error) {
      console.error('Error in fetchMeetings:', error);
      toast({
        title: "Error",
        description: "Failed to fetch meetings. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  }, [user?.id, toast]);

  const fetchParticipants = useCallback(async (meetingId: string) => {
    try {
      console.log('Fetching participants for meeting:', meetingId);
      const { data, error } = await supabase
        .from('meeting_participants')
        .select('*')
        .eq('meeting_id', meetingId)
        .order('joined_at', { ascending: true });

      if (error) {
        console.error('Error fetching participants:', error);
        throw error;
      }
      
      console.log('Fetched participants:', data);
      setParticipants(data || []);
    } catch (error) {
      console.error('Error in fetchParticipants:', error);
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
      await fetchMeetings();
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
  };

  const joinMeeting = async (meetingId: string, userName: string) => {
    if (!user?.id) return null;

    try {
      console.log('Joining meeting:', { meetingId, userName, userId: user.id });
      
      // First check if meeting exists
      const { data: meeting, error: meetingError } = await supabase
        .from('meetings')
        .select('id, host_id')
        .eq('meeting_id', meetingId)
        .single();

      if (meetingError) {
        console.error('Meeting not found:', meetingError);
        toast({
          title: "Meeting Not Found",
          description: "The meeting ID you entered does not exist.",
          variant: "destructive"
        });
        return null;
      }

      // Check if user is already a participant
      const { data: existingParticipant } = await supabase
        .from('meeting_participants')
        .select('id')
        .eq('meeting_id', meeting.id)
        .eq('user_id', user.id)
        .single();

      if (existingParticipant) {
        console.log('User already participant, returning existing record');
        return existingParticipant;
      }

      // Join as participant
      const { data, error } = await supabase
        .from('meeting_participants')
        .insert({
          meeting_id: meeting.id,
          user_id: user.id,
          user_name: userName,
          is_host: false,
          is_muted: false
        })
        .select()
        .single();

      if (error) {
        console.error('Error joining meeting:', error);
        throw error;
      }
      
      console.log('Joined meeting successfully:', data);
      return data;
    } catch (error) {
      console.error('Error in joinMeeting:', error);
      toast({
        title: "Error",
        description: "Failed to join meeting. Please try again.",
        variant: "destructive"
      });
      return null;
    }
  };

  const joinAsHost = async (meetingId: string, userName: string) => {
    if (!user?.id) return null;

    try {
      console.log('Joining as host:', { meetingId, userName, userId: user.id });
      
      // Get the meeting and verify user is the host
      const { data: meeting, error: meetingError } = await supabase
        .from('meetings')
        .select('*')
        .eq('meeting_id', meetingId)
        .eq('host_id', user.id)
        .single();

      if (meetingError) {
        console.error('Meeting not found or user not host:', meetingError);
        toast({
          title: "Access Denied",
          description: "You are not the host of this meeting or it doesn't exist.",
          variant: "destructive"
        });
        return null;
      }

      // Check if host is already a participant
      const { data: existingParticipant } = await supabase
        .from('meeting_participants')
        .select('id')
        .eq('meeting_id', meeting.id)
        .eq('user_id', user.id)
        .single();

      if (existingParticipant) {
        console.log('Host already participant, returning existing record');
        return { meeting, participant: existingParticipant };
      }

      // Join as host
      const { data, error } = await supabase
        .from('meeting_participants')
        .insert({
          meeting_id: meeting.id,
          user_id: user.id,
          user_name: userName,
          is_host: true,
          is_muted: false
        })
        .select()
        .single();

      if (error) {
        console.error('Error joining as host:', error);
        throw error;
      }
      
      console.log('Joined as host successfully:', data);
      return { meeting, participant: data };
    } catch (error) {
      console.error('Error in joinAsHost:', error);
      toast({
        title: "Error",
        description: "Failed to join as host. Please try again.",
        variant: "destructive"
      });
      return null;
    }
  };

  const toggleMuteParticipant = async (participantId: string, isMuted: boolean) => {
    if (!user?.id) return;

    try {
      console.log('Toggling mute for participant:', { participantId, isMuted });
      
      const { error } = await supabase
        .from('meeting_participants')
        .update({ is_muted: isMuted })
        .eq('id', participantId);

      if (error) {
        console.error('Error updating participant mute status:', error);
        throw error;
      }
      
      // Update local state
      setParticipants(prev => 
        prev.map(p => p.id === participantId ? { ...p, is_muted: isMuted } : p)
      );
      
      console.log('Participant mute status updated successfully');
    } catch (error) {
      console.error('Error in toggleMuteParticipant:', error);
      toast({
        title: "Error",
        description: "Failed to update mute status. You may not have permission.",
        variant: "destructive"
      });
    }
  };

  const removeMeeting = async (meetingId: string) => {
    if (!user?.id) return;

    try {
      console.log('Deleting meeting:', meetingId);
      
      const { error } = await supabase
        .from('meetings')
        .delete()
        .eq('id', meetingId)
        .eq('host_id', user.id); // Ensure only host can delete

      if (error) {
        console.error('Error deleting meeting:', error);
        throw error;
      }
      
      await fetchMeetings();
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
  };

  const isUserHost = (meeting: Meeting) => {
    return meeting.host_id === user?.id;
  };

  useEffect(() => {
    if (user?.id) {
      fetchMeetings();
    }
  }, [fetchMeetings, user?.id]);

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
    fetchMeetings,
    isUserHost
  };
};
