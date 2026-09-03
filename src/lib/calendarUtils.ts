import { addDays, format, isSameDay, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval } from 'date-fns';
import type { CalendarEvent } from '@/hooks/useCalendarEvents';

export type CalendarView = 'week' | 'day' | 'month';

export const CALENDAR_COLORS = [
  { id: 'orange', label: 'Work', dot: 'bg-orange-500' },
  { id: 'blue', label: 'Personal', dot: 'bg-blue-500' },
  { id: 'purple', label: 'Team', dot: 'bg-purple-500' },
  { id: 'emerald', label: 'Other', dot: 'bg-emerald-500' },
] as const;

export const EVENT_COLOR_CLASS: Record<string, string> = {
  orange: 'bg-orange-500/25 border-orange-500/45 text-orange-100',
  blue: 'bg-blue-500/25 border-blue-500/45 text-blue-100',
  purple: 'bg-purple-500/25 border-purple-500/45 text-purple-100',
  emerald: 'bg-emerald-500/20 border-emerald-500/40 text-emerald-100',
};

export const HOUR_START = 7;
export const HOUR_END = 20;
export const HOURS = Array.from({ length: HOUR_END - HOUR_START + 1 }, (_, i) => HOUR_START + i);

export interface CalendarFilters {
  showMeetings: boolean;
  showEvents: boolean;
  colors: Set<string>;
}

export const DEFAULT_CALENDAR_FILTERS: CalendarFilters = {
  showMeetings: true,
  showEvents: true,
  colors: new Set(CALENDAR_COLORS.map((c) => c.id)),
};

export function filterCalendarEvents(events: CalendarEvent[], filters: CalendarFilters): CalendarEvent[] {
  return events.filter((ev) => {
    if (ev.source === 'meeting' && !filters.showMeetings) return false;
    if (ev.source !== 'meeting' && !filters.showEvents) return false;
    if (!filters.colors.has(ev.color)) return false;
    return true;
  });
}

export function eventPosition(ev: CalendarEvent, dayStart: Date) {
  const start = new Date(ev.start_time);
  const end = new Date(ev.end_time);
  const dayEnd = addDays(dayStart, 1);

  const clampedStart = start < dayStart ? dayStart : start;
  const clampedEnd = end > dayEnd ? dayEnd : end;

  const startMinutes = clampedStart.getHours() * 60 + clampedStart.getMinutes();
  const endMinutes = clampedEnd.getHours() * 60 + clampedEnd.getMinutes();
  const dayMinutes = (HOUR_END - HOUR_START + 1) * 60;

  const top = ((startMinutes - HOUR_START * 60) / dayMinutes) * 100;
  const height = Math.max(((endMinutes - startMinutes) / dayMinutes) * 100, 4);

  return { top: `${Math.max(top, 0)}%`, height: `${height}%` };
}

export function eventsForDay(events: CalendarEvent[], day: Date) {
  return events.filter((ev) => isSameDay(new Date(ev.start_time), day));
}

export function monthGridDays(date: Date) {
  const start = startOfWeek(startOfMonth(date), { weekStartsOn: 1 });
  const end = endOfWeek(endOfMonth(date), { weekStartsOn: 1 });
  return eachDayOfInterval({ start, end });
}

export function userTimezone() {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}

export function formatEventTime(ev: CalendarEvent) {
  if (ev.is_all_day) return 'All day';
  return `${format(new Date(ev.start_time), 'h:mm a')} – ${format(new Date(ev.end_time), 'h:mm a')}`;
}

export function slotFromClick(hour: number, minute = 0): { start: string; end: string } {
  const startH = String(hour).padStart(2, '0');
  const startM = String(minute).padStart(2, '0');
  const endHour = hour + 1;
  const endH = String(endHour).padStart(2, '0');
  return { start: `${startH}:${startM}`, end: `${endH}:${startM}` };
}
