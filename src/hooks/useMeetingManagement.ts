
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
  country?: string;
  city?: string;
  ip_address?: string;
}

// Enhanced edge function to get location data
const getLocationFromIP = async (): Promise<{ country?: string; city?: string; ip?: string }> => {
  try {
    // Use the log-activity function with the special action for location info
    const { data, error } = await supabase.functions.invoke('log-activity', {
      body: {
        action: 'get_location_info',
        user_id: null // Just to get location data
      }
    });

    if (error) {
      console.error('Error getting location:', error);
      return {};
    }

    return {
      country: data?.data?.country,
      city: data?.data?.city,
      ip: data?.data?.ip_address
    };
  } catch (error) {
    console.error('Failed to get location:', error);
    return {};
  }
};

export const useMeetingManagement = () => {
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [participants, setParticipants] = useState<MeetingParticipant[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const { user } = useAuth();
  const { createMeeting: createMeetingAction, removeMeeting: removeMeetingAction } = useMeetingActions();

  const fetchMeetings = useCallback(async () => {
    if (!user?.id) {
      console.log('No user ID available, skipping meeting fetch');
      setLoading(false);
      return;
    }

    try {
      console.log('Fetching meetings for user:', user.id);
      
      // Fetch hosted meetings with error handling
      const { data: hostedMeetings, error: hostedError } = await supabase
        .from('meetings')
        .select('*')
        .eq('host_id', user.id)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (hostedError) {
        console.error('Error fetching hosted meetings:', hostedError);
        // Don't throw - continue with empty array
      }

      // Fetch participant meetings with error handling
      const { data: participantRecords, error: participantError } = await supabase
        .from('meeting_participants')
        .select('meeting_id')
        .eq('user_id', user.id);

      if (participantError) {
        console.error('Error fetching participant records:', participantError);
        // Continue with just hosted meetings
      }

      let participantMeetings: Meeting[] = [];
      if (participantRecords && participantRecords.length > 0) {
        const meetingIds = participantRecords.map(p => p.meeting_id);
        
        const { data: allMeetings, error: allMeetingsError } = await supabase
          .from('meetings')
          .select('*')
          .in('id', meetingIds)
          .eq('is_active', true);

        if (!allMeetingsError && allMeetings) {
          participantMeetings = allMeetings.filter(m => m.host_id !== user.id);
        }
      }

      const allMeetings = [...(hostedMeetings || []), ...participantMeetings];
      
      console.log('All meetings fetched:', allMeetings);
      setMeetings(allMeetings);
      
    } catch (error) {
      console.error('Error in fetchMeetings:', error);
      // Don't show toast on error to avoid annoying users
      setMeetings([]); // Set empty array as fallback
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

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

  const fetchParticipants = useCallback(async (meetingUuid: string) => {
    if (!meetingUuid) {
      console.log('No meeting UUID provided for participant fetch');
      return [];
    }

    try {
      const { data, error } = await supabase
        .from('meeting_participants')
        .select('id, user_id, user_name, is_host, is_muted, joined_at, left_at, country, city')
        .eq('meeting_id', meetingUuid)
        .is('left_at', null);

      if (error) {
        console.error('Error fetching participants:', error);
        return [];
      }

      console.log('Fetched participants with location:', data);
      return data || [];
    } catch (error) {
      console.error('Error in fetchParticipants:', error);
      return [];
    }
  }, []);

  const joinMeeting = async (meetingIdText: string, userName: string) => {
    if (!user?.id) return null;

    try {
      console.log('Joining meeting:', { meetingIdText, userName, userId: user.id });
      
      // Get user location data
      const locationData = await getLocationFromIP();
      console.log('Location data retrieved:', locationData);
      
      // Find the meeting by meeting_id (text field) - ensure we use uppercase
      const normalizedMeetingId = meetingIdText.toUpperCase().trim();
      let { data: meeting, error: meetingError } = await supabase
        .from('meetings')
        .select('id, host_id, title, meeting_id')
        .eq('meeting_id', normalizedMeetingId)
        .eq('is_active', true)
        .maybeSingle();

      if (meetingError) {
        console.error('Error finding meeting:', meetingError);
        throw meetingError;
      }

      // If meeting not found in active meetings, check scheduled meetings
      if (!meeting) {
        console.log('Meeting not found in active meetings, checking scheduled meetings:', normalizedMeetingId);
        const { data: scheduledMeeting, error: scheduledError } = await supabase
          .from('scheduled_meetings')
          .select('*')
          .eq('meeting_id', normalizedMeetingId)
          .eq('status', 'scheduled')
          .maybeSingle();

        if (scheduledError) {
          console.error('Error checking scheduled meetings:', scheduledError);
        }

        if (scheduledMeeting) {
          console.log('Found valid scheduled meeting, activating it:', scheduledMeeting);
          // Activate the scheduled meeting by creating an entry in the active meetings table
          const { data: newMeeting, error: createError } = await supabase
            .from('meetings')
            .insert({
              meeting_id: scheduledMeeting.meeting_id,
              host_id: scheduledMeeting.host_id,
              title: scheduledMeeting.title,
              description: scheduledMeeting.description,
              is_active: true,
              status: 'active'
            })
            .select()
            .single();

          if (createError) {
            console.error('Error activating scheduled meeting:', createError);
            throw createError;
          }
          meeting = newMeeting;
        }
      }

      if (!meeting) {
        console.log('Meeting not found for meeting_id:', normalizedMeetingId);
        toast({
          title: "Meeting Not Found",
          description: "The meeting ID you entered does not exist or is no longer active.",
          variant: "destructive"
        });
        return null;
      }

      console.log('Found meeting:', meeting);

      // Check if user is already a participant
      const { data: existingParticipant } = await supabase
        .from('meeting_participants')
        .select('id')
        .eq('meeting_id', meeting.id)
        .eq('user_id', user.id)
        .maybeSingle();

      if (existingParticipant) {
        console.log('User already participant, returning existing record');
        return existingParticipant;
      }

      // Add user as participant using the meeting UUID (id field) with location
      const { data, error } = await supabase
        .from('meeting_participants')
        .insert({
          meeting_id: meeting.id, // Use the UUID id field
          user_id: user.id,
          user_name: userName,
          is_host: false,
          is_muted: false,
          country: locationData.country,
          city: locationData.city,
          ip_address: locationData.ip
        })
        .select()
        .single();

      if (error) {
        console.error('Error joining meeting:', error);
        throw error;
      }
      
      console.log('Joined meeting successfully:', data);
      toast({
        title: "Joined Meeting",
        description: `Successfully joined "${meeting.title}"`
      });
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

  const joinAsHost = async (meetingIdText: string, userName: string) => {
    if (!user?.id) return null;

    try {
      console.log('Joining as host:', { meetingIdText, userName, userId: user.id });
      
      // Get user location data
      const locationData = await getLocationFromIP();
      console.log('Location data retrieved for host:', locationData);
      
      // Find the meeting and verify user is the host using meeting_id (text field)
      const normalizedMeetingId = meetingIdText.toUpperCase().trim();
      let { data: meeting, error: meetingError } = await supabase
        .from('meetings')
        .select('*')
        .eq('meeting_id', normalizedMeetingId)
        .eq('host_id', user.id)
        .eq('is_active', true)
        .maybeSingle();

      if (meetingError) {
        console.error('Meeting query error:', meetingError);
        throw meetingError;
      }

      // If meeting not found, check if it's a scheduled meeting hosted by this user
      if (!meeting) {
        const { data: scheduledMeeting, error: scheduledError } = await supabase
          .from('scheduled_meetings')
          .select('*')
          .eq('meeting_id', normalizedMeetingId)
          .eq('host_id', user.id)
          .eq('status', 'scheduled')
          .maybeSingle();

        if (scheduledError) {
          console.error('Error checking scheduled meeting for host:', scheduledError);
        }

        if (scheduledMeeting) {
          // Activate it
          const { data: newMeeting, error: createError } = await supabase
            .from('meetings')
            .insert({
              meeting_id: scheduledMeeting.meeting_id,
              host_id: scheduledMeeting.host_id,
              title: scheduledMeeting.title,
              description: scheduledMeeting.description,
              is_active: true,
              status: 'active'
            })
            .select()
            .single();

          if (createError) throw createError;
          meeting = newMeeting;
        }
      }

      if (!meeting) {
        console.error('Meeting not found or user not host:', { meetingIdText: normalizedMeetingId, userId: user.id });
        toast({
          title: "Access Denied",
          description: "You are not the host of this meeting or it doesn't exist.",
          variant: "destructive"
        });
        return null;
      }

      // Check if host is already a participant using meeting UUID (id field)
      const { data: existingParticipant } = await supabase
        .from('meeting_participants')
        .select('id')
        .eq('meeting_id', meeting.id)
        .eq('user_id', user.id)
        .maybeSingle();

      if (existingParticipant) {
        console.log('Host already participant, returning existing record');
        return { meeting, participant: existingParticipant };
      }

      // Add host as participant using meeting UUID (id field) with location
      const { data, error } = await supabase
        .from('meeting_participants')
        .insert({
          meeting_id: meeting.id, // Use the UUID id field
          user_id: user.id,
          user_name: userName,
          is_host: true,
          is_muted: false,
          country: locationData.country,
          city: locationData.city,
          ip_address: locationData.ip
        })
        .select()
        .single();

      if (error) {
        console.error('Error joining as host:', error);
        throw error;
      }
      
      console.log('Joined as host successfully:', data);
      toast({
        title: "Hosting Meeting",
        description: `Successfully joined "${meeting.title}" as host`
      });
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

  // Track participant leaving
  const updateParticipantLeaveTime = async (participantId: string) => {
    try {
      const { error } = await supabase
        .from('meeting_participants')
        .update({ left_at: new Date().toISOString() })
        .eq('id', participantId);

      if (error) {
        console.error('Error updating participant leave time:', error);
      }
    } catch (error) {
      console.error('Error updating participant leave time:', error);
    }
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
    updateParticipantLeaveTime,
    removeMeeting,
    fetchMeetings,
    isUserHost
  };
};
