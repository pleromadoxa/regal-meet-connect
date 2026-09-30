import {
  addMonths,
  format,
  isSameDay,
  isSameMonth,
  subMonths,
} from 'date-fns';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { eventsForDay, monthGridDays } from '@/lib/calendarUtils';
import type { CalendarEvent } from '@/hooks/useCalendarEvents';

interface CalendarMonthViewProps {
  currentDate: Date;
  events: CalendarEvent[];
  onNavigateMonth: (direction: -1 | 1) => void;
  onSelectDate: (date: Date) => void;
  onEventClick?: (event: CalendarEvent) => void;
  isLiveMeeting?: (meetingId?: string) => boolean;
}

export const CalendarMonthView = ({
  currentDate,
  events,
  onNavigateMonth,
  onSelectDate,
  onEventClick,
  isLiveMeeting,
}: CalendarMonthViewProps) => {
  const today = new Date();
  const days = monthGridDays(currentDate);
  const weekdays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const weekdaysShort = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#0d0d0d]/80 backdrop-blur-sm">
      <div className="flex shrink-0 items-center justify-between gap-2 border-b border-white/[0.06] px-3 py-2.5 sm:px-4 sm:py-3">
        <div className="flex min-w-0 items-center gap-1 sm:gap-2">
          <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0 text-white/50 hover:text-white touch-target" onClick={() => onNavigateMonth(-1)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0 text-white/50 hover:text-white touch-target" onClick={() => onNavigateMonth(1)}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <h2 className="truncate text-sm font-semibold text-white sm:text-base">{format(currentDate, 'MMMM yyyy')}</h2>
        </div>
        <Button variant="outline" size="sm" className="shrink-0 border-white/10 bg-white/5 text-white/70" onClick={() => onSelectDate(today)}>
          Today
        </Button>
      </div>

      <div className="grid shrink-0 grid-cols-7 border-b border-white/[0.06]">
        {weekdays.map((d, i) => (
          <div key={d} className="px-0.5 py-1.5 text-center text-[10px] font-medium uppercase tracking-wider text-white/35 sm:px-1 sm:py-2">
            <span className="sm:hidden">{weekdaysShort[i]}</span>
            <span className="hidden sm:inline">{d}</span>
          </div>
        ))}
      </div>

      <div className="grid min-h-0 flex-1 auto-rows-fr grid-cols-7 overflow-y-auto overscroll-contain">
        {days.map((day) => {
          const dayEvents = eventsForDay(events, day);
          const isToday = isSameDay(day, today);
          const inMonth = isSameMonth(day, currentDate);
          const hasLive = dayEvents.some(
            (ev) => ev.source === 'meeting' && isLiveMeeting?.(ev.meeting_id)
          );

          return (
            <button
              key={day.toISOString()}
              type="button"
              onClick={() => onSelectDate(day)}
              className={cn(
                'flex min-h-[3.25rem] flex-col border-b border-r border-white/[0.04] p-1 text-left transition-colors hover:bg-white/[0.03] sm:min-h-[100px] sm:p-1.5',
                !inMonth && 'opacity-40',
                isToday && 'bg-orange-500/[0.06]',
                hasLive && 'bg-red-500/[0.05]'
              )}
            >
              <span
                className={cn(
                  'relative mb-0.5 flex h-6 w-6 items-center justify-center text-[11px] font-semibold sm:mb-1 sm:text-xs',
                  isToday && 'rounded-full bg-orange-500 text-white',
                  !isToday && 'text-white/70'
                )}
              >
                {format(day, 'd')}
                {hasLive && (
                  <span className="absolute -right-0.5 -top-0.5 h-1.5 w-1.5 animate-pulse rounded-full bg-red-400 shadow-[0_0_6px_rgba(248,113,113,0.8)]" />
                )}
              </span>
              <div className="hidden space-y-0.5 overflow-hidden sm:block">
                {dayEvents.slice(0, 3).map((ev) => {
                  const live = ev.source === 'meeting' && isLiveMeeting?.(ev.meeting_id);
                  return (
                    <span
                      key={ev.id}
                      role="button"
                      tabIndex={0}
                      onClick={(e) => {
                        e.stopPropagation();
                        onEventClick?.(ev);
                      }}
                      onKeyDown={(e) => e.key === 'Enter' && onEventClick?.(ev)}
                      className={cn(
                        'block truncate rounded px-1 py-0.5 text-[10px] font-medium',
                        live
                          ? 'bg-red-500/25 text-red-100 ring-1 ring-red-500/40'
                          : 'bg-orange-500/20 text-orange-200'
                      )}
                    >
                      {live ? `● ${ev.title}` : ev.title}
                    </span>
                  );
                })}
                {dayEvents.length > 3 && (
                  <span className="text-[9px] text-white/35">+{dayEvents.length - 3} more</span>
                )}
              </div>
              {dayEvents.length > 0 && (
                <div className="mt-auto flex justify-center gap-0.5 pt-0.5 sm:hidden">
                  {dayEvents.slice(0, 3).map((ev) => {
                    const live = ev.source === 'meeting' && isLiveMeeting?.(ev.meeting_id);
                    return (
                      <span
                        key={ev.id}
                        className={cn(
                          'h-1 w-1 rounded-full',
                          live ? 'animate-pulse bg-red-400' : 'bg-orange-400'
                        )}
                      />
                    );
                  })}
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export { addMonths, subMonths };
