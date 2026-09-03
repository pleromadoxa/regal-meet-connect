import { format } from 'date-fns';
import { CalendarPlus, Clock, Globe2, Video } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { formatEventTime, userTimezone } from '@/lib/calendarUtils';
import type { CalendarEvent } from '@/hooks/useCalendarEvents';

interface CalendarRightPanelProps {
  upcomingEvents: CalendarEvent[];
  onEventClick: (event: CalendarEvent) => void;
  onNewEvent: () => void;
  onScheduleMeet: () => void;
  className?: string;
}

export const CalendarRightPanel = ({
  upcomingEvents,
  onEventClick,
  onNewEvent,
  onScheduleMeet,
  className,
}: CalendarRightPanelProps) => (
  <aside
    className={cn(
      'flex w-full shrink-0 flex-col gap-4 rounded-2xl border border-white/10 bg-[#0d0d0d]/80 p-4 backdrop-blur-sm xl:w-64',
      className
    )}
  >
    <div className="space-y-2">
      <p className="text-[10px] font-bold uppercase tracking-widest text-white/35">Quick actions</p>
      <Button variant="premium" size="sm" className="w-full justify-start" onClick={onScheduleMeet}>
        <Video className="mr-2 h-4 w-4" />
        + Meet
      </Button>
      <Button variant="outline" size="sm" className="w-full justify-start border-white/10 bg-white/5 text-white/70" onClick={onNewEvent}>
        <CalendarPlus className="mr-2 h-4 w-4" />
        New event
      </Button>
    </div>

    <div className="rounded-xl border border-white/[0.06] bg-black/20 p-3">
      <div className="flex items-center gap-2 text-xs text-white/45">
        <Globe2 className="h-3.5 w-3.5 text-orange-400" />
        {userTimezone()}
      </div>
    </div>

    <div className="min-h-0 flex-1">
      <p className="mb-2 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-white/35">
        <Clock className="h-3 w-3" />
        Upcoming
      </p>
      {upcomingEvents.length === 0 ? (
        <p className="text-xs text-white/35">Nothing scheduled — enjoy the focus time.</p>
      ) : (
        <ul className="space-y-2">
          {upcomingEvents.map((ev) => (
            <li key={ev.id}>
              <button
                type="button"
                onClick={() => onEventClick(ev)}
                className="w-full rounded-lg border border-white/[0.06] bg-white/[0.03] px-2.5 py-2 text-left transition-colors hover:border-white/15 hover:bg-white/[0.05]"
              >
                <p className="truncate text-xs font-semibold text-white/85">{ev.title}</p>
                <p className="text-[10px] text-white/40">
                  {format(new Date(ev.start_time), 'EEE, MMM d')} · {formatEventTime(ev)}
                </p>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  </aside>
);
