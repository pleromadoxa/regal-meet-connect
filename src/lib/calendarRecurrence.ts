import { addDays, addMonths, addWeeks, isBefore, isAfter, startOfDay } from 'date-fns';
import type { CalendarEvent } from '@/hooks/useCalendarEvents';

export type RecurrencePattern = 'daily' | 'weekly' | 'monthly';

const MAX_OCCURRENCES = 100;
const EXPAND_HORIZON_DAYS = 120;

function nextOccurrence(date: Date, pattern: RecurrencePattern): Date {
  switch (pattern) {
    case 'daily':
      return addDays(date, 1);
    case 'weekly':
      return addWeeks(date, 1);
    case 'monthly':
      return addMonths(date, 1);
  }
}

/** Expand recurring events into individual occurrences for display. */
export function expandRecurringEvents(events: CalendarEvent[]): CalendarEvent[] {
  const horizon = addDays(new Date(), EXPAND_HORIZON_DAYS);
  const expanded: CalendarEvent[] = [];

  for (const ev of events) {
    if (!ev.recurrence_pattern || ev.source === 'meeting') {
      expanded.push(ev);
      continue;
    }

    const pattern = ev.recurrence_pattern as RecurrencePattern;
    const endLimit = ev.recurrence_end_date ? new Date(ev.recurrence_end_date) : horizon;
    const limit = isBefore(endLimit, horizon) ? endLimit : horizon;

    let cursor = new Date(ev.start_time);
    let endCursor = new Date(ev.end_time);
    const duration = endCursor.getTime() - cursor.getTime();
    let count = 0;

    while (count < MAX_OCCURRENCES && !isAfter(cursor, limit)) {
      if (!isBefore(endCursor, startOfDay(new Date()))) {
        expanded.push({
          ...ev,
          id: `${ev.id}__${cursor.toISOString()}`,
          start_time: cursor.toISOString(),
          end_time: endCursor.toISOString(),
        });
      }
      cursor = nextOccurrence(cursor, pattern);
      endCursor = new Date(cursor.getTime() + duration);
      count++;
    }
  }

  return expanded.sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());
}

export const RECURRENCE_OPTIONS: { value: RecurrencePattern; label: string }[] = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
];
