import { addMinutes, format, getDay, setHours, setMinutes } from 'date-fns';
import type { CalendarEvent } from '@/hooks/useCalendarEvents';
import { HOUR_START, HOUR_END } from '@/lib/calendarUtils';

export interface WorkHours {
  workStart: string; // "09:00"
  workEnd: string;   // "17:00"
  workDays: number[]; // 0=Sun .. 6=Sat
}

export const DEFAULT_WORK_HOURS: WorkHours = {
  workStart: '09:00',
  workEnd: '17:00',
  workDays: [1, 2, 3, 4, 5],
};

export interface TimeSlot {
  start: Date;
  end: Date;
  available: boolean;
  label: string;
}

function parseTimeOnDate(date: Date, time: string): Date {
  const [h, m] = time.split(':').map(Number);
  return setMinutes(setHours(date, h), m);
}

function isWithinWorkHours(date: Date, hours: WorkHours) {
  if (!hours.workDays.includes(getDay(date))) return false;
  const start = parseTimeOnDate(date, hours.workStart);
  const end = parseTimeOnDate(date, hours.workEnd);
  return date >= start && date < end;
}

function slotOverlapsEvent(slotStart: Date, slotEnd: Date, events: CalendarEvent[]) {
  const s = slotStart.getTime();
  const e = slotEnd.getTime();
  return events.some((ev) => {
    const evS = new Date(ev.start_time).getTime();
    const evE = new Date(ev.end_time).getTime();
    return s < evE && e > evS;
  });
}

/** Generate hourly availability slots for a day. */
export function getDayAvailability(
  date: Date,
  events: CalendarEvent[],
  hours: WorkHours = DEFAULT_WORK_HOURS,
  slotMinutes = 60
): TimeSlot[] {
  const dayEvents = events.filter(
    (ev) => new Date(ev.start_time).toDateString() === date.toDateString()
  );
  const slots: TimeSlot[] = [];

  for (let h = HOUR_START; h < HOUR_END; h++) {
    const start = setMinutes(setHours(date, h), 0);
    const end = addMinutes(start, slotMinutes);
    const inWorkHours = isWithinWorkHours(start, hours);
    const busy = slotOverlapsEvent(start, end, dayEvents);
    slots.push({
      start,
      end,
      available: inWorkHours && !busy,
      label: format(start, 'h:mm a'),
    });
  }

  return slots;
}

/** Find next N available slots across upcoming days. */
export function findOpenSlots(
  fromDate: Date,
  events: CalendarEvent[],
  hours: WorkHours,
  count = 5,
  daysAhead = 14
): TimeSlot[] {
  const open: TimeSlot[] = [];
  for (let d = 0; d < daysAhead && open.length < count; d++) {
    const day = new Date(fromDate);
    day.setDate(day.getDate() + d);
    const slots = getDayAvailability(day, events, hours);
    for (const slot of slots) {
      if (slot.available && slot.start > new Date()) {
        open.push(slot);
        if (open.length >= count) break;
      }
    }
  }
  return open;
}
