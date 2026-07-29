import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface RecentMeeting {
  id: string;
  meeting_id: string;
  meeting_title: string | null;
  joined_at: string;
  last_accessed: string;
  is_host: boolean;
}

export const useRecentMeetings = () => {
  const { user } = useAuth();
  const [recentMeetings, setRecentMeetings] = useState<RecentMeeting[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchRecentMeetings = useCallback(async () => {
    if (!user) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('user_recent_meetings')
        .select('*')
        .eq('user_id', user.id)
        .order('last_accessed', { ascending: false })
        .limit(5);

      if (error) {
        console.error('Error fetching recent meetings:', error);
        return;
      }

      setRecentMeetings(data || []);
    } catch (error) {
      console.error('Error in fetchRecentMeetings:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  const addRecentMeeting = useCallback(async (
    meetingId: string,
    meetingTitle?: string,
    isHost: boolean = false
  ) => {
    if (!user) return;

    try {
      // Check if meeting already exists in recent meetings
      const { data: existing } = await supabase
        .from('user_recent_meetings')
        .select('id')
        .eq('user_id', user.id)
        .eq('meeting_id', meetingId)
        .single();

      if (existing) {
        // Update last_accessed
        await supabase
          .from('user_recent_meetings')
          .update({ 
            last_accessed: new Date().toISOString(),
            meeting_title: meetingTitle || null,
            is_host: isHost 
          })
          .eq('id', existing.id);
      } else {
        // Insert new recent meeting
        await supabase
          .from('user_recent_meetings')
          .insert({
            user_id: user.id,
            meeting_id: meetingId,
            meeting_title: meetingTitle || `Meeting ${meetingId}`,
            is_host: isHost
          });
      }

      // Refresh the list
      fetchRecentMeetings();
    } catch (error) {
      console.error('Error adding recent meeting:', error);
    }
  }, [user, fetchRecentMeetings]);

  const removeRecentMeeting = useCallback(async (meetingId: string) => {
    if (!user) return;

    try {
      await supabase
        .from('user_recent_meetings')
        .delete()
        .eq('user_id', user.id)
        .eq('meeting_id', meetingId);

      // Refresh the list
      fetchRecentMeetings();
    } catch (error) {
      console.error('Error removing recent meeting:', error);
    }
  }, [user, fetchRecentMeetings]);

  useEffect(() => {
    fetchRecentMeetings();
  }, [fetchRecentMeetings]);

  return {
    recentMeetings,
    loading,
    fetchRecentMeetings,
    addRecentMeeting,
    removeRecentMeeting
  };
};