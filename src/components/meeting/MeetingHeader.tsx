import React, { useEffect, useState } from 'react';
import { ArrowLeft, Send, MoreVertical, Settings, Maximize, Minimize, LogOut, Video, Mic, Shield, Users } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { PRODUCT_NAME, MEET_DOMAIN } from '@/constants/site';
import { cn } from '@/lib/utils';

interface MeetingHeaderProps {
  meetingId: string;
  meetingTitle?: string | null;
  isCurrentUserHost: boolean;
  totalParticipantCount: number;
  handNotifications: any[];
  isFullscreen: boolean;
  showParticipants: boolean;
  isVideoMode: boolean;
  onCopyMeetingId: () => void;
  onToggleFullscreen: () => void;
  onToggleParticipants: () => void;
  onToggleVideoMode: () => void;
  onNavigateToSettings: () => void;
  onSignOut: () => void;
  onNavigateBack?: () => void;
}

const formatElapsed = (sec: number) => {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  const pad = (n: number) => n.toString().padStart(2, '0');
  return h > 0 ? `${pad(h)}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
};

/**
 * Floating glass overlays — back control (top-left) and meeting info + share (top-right).
 */
export const MeetingHeader = ({
  meetingId,
  meetingTitle,
  isCurrentUserHost,
  totalParticipantCount,
  isFullscreen,
  showParticipants,
  isVideoMode,
  onCopyMeetingId,
  onToggleFullscreen,
  onToggleParticipants,
  onToggleVideoMode,
  onNavigateToSettings,
  onSignOut,
  onNavigateBack,
}: MeetingHeaderProps) => {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, []);

  const title = (meetingTitle && meetingTitle.trim()) || PRODUCT_NAME;
  const shareHint = `${MEET_DOMAIN}/${meetingId}`;

  return (
    <>
      {/* Top left — back + timer */}
      <div className="pointer-events-none absolute left-3 top-3 z-40 flex max-w-[calc(100vw-8rem)] items-center gap-2 safe-area-inset-top">
        {onNavigateBack && (
          <button
            type="button"
            onClick={onNavigateBack}
            className={cn(
              'pointer-events-auto flex h-11 w-11 shrink-0 items-center justify-center rounded-full touch-target',
              'border border-white/20 bg-white/90 text-neutral-900 shadow-lg',
              'transition hover:bg-white active:scale-95'
            )}
            aria-label="Back to dashboard"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
        )}

        <div className="pointer-events-none flex min-w-0 items-center gap-2 rounded-full border border-white/15 bg-black/35 px-2.5 py-1.5 text-xs text-white/80 backdrop-blur-xl sm:px-3">
          <span className="h-1.5 w-1.5 shrink-0 animate-pulse rounded-full bg-red-500" />
          <span className="font-mono tabular-nums">{formatElapsed(elapsed)}</span>
          {isCurrentUserHost && (
            <span className="hidden items-center gap-1 text-amber-300 sm:inline-flex">
              <Shield className="h-3 w-3" /> Host
            </span>
          )}
        </div>
      </div>

      {/* Top right — title + share + menu */}
      <div className="pointer-events-none absolute right-3 top-3 z-40 flex max-w-[min(24rem,70vw)] items-start gap-1.5 safe-area-inset-top sm:gap-2">
        <div className="pointer-events-none min-w-0 text-right">
          <p className="truncate text-sm font-semibold tracking-tight text-white drop-shadow-md sm:text-lg">
            {title}
          </p>
          <p className="hidden truncate text-xs text-white/65 drop-shadow-sm sm:block sm:text-sm">{shareHint}</p>
        </div>

        <button
          type="button"
          onClick={onToggleParticipants}
          className={cn(
            'pointer-events-auto mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-full touch-target lg:hidden',
            'border border-white/20 shadow-lg backdrop-blur-xl transition active:scale-95',
            showParticipants
              ? 'bg-primary text-primary-foreground'
              : 'bg-white/15 text-white hover:bg-white/25'
          )}
          aria-label="Participants"
          title={`${totalParticipantCount} participants`}
        >
          <Users className="h-4 w-4" />
        </button>

        <button
          type="button"
          onClick={onCopyMeetingId}
          className={cn(
            'pointer-events-auto mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-full touch-target',
            'border border-white/20 bg-white/15 text-white shadow-lg backdrop-blur-xl',
            'transition hover:bg-white/25 active:scale-95'
          )}
          aria-label="Copy meeting link"
          title="Share meeting"
        >
          <Send className="h-4 w-4 -translate-x-px translate-y-px" />
        </button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className={cn(
                'pointer-events-auto mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-full touch-target',
                'border border-white/20 bg-white/15 text-white shadow-lg backdrop-blur-xl',
                'transition hover:bg-white/25'
              )}
              aria-label="More"
            >
              <MoreVertical className="h-4 w-4" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            className="min-w-[200px] border-white/10 bg-black/90 text-white backdrop-blur-xl"
          >
            <DropdownMenuItem onClick={onToggleParticipants} className="lg:hidden">
              <Users className="mr-2 h-4 w-4" />
              Participants ({totalParticipantCount})
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onToggleVideoMode}>
              {isVideoMode ? <Mic className="mr-2 h-4 w-4" /> : <Video className="mr-2 h-4 w-4" />}
              {isVideoMode ? 'Switch to audio-only' : 'Switch to video'}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onToggleFullscreen}>
              {isFullscreen ? <Minimize className="mr-2 h-4 w-4" /> : <Maximize className="mr-2 h-4 w-4" />}
              {isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onNavigateToSettings}>
              <Settings className="mr-2 h-4 w-4" /> Settings
            </DropdownMenuItem>
            <DropdownMenuSeparator className="bg-white/10" />
            <DropdownMenuItem
              onClick={onSignOut}
              className="text-red-400 focus:bg-red-500/10 focus:text-red-300"
            >
              <LogOut className="mr-2 h-4 w-4" /> Leave & sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </>
  );
};
