import { addDays, format, isSameDay } from 'date-fns';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { CalendarEventChip } from '@/components/calendar/CalendarEventChip';
import { eventPosition, eventsForDay, HOURS, HOUR_START } from '@/lib/calendarUtils';
import type { CalendarEvent } from '@/hooks/useCalendarEvents';

interface CalendarDayViewProps {
  currentDate: Date;
  events: CalendarEvent[];
  onNavigateDay: (direction: -1 | 1) => void;
  onSelectDate: (date: Date) => void;
  onEventClick?: (event: CalendarEvent) => void;
  onSlotClick?: (date: Date, hour: number) => void;
}

export const CalendarDayView = ({
  currentDate,
  events,
  onNavigateDay,
  onSelectDate,
  onEventClick,
  onSlotClick,
}: CalendarDayViewProps) => {
  const today = new Date();
  const isToday = isSameDay(currentDate, today);
  const dayEvents = eventsForDay(events, currentDate);

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#0d0d0d]/80 backdrop-blur-sm">
      <div className="flex items-center justify-between border-b border-white/[0.06] px-4 py-3">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="h-8 w-8 text-white/50 hover:text-white" onClick={() => onNavigateDay(-1)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8 text-white/50 hover:text-white" onClick={() => onNavigateDay(1)}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <h2 className="text-sm font-semibold text-white sm:text-base">{format(currentDate, 'EEEE, MMMM d')}</h2>
        </div>
        <Button variant="outline" size="sm" className="border-white/10 bg-white/5 text-white/70" onClick={() => onSelectDate(today)}>
          Today
        </Button>
      </div>

      <div className={cn('border-b border-white/[0.06] px-4 py-2 text-center', isToday && 'bg-orange-500/[0.06]')}>
        <p className={cn('text-2xl font-bold', isToday ? 'text-orange-400' : 'text-white/80')}>{format(currentDate, 'd')}</p>
        <p className="text-xs text-white/40">{dayEvents.length} event{dayEvents.length !== 1 ? 's' : ''}</p>
      </div>

      <div className="relative min-h-0 flex-1 overflow-y-auto">
        <div className="grid grid-cols-[56px_1fr]">
          <div className="border-r border-white/[0.06]">
            {HOURS.map((h) => (
              <div key={h} className="relative h-16 border-b border-white/[0.04] pr-2 text-right text-[10px] text-white/25">
                <span className="absolute -top-2 right-2">{format(new Date().setHours(h, 0), 'h a')}</span>
              </div>
            ))}
          </div>
          <div className={cn('relative', isToday && 'bg-orange-500/[0.02]')}>
            {HOURS.map((h) => (
              <button
                key={h}
                type="button"
                className="block h-16 w-full border-b border-white/[0.04] transition-colors hover:bg-white/[0.03]"
                onClick={() => onSlotClick?.(currentDate, h)}
                aria-label={`Create event at ${h}:00`}
              />
            ))}
            {dayEvents.map((ev) => {
              const pos = eventPosition(ev, currentDate);
              return (
                <CalendarEventChip
                  key={ev.id}
                  event={ev}
                  onClick={onEventClick}
                  className="absolute left-1 right-1"
                  style={{ top: pos.top, height: pos.height, minHeight: '24px' }}
                />
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export { addDays };
