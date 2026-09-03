import type { CalendarEvent } from '@/hooks/useCalendarEvents';

export interface CalendarConflict {
  event: CalendarEvent;
  overlapMinutes: number;
}

function overlapMs(aStart: number, aEnd: number, bStart: number, bEnd: number) {
  const start = Math.max(aStart, bStart);
  const end = Math.min(aEnd, bEnd);
  return Math.max(0, end - start);
}

/** Find events that overlap with a proposed time range. */
export function findConflicts(
  events: CalendarEvent[],
  startTime: Date,
  endTime: Date,
  excludeEventId?: string
): CalendarConflict[] {
  const start = startTime.getTime();
  const end = endTime.getTime();
  if (end <= start) return [];

  const conflicts: CalendarConflict[] = [];

  for (const ev of events) {
    if (excludeEventId && (ev.id === excludeEventId || ev.id.startsWith(`${excludeEventId}__`))) continue;
    const evStart = new Date(ev.start_time).getTime();
    const evEnd = new Date(ev.end_time).getTime();
    const ms = overlapMs(start, end, evStart, evEnd);
    if (ms > 0) {
      conflicts.push({ event: ev, overlapMinutes: Math.round(ms / 60_000) });
    }
  }

  return conflicts.sort((a, b) => b.overlapMinutes - a.overlapMinutes);
}

export function hasHardConflict(conflicts: CalendarConflict[]) {
  return conflicts.some((c) => c.overlapMinutes >= 5);
}
