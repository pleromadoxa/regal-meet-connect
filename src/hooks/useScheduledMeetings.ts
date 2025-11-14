import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useToast } from './use-toast';

export interface ScheduledMeeting {
  id: string;
  meeting_id: string;
  title: string;
  description?: string;
  host_id: string;
  scheduled_time: string;
  duration_minutes: number;
  is_recurring: boolean;
  recurrence_pattern?: string;
  recurrence_end_date?: string;
  timezone: string;
  meeting_link?: string;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface MeetingInvitation {
  id: string;
  scheduled_meeting_id: string;
  invitee_email: string;
  invitee_name?: string;
  status: string;
  created_at: string;
}

interface ScheduleMeetingParams {
  title: string;
  description?: string;
  scheduledTime: Date;
  durationMinutes: number;
  isRecurring: boolean;
  recurrencePattern?: 'daily' | 'weekly' | 'monthly' | null;
  invitees: string[];
}

export const useScheduledMeetings = () => {
  const [scheduledMeetings, setScheduledMeetings] = useState<ScheduledMeeting[]>([]);
  const [invitations, setInvitations] = useState<MeetingInvitation[]>([]);
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  const fetchScheduledMeetings = useCallback(async () => {
    if (!user) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('scheduled_meetings')
        .select('*')
        .eq('host_id', user.id)
        .order('scheduled_time', { ascending: true });

      if (error) throw error;
      setScheduledMeetings(data || []);
    } catch (error) {
      console.error('Error fetching scheduled meetings:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch scheduled meetings',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  }, [user, toast]);

  const fetchInvitations = useCallback(async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('meeting_invitations')
        .select('*')
        .eq('invitee_email', user.email)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setInvitations(data || []);
    } catch (error) {
      console.error('Error fetching invitations:', error);
    }
  }, [user]);

  const generateMeetingId = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 8; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  };

  const scheduleMeeting = async (params: ScheduleMeetingParams) => {
    if (!user) throw new Error('User not authenticated');

    const meetingId = generateMeetingId();
    const meetingLink = `${window.location.origin}/meeting/${meetingId}`;

    // Insert scheduled meeting
    const { data: meeting, error: meetingError } = await supabase
      .from('scheduled_meetings')
      .insert({
        meeting_id: meetingId,
        title: params.title,
        description: params.description,
        host_id: user.id,
        scheduled_time: params.scheduledTime.toISOString(),
        duration_minutes: params.durationMinutes,
        is_recurring: params.isRecurring,
        recurrence_pattern: params.recurrencePattern,
        meeting_link: meetingLink,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
      })
      .select()
      .single();

    if (meetingError) throw meetingError;

    // Insert invitations
    if (params.invitees.length > 0) {
      const invitations = params.invitees.map(email => ({
        scheduled_meeting_id: meeting.id,
        invitee_email: email
      }));

      const { error: invitationError } = await supabase
        .from('meeting_invitations')
        .insert(invitations);

      if (invitationError) throw invitationError;

      // Send email notifications
      try {
        await supabase.functions.invoke('send-meeting-invitation', {
          body: {
            meeting: {
              id: meetingId,
              title: params.title,
              description: params.description,
              scheduledTime: params.scheduledTime.toISOString(),
              duration: params.durationMinutes,
              link: meetingLink
            },
            invitees: params.invitees,
            hostEmail: user.email
          }
        });
      } catch (emailError) {
        console.error('Error sending invitations:', emailError);
        // Don't throw - meeting is created, just email failed
      }
    }

    await fetchScheduledMeetings();
    return meeting;
  };

  const cancelScheduledMeeting = async (meetingId: string) => {
    const { error } = await supabase
      .from('scheduled_meetings')
      .update({ status: 'cancelled' })
      .eq('id', meetingId);

    if (error) throw error;
    await fetchScheduledMeetings();
  };

  const respondToInvitation = async (
    invitationId: string,
    status: 'accepted' | 'declined'
  ) => {
    const { error } = await supabase
      .from('meeting_invitations')
      .update({ status })
      .eq('id', invitationId);

    if (error) throw error;
    await fetchInvitations();
  };

  useEffect(() => {
    if (user) {
      fetchScheduledMeetings();
      fetchInvitations();
    }
  }, [user, fetchScheduledMeetings, fetchInvitations]);

  return {
    scheduledMeetings,
    invitations,
    loading,
    scheduleMeeting,
    cancelScheduledMeeting,
    respondToInvitation,
    refetch: fetchScheduledMeetings
  };
};