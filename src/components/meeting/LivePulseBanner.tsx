import { useMemo } from 'react';
import { CalendarDays, Radio, Users } from 'lucide-react';
import { useRegalBrief } from '@/hooks/useRegalBrief';
import { useTeamLivePresence } from '@/hooks/useTeamLivePresence';
import { cn } from '@/lib/utils';

interface LivePulseBannerProps {
  meetingCode: string;
  className?: string;
  compact?: boolean;
}

/**
 * Bidirectional Live Pulse — calendar context + team presence for lobby / header.
 */
export const LivePulseBanner = ({
  meetingCode,
  className,
  compact,
}: LivePulseBannerProps) => {
  const { data: brief } = useRegalBrief({ meetingCode, enabled: Boolean(meetingCode) });
  const { liveMeetings } = useTeamLivePresence();

  const teamHere = useMemo(() => {
    const code = meetingCode.toUpperCase();
    return liveMeetings.find((m) => m.code.toUpperCase() === code);
  }, [liveMeetings, meetingCode]);

  const inviteeCount = brief?.invitees.length ?? 0;
  const onCalendar = Boolean(brief?.scheduledMeetingId || brief?.startTime);

  if (!onCalendar && !teamHere && inviteeCount === 0) return null;

  if (compact) {
    return (
      <div
        className={cn(
          'inline-flex max-w-full items-center gap-1.5 truncate rounded-full border border-white/10 bg-black/40 px-2.5 py-1 text-[10px] font-medium text-white/70 backdrop-blur-md',
          className
        )}
      >
        <span className="inline-block h-1.5 w-1.5 shrink-0 animate-pulse rounded-full bg-red-400" />
        {onCalendar ? 'On your calendar' : 'Live Pulse'}
        {inviteeCount > 0 && ` · ${inviteeCount} invitee${inviteeCount === 1 ? '' : 's'}`}
        {teamHere && ` · ${teamHere.count} live`}
      </div>
    );
  }

  return (
    <div
      className={cn(
        'mx-auto flex w-full max-w-md items-start gap-3 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-left backdrop-blur-sm animate-in fade-in duration-500',
        className
      )}
    >
      <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-red-500/30 bg-red-500/10 text-red-300">
        <Radio className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-bold uppercase tracking-widest text-red-300/90">Live Pulse</p>
        <p className="mt-0.5 text-sm text-white/75">
          {onCalendar ? 'This room is on your Regal Calendar' : 'Team presence for this room'}
        </p>
        <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-white/45">
          {onCalendar && (
            <span className="inline-flex items-center gap-1">
              <CalendarDays className="h-3 w-3 text-orange-400" />
              Calendar linked
            </span>
          )}
          {inviteeCount > 0 && (
            <span className="inline-flex items-center gap-1">
              <Users className="h-3 w-3" />
              {inviteeCount} invitee{inviteeCount === 1 ? '' : 's'}
            </span>
          )}
          {teamHere && (
            <span className="inline-flex items-center gap-1 text-red-300/80">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-red-400" />
              {teamHere.count} live now
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
