import { cn } from '@/lib/utils';
import { EVENT_COLOR_CLASS } from '@/lib/calendarUtils';
import type { CalendarEvent } from '@/hooks/useCalendarEvents';

interface CalendarEventChipProps {
  event: CalendarEvent;
  onClick?: (event: CalendarEvent) => void;
  className?: string;
  compact?: boolean;
  style?: React.CSSProperties;
}

export const CalendarEventChip = ({
  event,
  onClick,
  className,
  compact,
  style,
}: CalendarEventChipProps) => (
  <button
    type="button"
    onClick={() => onClick?.(event)}
    className={cn(
      'overflow-hidden rounded border px-1.5 py-0.5 text-left font-medium leading-tight transition-opacity hover:opacity-90',
      compact ? 'text-[9px]' : 'text-[10px] sm:text-xs',
      EVENT_COLOR_CLASS[event.color] ?? EVENT_COLOR_CLASS.orange,
      event.source === 'meeting' && 'ring-1 ring-orange-500/30',
      className
    )}
    style={style}
  >
    <span className="line-clamp-2">{event.title}</span>
    {event.source === 'meeting' && !compact && (
      <span className="mt-0.5 block text-[9px] opacity-70">
        {event.is_invited ? 'Invited · Regal Meeting' : 'Regal Meeting'}
      </span>
    )}
  </button>
);
