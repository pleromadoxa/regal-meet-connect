import { format } from 'date-fns';
import type { CalendarEvent } from '@/hooks/useCalendarEvents';

function icsDate(d: Date, allDay: boolean) {
  if (allDay) return format(d, 'yyyyMMdd');
  return format(d, "yyyyMMdd'T'HHmmss'Z'");
}

function escapeIcs(text: string) {
  return text.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');
}

/** Generate ICS file content for calendar export. */
export function generateIcs(events: CalendarEvent[], calendarName = 'Regal Calendar'): string {
  const now = format(new Date(), "yyyyMMdd'T'HHmmss'Z'");
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Spatial Regal//Regal Calendar//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${escapeIcs(calendarName)}`,
  ];

  for (const ev of events) {
    if (ev.source === 'meeting' && ev.id.includes('__')) continue;
    const start = new Date(ev.start_time);
    const end = new Date(ev.end_time);
    lines.push(
      'BEGIN:VEVENT',
      `UID:${ev.id}@regalmesh.com`,
      `DTSTAMP:${now}`,
      ev.is_all_day
        ? `DTSTART;VALUE=DATE:${icsDate(start, true)}`
        : `DTSTART:${icsDate(start, false)}`,
      ev.is_all_day
        ? `DTEND;VALUE=DATE:${icsDate(end, true)}`
        : `DTEND:${icsDate(end, false)}`,
      `SUMMARY:${escapeIcs(ev.title)}`,
    );
    if (ev.description) lines.push(`DESCRIPTION:${escapeIcs(ev.description)}`);
    if (ev.location) lines.push(`LOCATION:${escapeIcs(ev.location)}`);
    lines.push('END:VEVENT');
  }

  lines.push('END:VCALENDAR');
  return lines.join('\r\n');
}

export function downloadIcs(events: CalendarEvent[], filename = 'regal-calendar.ics') {
  const content = generateIcs(events);
  const blob = new Blob([content], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
