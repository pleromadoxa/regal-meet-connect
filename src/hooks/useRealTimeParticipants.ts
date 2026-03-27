import { useState, useRef, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface Participant {
  id: string;
  user_id: string;
  user_name: string;
  is_host: boolean;
  is_muted: boolean;
  joined_at: string;
  is_video_enabled: boolean;
  is_audio_enabled: boolean;
  connection_quality: 'good' | 'poor' | 'disconnected';
  location?: string;
  last_seen: string;
  hand_raised?: boolean;
}

export const useRealTimeParticipants = (meetingId: string, currentUserId: string, userName: string) => {
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const addCurrentUserAsParticipant = useCallback(async () => {
    if (!meetingId || !currentUserId || !userName) return;

    try {
      // Find the meeting UUID first if it's not already one
      const { data: meeting } = await supabase
        .from('meetings')
        .select('id')
        .eq('meeting_id', meetingId)
        .maybeSingle();

      let targetMeetingId = meeting?.id;

      if (!targetMeetingId) {
        // If not in active meetings, check scheduled meetings and activate
        const { data: scheduledMeeting } = await supabase
          .from('scheduled_meetings')
          .select('*')
          .eq('meeting_id', meetingId)
          .eq('status', 'scheduled')
          .maybeSingle();

        if (scheduledMeeting) {
          // Activate the meeting
          const { data: newMeeting, error: createError } = await supabase
            .from('meetings')
            .upsert({
              meeting_id: scheduledMeeting.meeting_id,
              host_id: scheduledMeeting.host_id,
              title: scheduledMeeting.title,
              description: scheduledMeeting.description,
              is_active: true,
              status: 'active'
            }, { onConflict: 'meeting_id' })
            .select()
            .single();

          if (!createError && newMeeting) {
            targetMeetingId = newMeeting.id;
          }
        }
      }

      if (!targetMeetingId) {
        console.error('Could not find or activate meeting:', meetingId);
        return;
      }

      // Check if already exists
      const { data: existing } = await supabase
        .from('meeting_participants')
        .select('id')
        .eq('meeting_id', targetMeetingId)
        .eq('user_id', currentUserId)
        .maybeSingle();

      if (existing) return;

      // Add current user
      await supabase
        .from('meeting_participants')
        .insert({
          meeting_id: targetMeetingId,
          user_id: currentUserId,
          user_name: userName,
          is_host: false,
          is_muted: false
        });
    } catch (error) {
      console.error('Error adding current user to participants:', error);
    }
  }, [meetingId, currentUserId, userName]);

  const fetchParticipants = useCallback(async () => {
    if (!meetingId) return;

    try {
      const { data, error } = await supabase
        .from('meeting_participants')
        .select('*')
        .eq('meeting_id', meetingId)
        .order('joined_at', { ascending: true });

      if (error) {
        console.error('Error fetching participants:', error);
        return;
      }

      const mappedParticipants = (data || []).map((p: any) => ({
        ...p,
        is_video_enabled: true,
        is_audio_enabled: !p.is_muted,
        connection_quality: 'good' as const,
        last_seen: p.joined_at,
        hand_raised: false // Initialize
      }));

      setParticipants(mappedParticipants);
    } catch (error) {
      console.error('Failed to fetch participants:', error);
    } finally {
      setIsLoading(false);
    }
  }, [meetingId]);

  useEffect(() => {
    if (!meetingId) return;

    addCurrentUserAsParticipant().then(() => {
      fetchParticipants();
    });

    const participantsChannel = supabase
      .channel(`meeting-participants-${meetingId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'meeting_participants',
        filter: `meeting_id=eq.${meetingId}`
      }, (payload) => {
        if (payload.eventType === 'INSERT') {
          const newP = payload.new as Participant;
          setParticipants(prev => {
            if (prev.find(p => p.id === newP.id)) return prev;
            if (newP.user_id !== currentUserId) {
              toast({ title: "Joined", description: `${newP.user_name} joined` });
            }
            return [...prev, { ...newP, hand_raised: false }];
          });
        } else if (payload.eventType === 'UPDATE') {
          const updatedP = payload.new as Participant;
          setParticipants(prev => prev.map(p => p.id === updatedP.id ? { ...p, ...updatedP } : p));
        } else if (payload.eventType === 'DELETE') {
          const leftP = payload.old as Participant;
          setParticipants(prev => prev.filter(p => p.id !== leftP.id));
        }
      })
      .subscribe();

    const handsChannel = supabase
      .channel(`meeting-hands-${meetingId}`)
      .on('broadcast', { event: 'hand-raised' }, ({ payload }) => {
        setParticipants(prev => prev.map(p =>
          p.user_name === payload.userName ? { ...p, hand_raised: payload.handRaised } : p
        ));
      })
      .subscribe();

    return () => {
      supabase.removeChannel(participantsChannel);
      supabase.removeChannel(handsChannel);
    };
  }, [meetingId, currentUserId, fetchParticipants, toast]);

  return {
    participants,
    isLoading
  };
};
