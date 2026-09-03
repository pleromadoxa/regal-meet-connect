import { format, isSameDay } from 'date-fns';
import { Calendar } from '@/components/ui/calendar';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import { CALENDAR_COLORS, formatEventTime, type CalendarFilters } from '@/lib/calendarUtils';
import type { CalendarEvent } from '@/hooks/useCalendarEvents';

interface CalendarSidebarProps {
  selectedDate: Date;
  onSelectDate: (date: Date) => void;
  events: CalendarEvent[];
  filters: CalendarFilters;
  onFiltersChange: (filters: CalendarFilters) => void;
  onEventClick?: (event: CalendarEvent) => void;
  className?: string;
}

export const CalendarSidebar = ({
  selectedDate,
  onSelectDate,
  events,
  filters,
  onFiltersChange,
  onEventClick,
  className,
}: CalendarSidebarProps) => {
  const todayEvents = events.filter((ev) => isSameDay(new Date(ev.start_time), selectedDate));
  const datesWithEvents = events.map((ev) => new Date(ev.start_time));

  const toggleColor = (colorId: string) => {
    const next = new Set(filters.colors);
    if (next.has(colorId)) next.delete(colorId);
    else next.add(colorId);
    onFiltersChange({ ...filters, colors: next });
  };

  return (
    <aside
      className={cn(
        'flex w-full shrink-0 flex-col gap-4 rounded-2xl border border-white/10 bg-[#0d0d0d]/80 p-4 backdrop-blur-sm lg:w-56 xl:w-64',
        className
      )}
    >
      <Calendar
        mode="single"
        selected={selectedDate}
        onSelect={(d) => d && onSelectDate(d)}
        modifiers={{ hasEvent: datesWithEvents }}
        modifiersClassNames={{
          hasEvent:
            'relative after:absolute after:bottom-0.5 after:left-1/2 after:h-1 after:w-1 after:-translate-x-1/2 after:rounded-full after:bg-orange-500',
        }}
        className="rounded-xl border border-white/[0.06] bg-black/20 p-0 text-white [--cell-size:2rem]"
        classNames={{
          day_selected: 'bg-orange-500 text-white hover:bg-orange-500',
          day_today: 'bg-white/10 text-white',
          head_cell: 'text-white/40',
          caption_label: 'text-white/80',
          nav_button: 'border-white/10 text-white/60 hover:bg-white/10',
          day: 'text-white/70 hover:bg-white/10',
          day_outside: 'text-white/20',
        }}
      />

      <div>
        <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-white/35">Show</p>
        <ul className="space-y-2">
          <li className="flex items-center justify-between text-sm text-white/60">
            <span>Regal Meetings</span>
            <Switch
              checked={filters.showMeetings}
              onCheckedChange={(showMeetings) => onFiltersChange({ ...filters, showMeetings })}
            />
          </li>
          <li className="flex items-center justify-between text-sm text-white/60">
            <span>Calendar events</span>
            <Switch
              checked={filters.showEvents}
              onCheckedChange={(showEvents) => onFiltersChange({ ...filters, showEvents })}
            />
          </li>
        </ul>
      </div>

      <div>
        <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-white/35">Calendars</p>
        <ul className="space-y-1.5">
          {CALENDAR_COLORS.map((cal) => (
            <li key={cal.id}>
              <button
                type="button"
                onClick={() => toggleColor(cal.id)}
                className={cn(
                  'flex w-full items-center gap-2 rounded-md px-1 py-1 text-sm transition-opacity',
                  filters.colors.has(cal.id) ? 'text-white/70 opacity-100' : 'text-white/30 opacity-50'
                )}
              >
                <span className={cn('h-2.5 w-2.5 rounded-sm', cal.dot)} />
                {cal.label}
              </button>
            </li>
          ))}
        </ul>
      </div>

      <div className="min-h-0 flex-1">
        <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-white/35">
          {format(selectedDate, 'EEEE, MMM d')}
        </p>
        {todayEvents.length === 0 ? (
          <p className="text-xs text-white/35">No events scheduled</p>
        ) : (
          <ul className="space-y-2 overflow-y-auto">
            {todayEvents.map((ev) => (
              <li key={ev.id}>
                <button
                  type="button"
                  onClick={() => onEventClick?.(ev)}
                  className="w-full rounded-lg border border-white/[0.06] bg-white/[0.03] px-2.5 py-2 text-left transition-colors hover:border-white/15"
                >
                  <p className="text-xs font-semibold text-white/85">{ev.title}</p>
                  <p className="text-[10px] text-white/40">{formatEventTime(ev)}</p>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </aside>
  );
};
