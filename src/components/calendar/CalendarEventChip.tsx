import { cn } from '@/lib/utils';
import { EVENT_COLOR_CLASS } from '@/lib/calendarUtils';
import type { CalendarEvent } from '@/hooks/useCalendarEvents';

interface CalendarEventChipProps {
  event: CalendarEvent;
  onClick?: (event: CalendarEvent) => void;
  className?: string;
  compact?: boolean;
  style?: React.CSSProperties;
  isLive?: boolean;
}

export const CalendarEventChip = ({
  event,
  onClick,
  className,
  compact,
  style,
  isLive,
}: CalendarEventChipProps) => {
  const isFollowUp = Boolean(event.follow_up_of_meeting_id);

  return (
  <button
    type="button"
    onClick={() => onClick?.(event)}
    className={cn(
      'overflow-hidden rounded border px-1.5 py-0.5 text-left font-medium leading-tight transition-opacity hover:opacity-90',
      compact ? 'text-[9px]' : 'text-[10px] sm:text-xs',
      EVENT_COLOR_CLASS[event.color] ?? EVENT_COLOR_CLASS.orange,
      event.source === 'meeting' && 'ring-1 ring-orange-500/30',
      isFollowUp && 'ring-1 ring-sky-500/40',
      isLive && 'ring-2 ring-red-500/60 shadow-[0_0_12px_rgba(239,68,68,0.35)]',
      className
    )}
    style={style}
  >
    <span className="line-clamp-2">{event.title}</span>
    {isLive && !compact && (
      <span className="mt-0.5 flex items-center gap-1 text-[9px] font-bold text-red-300">
        <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-red-400" />
        Live
      </span>
    )}
    {isFollowUp && !compact && !isLive && (
      <span className="mt-0.5 block text-[9px] text-sky-300/90">Follow-up</span>
    )}
    {event.source === 'meeting' && !compact && !isLive && !isFollowUp && (
      <span className="mt-0.5 block text-[9px] opacity-70">
        {event.is_invited ? 'Invited · Regal Meeting' : 'Regal Meeting'}
      </span>
    )}
  </button>
  );
};
