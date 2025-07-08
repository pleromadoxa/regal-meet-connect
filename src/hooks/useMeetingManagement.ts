import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { useMeetingActions } from './useMeetingActions';

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
  const { createMeeting: createMeetingAction, removeMeeting: removeMeetingAction } = useMeetingActions();

  const fetchMeetings = useCallback(async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    try {
      console.log('Fetching meetings for user:', user.id);
      
      const { data: hostedMeetings, error: hostedError } = await supabase
        .from('meetings')
        .select('*')
        .eq('host_id', user.id)
        .order('created_at', { ascending: false });

      if (hostedError) {
        console.error('Error fetching hosted meetings:', hostedError);
        throw hostedError;
      }

      const { data: participantMeetings, error: participantError } = await supabase
        .from('meeting_participants')
        .select(`
          meeting_id,
          meetings!inner(*)
        `)
        .eq('user_id', user.id);

      if (participantError) {
        console.error('Error fetching participant meetings:', participantError);
      }

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

  const createMeeting = useCallback(async (meetingId: string, title: string, description?: string) => {
    const result = await createMeetingAction(meetingId, title, description);
    if (result) {
      await fetchMeetings();
    }
    return result;
  }, [createMeetingAction, fetchMeetings]);

  const removeMeeting = useCallback(async (meetingId: string) => {
    await removeMeetingAction(meetingId);
    await fetchMeetings();
  }, [removeMeetingAction, fetchMeetings]);

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
      
      const channel = supabase
        .channel(`participants-${meetingId}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'meeting_participants',
            filter: `meeting_id=eq.${meetingId}`
          },
          (payload) => {
            console.log('Participant change:', payload);
            fetchParticipants(meetingId);
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    } catch (error) {
      console.error('Error in fetchParticipants:', error);
      toast({
        title: "Error",
        description: "Failed to fetch participants",
        variant: "destructive"
      });
    }
  }, [toast]);

  const joinMeeting = async (meetingId: string, userName: string) => {
    if (!user?.id) return null;

    try {
      console.log('Joining meeting:', { meetingId, userName, userId: user.id });
      
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

  const isUserHost = (meeting: Meeting) => {
    return meeting.host_id === user?.id;
  };

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
