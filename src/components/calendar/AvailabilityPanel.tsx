import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { getDayAvailability, type WorkHours } from '@/lib/calendarAvailability';
import type { CalendarEvent } from '@/hooks/useCalendarEvents';

interface AvailabilityPanelProps {
  date: Date;
  events: CalendarEvent[];
  workHours: WorkHours;
  onSelectSlot: (start: Date, end: Date) => void;
}

export const AvailabilityPanel = ({ date, events, workHours, onSelectSlot }: AvailabilityPanelProps) => {
  const slots = getDayAvailability(date, events, workHours);
  const available = slots.filter((s) => s.available);

  return (
    <div className="space-y-4">
      <div>
        <p className="text-sm font-medium text-white/80">Find open slots</p>
        <p className="text-xs text-white/40">
          {format(date, 'EEEE, MMMM d')} · {workHours.workStart}–{workHours.workEnd}
        </p>
      </div>

      {available.length === 0 ? (
        <p className="rounded-lg border border-white/10 bg-white/[0.03] p-4 text-sm text-white/45">
          No open slots on this day within your working hours.
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          {available.map((slot) => (
            <button
              key={slot.start.toISOString()}
              type="button"
              onClick={() => onSelectSlot(slot.start, slot.end)}
              className={cn(
                'rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-left text-sm',
                'text-emerald-200 transition-colors hover:bg-emerald-500/20'
              )}
            >
              {slot.label}
              <span className="block text-[10px] text-emerald-400/70">Available</span>
            </button>
          ))}
        </div>
      )}

      <div>
        <p className="mb-2 text-xs font-bold uppercase tracking-widest text-white/35">Full day</p>
        <div className="space-y-1">
          {slots.map((slot) => (
            <div
              key={slot.start.toISOString()}
              className={cn(
                'flex items-center justify-between rounded px-2 py-1 text-xs',
                slot.available ? 'text-emerald-400/80' : 'text-white/30'
              )}
            >
              <span>{slot.label}</span>
              <span>{slot.available ? 'Free' : 'Busy'}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
