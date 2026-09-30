import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

/** Realtime sync for calendar events and scheduled meetings. */
export const useCalendarRealtime = (onChange: () => void) => {
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel(`regal-calendar-${user.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'calendar_events', filter: `user_id=eq.${user.id}` },
        () => onChange()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'scheduled_meetings', filter: `host_id=eq.${user.id}` },
        () => onChange()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'meeting_invitations' },
        () => onChange()
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [user, onChange]);
};
