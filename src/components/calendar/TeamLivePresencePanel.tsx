import { Radio, Users, Video } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { TeamLiveMember } from '@/hooks/useTeamLivePresence';

interface TeamLivePresencePanelProps {
  liveMeetings: {
    title: string;
    code: string;
    count: number;
    members: TeamLiveMember[];
  }[];
  loading?: boolean;
  onJoinMeeting?: (code: string) => void;
  className?: string;
}

/**
 * Team-wide live presence — see which teammates are in active Regal Meetings.
 */
export const TeamLivePresencePanel = ({
  liveMeetings,
  loading,
  onJoinMeeting,
  className,
}: TeamLivePresencePanelProps) => (
  <div className={cn('space-y-3', className)}>
    <div className="flex items-center justify-between">
      <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-white/35">
        <Radio className="h-3 w-3 text-red-400" />
        Team live
      </p>
      {liveMeetings.length > 0 && (
        <Badge className="animate-pulse border-0 bg-red-500/20 text-[10px] text-red-300">
          {liveMeetings.length} active
        </Badge>
      )}
    </div>

    {loading && liveMeetings.length === 0 ? (
      <p className="text-xs text-white/30">Checking team presence…</p>
    ) : liveMeetings.length === 0 ? (
      <p className="rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2 text-xs text-white/40">
        No teammates in live meetings right now.
      </p>
    ) : (
      <ul className="space-y-2">
        {liveMeetings.map((room) => (
          <li
            key={room.code}
            className="rounded-xl border border-red-500/20 bg-red-500/[0.06] p-3"
          >
            <div className="mb-2 flex items-start justify-between gap-2">
              <div>
                <p className="text-sm font-medium text-white">{room.title}</p>
                <p className="font-mono text-[10px] text-orange-300/80">{room.code}</p>
              </div>
              <Badge variant="outline" className="shrink-0 border-red-500/30 text-red-300">
                <Users className="mr-1 h-3 w-3" />
                {room.count}
              </Badge>
            </div>
            <ul className="mb-2 space-y-1">
              {room.members.slice(0, 4).map((m) => (
                <li key={`${m.member_email}-${room.code}`} className="text-xs text-white/55">
                  {m.member_name}
                  {m.is_host && <span className="ml-1 text-orange-400/70">· host</span>}
                </li>
              ))}
              {room.members.length > 4 && (
                <li className="text-xs text-white/35">+{room.members.length - 4} more</li>
              )}
            </ul>
            {onJoinMeeting && (
              <Button
                variant="outline"
                size="sm"
                className="h-7 w-full border-red-500/30 text-xs text-red-200 hover:bg-red-500/10"
                onClick={() => onJoinMeeting(room.code)}
              >
                <Video className="mr-1 h-3 w-3" />
                Join live
              </Button>
            )}
          </li>
        ))}
      </ul>
    )}
  </div>
);
