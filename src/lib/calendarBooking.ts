import { supabase } from '@/integrations/supabase/client';
import type { WorkHours } from '@/lib/calendarAvailability';

export interface BusyPeriod {
  start_time: string;
  end_time: string;
}

export async function fetchSchedulingBusyTimes(
  slug: string,
  from = new Date(),
  to = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000)
): Promise<BusyPeriod[]> {
  const { data, error } = await supabase.rpc('get_scheduling_busy_times', {
    p_slug: slug,
    p_from: from.toISOString(),
    p_to: to.toISOString(),
  });
  if (error) throw error;
  return (data ?? []) as BusyPeriod[];
}

export async function fetchSchedulingWorkHours(slug: string): Promise<WorkHours> {
  const { data, error } = await supabase.rpc('get_scheduling_work_hours', { p_slug: slug });
  if (error) throw error;
  const row = Array.isArray(data) ? data[0] : data;
  if (!row) {
    return { workStart: '09:00', workEnd: '17:00', workDays: [1, 2, 3, 4, 5] };
  }
  const wh = row as { work_start: string; work_end: string; work_days: number[] };
  return {
    workStart: wh.work_start.slice(0, 5),
    workEnd: wh.work_end.slice(0, 5),
    workDays: wh.work_days,
  };
}

export async function bookSchedulingSlot(
  slug: string,
  guestName: string,
  guestEmail: string,
  startTime: Date
): Promise<string> {
  const { data, error } = await supabase.rpc('book_scheduling_slot', {
    p_slug: slug,
    p_guest_name: guestName.trim(),
    p_guest_email: guestEmail.trim().toLowerCase(),
    p_start_time: startTime.toISOString(),
  });
  if (error) throw error;
  return data as string;
}
