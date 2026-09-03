import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { DEFAULT_WORK_HOURS, type WorkHours } from '@/lib/calendarAvailability';
import { userTimezone } from '@/lib/calendarUtils';

export interface CalendarPreferences {
  user_id: string;
  timezone: string;
  work_start: string;
  work_end: string;
  work_days: number[];
  default_reminder_minutes: number;
}

const PREFS_KEY = 'regal-calendar-prefs';

function defaultPrefs(userId: string): CalendarPreferences {
  return {
    user_id: userId,
    timezone: userTimezone(),
    work_start: DEFAULT_WORK_HOURS.workStart,
    work_end: DEFAULT_WORK_HOURS.workEnd,
    work_days: DEFAULT_WORK_HOURS.workDays,
    default_reminder_minutes: 15,
  };
}

export function prefsToWorkHours(prefs: CalendarPreferences): WorkHours {
  return {
    workStart: prefs.work_start.slice(0, 5),
    workEnd: prefs.work_end.slice(0, 5),
    workDays: prefs.work_days,
  };
}

export const useCalendarPreferences = () => {
  const { user } = useAuth();
  const [prefs, setPrefs] = useState<CalendarPreferences | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchPrefs = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('calendar_user_preferences')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) {
        if (error.code === '42P01' || error.message.includes('does not exist')) {
          const local = localStorage.getItem(`${PREFS_KEY}:${user.id}`);
          setPrefs(local ? JSON.parse(local) : defaultPrefs(user.id));
          return;
        }
        throw error;
      }
      setPrefs(data ?? defaultPrefs(user.id));
    } catch {
      const local = localStorage.getItem(`${PREFS_KEY}:${user.id}`);
      setPrefs(local ? JSON.parse(local) : defaultPrefs(user.id));
    } finally {
      setLoading(false);
    }
  }, [user]);

  const savePrefs = async (updates: Partial<CalendarPreferences>) => {
    if (!user || !prefs) return;
    const merged = { ...prefs, ...updates, user_id: user.id };

    try {
      const { data, error } = await supabase
        .from('calendar_user_preferences')
        .upsert(merged)
        .select()
        .single();

      if (error) {
        if (error.code === '42P01') {
          localStorage.setItem(`${PREFS_KEY}:${user.id}`, JSON.stringify(merged));
          setPrefs(merged);
          return merged;
        }
        throw error;
      }
      setPrefs(data);
      return data;
    } catch {
      localStorage.setItem(`${PREFS_KEY}:${user.id}`, JSON.stringify(merged));
      setPrefs(merged);
      return merged;
    }
  };

  useEffect(() => {
    if (user) fetchPrefs();
  }, [user, fetchPrefs]);

  return { prefs, loading, savePrefs, workHours: prefs ? prefsToWorkHours(prefs) : DEFAULT_WORK_HOURS };
};
