import {
  addDays,
  addWeeks,
  format,
  isSameDay,
  isSameMonth,
  startOfWeek,
  subWeeks,
} from 'date-fns';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { CalendarEventChip } from '@/components/calendar/CalendarEventChip';
import { eventPosition, eventsForDay, HOURS } from '@/lib/calendarUtils';
import type { CalendarEvent } from '@/hooks/useCalendarEvents';

interface CalendarWeekViewProps {
  currentDate: Date;
  events: CalendarEvent[];
  onNavigateWeek: (direction: -1 | 1) => void;
  onSelectDate: (date: Date) => void;
  onEventClick?: (event: CalendarEvent) => void;
  onSlotClick?: (date: Date, hour: number) => void;
  isLiveMeeting?: (meetingId?: string) => boolean;
}

export const CalendarWeekView = ({
  currentDate,
  events,
  onNavigateWeek,
  onSelectDate,
  onEventClick,
  onSlotClick,
  isLiveMeeting,
}: CalendarWeekViewProps) => {
  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const today = new Date();

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#0d0d0d]/80 backdrop-blur-sm">
      <div className="flex shrink-0 items-center justify-between gap-2 border-b border-white/[0.06] px-3 py-2.5 sm:px-4 sm:py-3">
        <div className="flex min-w-0 items-center gap-1 sm:gap-2">
          <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0 text-white/50 hover:text-white touch-target" onClick={() => onNavigateWeek(-1)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0 text-white/50 hover:text-white touch-target" onClick={() => onNavigateWeek(1)}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <h2 className="truncate text-sm font-semibold text-white sm:text-base">{format(weekStart, 'MMMM yyyy')}</h2>
        </div>
        <Button variant="outline" size="sm" className="shrink-0 border-white/10 bg-white/5 text-white/70 hover:bg-white/10 hover:text-white" onClick={() => onSelectDate(today)}>
          Today
        </Button>
      </div>

      <div className="min-h-0 flex-1 overflow-x-auto overflow-y-auto overscroll-contain [-webkit-overflow-scrolling:touch]">
        <div className="min-w-[560px] sm:min-w-[720px]">
          <div className="sticky top-0 z-10 grid grid-cols-[48px_repeat(7,1fr)] border-b border-white/[0.06] bg-[#0d0d0d]/95 backdrop-blur-sm sm:grid-cols-[56px_repeat(7,1fr)]">
            <div />
            {days.map((day) => {
              const isToday = isSameDay(day, today);
              const isCurrentMonth = isSameMonth(day, currentDate);
              return (
                <button
                  key={day.toISOString()}
                  type="button"
                  onClick={() => onSelectDate(day)}
                  className={cn(
                    'border-r border-white/[0.04] px-0.5 py-2 text-center last:border-r-0 transition-colors hover:bg-white/[0.03] sm:px-1',
                    isToday && 'bg-orange-500/[0.06]'
                  )}
                >
                  <p className="text-[10px] font-medium uppercase tracking-wider text-white/35">{format(day, 'EEE')}</p>
                  <p
                    className={cn(
                      'mx-auto mt-0.5 flex h-7 w-7 items-center justify-center text-sm font-bold',
                      isToday && 'rounded-full bg-orange-500 text-white',
                      !isToday && isCurrentMonth && 'text-white/75',
                      !isToday && !isCurrentMonth && 'text-white/30'
                    )}
                  >
                    {format(day, 'd')}
                  </p>
                </button>
              );
            })}
          </div>

          <div className="relative">
            <div className="grid grid-cols-[48px_repeat(7,1fr)] sm:grid-cols-[56px_repeat(7,1fr)]">
          <div className="border-r border-white/[0.06]">
            {HOURS.map((h) => (
              <div key={h} className="relative h-14 border-b border-white/[0.04] pr-1.5 text-right text-[10px] text-white/25 sm:pr-2">
                <span className="absolute -top-2 right-1.5 sm:right-2">{format(new Date().setHours(h, 0), 'h a')}</span>
              </div>
            ))}
          </div>

          {days.map((day) => {
            const dayEvents = eventsForDay(events, day);
            const isToday = isSameDay(day, today);

            return (
              <div key={day.toISOString()} className={cn('relative border-r border-white/[0.04] last:border-r-0', isToday && 'bg-orange-500/[0.03]')}>
                {HOURS.map((h) => (
                  <button
                    key={h}
                    type="button"
                    className="block h-14 w-full border-b border-white/[0.04] transition-colors hover:bg-white/[0.03]"
                    onClick={() => onSlotClick?.(day, h)}
                    aria-label={`Create event on ${format(day, 'MMM d')} at ${h}:00`}
                  />
                ))}

                {dayEvents.map((ev) => {
                  const pos = eventPosition(ev, day);
                  return (
                    <CalendarEventChip
                      key={ev.id}
                      event={ev}
                      onClick={onEventClick}
                      isLive={isLiveMeeting?.(ev.meeting_id)}
                      className="absolute left-0.5 right-0.5"
                      style={{ top: pos.top, height: pos.height, minHeight: '20px' }}
                    />
                  );
                })}
              </div>
            );
          })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export { addWeeks, subWeeks };
