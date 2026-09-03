import { cn } from '@/lib/utils';
import type { CalendarView } from '@/lib/calendarUtils';

const VIEWS: { id: CalendarView; label: string }[] = [
  { id: 'day', label: 'Day' },
  { id: 'week', label: 'Week' },
  { id: 'month', label: 'Month' },
];

interface CalendarViewSwitcherProps {
  view: CalendarView;
  onChange: (view: CalendarView) => void;
  className?: string;
}

export const CalendarViewSwitcher = ({ view, onChange, className }: CalendarViewSwitcherProps) => (
  <div className={cn('inline-flex rounded-lg border border-white/10 bg-black/30 p-0.5', className)}>
    {VIEWS.map((v) => (
      <button
        key={v.id}
        type="button"
        onClick={() => onChange(v.id)}
        className={cn(
          'min-h-[36px] rounded-md px-3 py-2 text-xs font-medium transition-colors touch-target sm:py-1.5',
          view === v.id ? 'bg-white/10 text-white' : 'text-white/45 hover:text-white/70'
        )}
      >
        {v.label}
      </button>
    ))}
  </div>
);
