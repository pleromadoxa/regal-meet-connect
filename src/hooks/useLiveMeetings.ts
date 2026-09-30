import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

/** Poll active Regal Meeting rooms for Live Pulse on the calendar grid. */
export const useLiveMeetings = (pollMs = 30_000) => {
  const { user } = useAuth();
  const [liveMeetingIds, setLiveMeetingIds] = useState<Set<string>>(new Set());

  const fetchLive = useCallback(async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from('meetings')
      .select('meeting_id')
      .eq('is_active', true);

    if (error) {
      console.error('Live meetings fetch error:', error);
      return;
    }

    setLiveMeetingIds(new Set((data ?? []).map((m) => m.meeting_id.toUpperCase())));
  }, [user]);

  useEffect(() => {
    if (!user) return;
    void fetchLive();
    const id = window.setInterval(fetchLive, pollMs);
    return () => window.clearInterval(id);
  }, [user, fetchLive, pollMs]);

  const isLive = useCallback(
    (meetingId?: string) => {
      if (!meetingId) return false;
      return liveMeetingIds.has(meetingId.toUpperCase());
    },
    [liveMeetingIds]
  );

  return { liveMeetingIds, isLive, refetch: fetchLive };
};
