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
}

export const CalendarMonthView = ({
  currentDate,
  events,
  onNavigateMonth,
  onSelectDate,
  onEventClick,
}: CalendarMonthViewProps) => {
  const today = new Date();
  const days = monthGridDays(currentDate);
  const weekdays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#0d0d0d]/80 backdrop-blur-sm">
      <div className="flex items-center justify-between border-b border-white/[0.06] px-4 py-3">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="h-8 w-8 text-white/50 hover:text-white" onClick={() => onNavigateMonth(-1)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8 text-white/50 hover:text-white" onClick={() => onNavigateMonth(1)}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <h2 className="text-sm font-semibold text-white sm:text-base">{format(currentDate, 'MMMM yyyy')}</h2>
        </div>
        <Button variant="outline" size="sm" className="border-white/10 bg-white/5 text-white/70" onClick={() => onSelectDate(today)}>
          Today
        </Button>
      </div>

      <div className="grid grid-cols-7 border-b border-white/[0.06]">
        {weekdays.map((d) => (
          <div key={d} className="px-1 py-2 text-center text-[10px] font-medium uppercase tracking-wider text-white/35">
            {d}
          </div>
        ))}
      </div>

      <div className="grid min-h-0 flex-1 auto-rows-fr grid-cols-7 overflow-y-auto">
        {days.map((day) => {
          const dayEvents = eventsForDay(events, day);
          const isToday = isSameDay(day, today);
          const inMonth = isSameMonth(day, currentDate);

          return (
            <button
              key={day.toISOString()}
              type="button"
              onClick={() => onSelectDate(day)}
              className={cn(
                'flex min-h-[80px] flex-col border-b border-r border-white/[0.04] p-1.5 text-left transition-colors hover:bg-white/[0.03] sm:min-h-[100px]',
                !inMonth && 'opacity-40',
                isToday && 'bg-orange-500/[0.06]'
              )}
            >
              <span
                className={cn(
                  'mb-1 flex h-6 w-6 items-center justify-center text-xs font-semibold',
                  isToday && 'rounded-full bg-orange-500 text-white',
                  !isToday && 'text-white/70'
                )}
              >
                {format(day, 'd')}
              </span>
              <div className="space-y-0.5 overflow-hidden">
                {dayEvents.slice(0, 3).map((ev) => (
                  <span
                    key={ev.id}
                    role="button"
                    tabIndex={0}
                    onClick={(e) => {
                      e.stopPropagation();
                      onEventClick?.(ev);
                    }}
                    onKeyDown={(e) => e.key === 'Enter' && onEventClick?.(ev)}
                    className="block truncate rounded px-1 py-0.5 text-[9px] font-medium bg-orange-500/20 text-orange-200 sm:text-[10px]"
                  >
                    {ev.title}
                  </span>
                ))}
                {dayEvents.length > 3 && (
                  <span className="text-[9px] text-white/35">+{dayEvents.length - 3} more</span>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export { addMonths, subMonths };
