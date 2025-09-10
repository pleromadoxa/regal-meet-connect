import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export const useRecentMeetings = () => {
  const { user } = useAuth();

  const addRecentMeeting = useCallback(async (
    meetingId: string, 
    meetingTitle: string | null, 
    isHost: boolean = false
  ) => {
    if (!user) return;

    try {
      // Check if the meeting already exists in recent meetings
      const { data: existing } = await supabase
        .from('user_recent_meetings')
        .select('id')
        .eq('user_id', user.id)
        .eq('meeting_id', meetingId)
        .single();

      if (existing) {
        // Update existing record with new timestamp
        await supabase
          .from('user_recent_meetings')
          .update({ 
            last_accessed: new Date().toISOString(),
            meeting_title: meetingTitle,
            is_host: isHost
          })
          .eq('id', existing.id);
      } else {
        // Create new record
        await supabase
          .from('user_recent_meetings')
          .insert({
            user_id: user.id,
            meeting_id: meetingId,
            meeting_title: meetingTitle,
            is_host: isHost,
            joined_at: new Date().toISOString(),
            last_accessed: new Date().toISOString()
          });
      }

      // Clean up old records (keep only last 10)
      const { data: allRecords } = await supabase
        .from('user_recent_meetings')
        .select('id')
        .eq('user_id', user.id)
        .order('last_accessed', { ascending: false });

      if (allRecords && allRecords.length > 10) {
        const recordsToDelete = allRecords.slice(10);
        const idsToDelete = recordsToDelete.map(record => record.id);
        
        await supabase
          .from('user_recent_meetings')
          .delete()
          .in('id', idsToDelete);
      }
    } catch (error) {
      console.error('Error adding recent meeting:', error);
    }
  }, [user]);

  return {
    addRecentMeeting
  };
};
