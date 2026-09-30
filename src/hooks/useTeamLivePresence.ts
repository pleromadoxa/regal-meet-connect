import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export interface TeamLiveMember {
  member_email: string;
  member_name: string;
  meeting_code: string;
  meeting_title: string;
  is_host: boolean;
  participant_count: number;
}

/** Teammates currently in live Regal Meetings (team calendar roster). */
export const useTeamLivePresence = (pollMs = 30_000) => {
  const { user } = useAuth();
  const [presence, setPresence] = useState<TeamLiveMember[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchPresence = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('get_team_live_presence');
      if (error) {
        if (error.code === '42883' || error.message.includes('does not exist')) {
          setPresence([]);
          return;
        }
        throw error;
      }
      setPresence((data ?? []) as TeamLiveMember[]);
    } catch (err) {
      console.error('Team live presence error:', err);
      setPresence([]);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!user) return;
    void fetchPresence();
    const id = window.setInterval(fetchPresence, pollMs);
    return () => window.clearInterval(id);
  }, [user, fetchPresence, pollMs]);

  const liveMeetings = presence.reduce<Map<string, { title: string; code: string; count: number; members: TeamLiveMember[] }>>(
    (acc, row) => {
      const key = row.meeting_code;
      const existing = acc.get(key);
      if (existing) {
        existing.members.push(row);
        existing.count = row.participant_count;
      } else {
        acc.set(key, {
          title: row.meeting_title,
          code: row.meeting_code,
          count: row.participant_count,
          members: [row],
        });
      }
      return acc;
    },
    new Map()
  );

  return {
    presence,
    liveMeetings: Array.from(liveMeetings.values()),
    loading,
    refetch: fetchPresence,
  };
};
