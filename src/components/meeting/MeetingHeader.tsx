import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Copy, Users, Settings, MoreVertical, Shield, Maximize, Minimize, LogOut, Video, Mic } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useIsMobile } from '@/hooks/use-mobile';
import logo from '@/assets/regal-logo.png';

interface MeetingHeaderProps {
  meetingId: string;
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
}

const formatElapsed = (sec: number) => {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  const pad = (n: number) => n.toString().padStart(2, '0');
  return h > 0 ? `${pad(h)}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
};

/**
 * Minimal Google Meet-style top bar.
 * Shows logo, meeting ID, elapsed time, participant count, and a more menu.
 */
export const MeetingHeader = ({
  meetingId,
  isCurrentUserHost,
  totalParticipantCount,
  handNotifications,
  isFullscreen,
  showParticipants,
  isVideoMode,
  onCopyMeetingId,
  onToggleFullscreen,
  onToggleParticipants,
  onToggleVideoMode,
  onNavigateToSettings,
  onSignOut,
}: MeetingHeaderProps) => {
  const isMobile = useIsMobile();
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <header className="bg-[#202124]/95 backdrop-blur-md border-b border-white/5 px-3 sm:px-4 py-2 flex items-center justify-between z-30">
      {/* Left: brand + meeting */}
      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
        <img src={logo} alt="Regal Meeting" className="h-8 w-8 rounded-lg flex-shrink-0" />
        <div className="hidden sm:block min-w-0">
          <div className="text-white text-sm font-semibold truncate">Regal Meeting</div>
          <div className="text-white/50 text-xs truncate">{meetingId}</div>
        </div>
        <div className="sm:hidden text-white/70 text-xs font-mono truncate max-w-[100px]">{meetingId}</div>
      </div>

      {/* Center: live indicator + timer */}
      <div className="hidden md:flex items-center gap-2 text-white/70 text-sm">
        <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
        <span className="font-mono">{formatElapsed(elapsed)}</span>
        {isCurrentUserHost && (
          <span className="ml-2 inline-flex items-center gap-1 bg-yellow-500/15 text-yellow-300 text-xs px-2 py-0.5 rounded-full border border-yellow-500/20">
            <Shield className="h-3 w-3" /> Host
          </span>
        )}
      </div>

      {/* Right: actions */}
      <div className="flex items-center gap-1 sm:gap-2">
        <Button
          onClick={onCopyMeetingId}
          variant="ghost"
          size="sm"
          className="text-white/80 hover:bg-white/10 hover:text-white"
          aria-label="Copy meeting ID"
        >
          <Copy className="h-4 w-4 sm:mr-2" />
          <span className="hidden sm:inline">Copy ID</span>
        </Button>

        <Button
          onClick={onToggleParticipants}
          variant="ghost"
          size="sm"
          className={`hover:bg-white/10 hover:text-white ${
            showParticipants ? 'bg-white/15 text-white' : 'text-white/80'
          }`}
          aria-label="Show participants"
        >
          <Users className="h-4 w-4 sm:mr-2" />
          <span className="hidden sm:inline">
            {totalParticipantCount} participant{totalParticipantCount !== 1 ? 's' : ''}
          </span>
          {handNotifications.length > 0 && (
            <span className="ml-1 inline-flex items-center justify-center h-4 w-4 rounded-full bg-yellow-500 text-[10px] text-black font-bold">
              {handNotifications.length}
            </span>
          )}
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="text-white/80 hover:bg-white/10 hover:text-white" aria-label="More">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="bg-[#202124] text-white border-white/10 min-w-[200px]">
            <DropdownMenuItem onClick={onToggleVideoMode}>
              {isVideoMode ? <Mic className="h-4 w-4 mr-2" /> : <Video className="h-4 w-4 mr-2" />}
              {isVideoMode ? 'Switch to audio-only' : 'Switch to video'}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onToggleFullscreen}>
              {isFullscreen ? <Minimize className="h-4 w-4 mr-2" /> : <Maximize className="h-4 w-4 mr-2" />}
              {isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onNavigateToSettings}>
              <Settings className="h-4 w-4 mr-2" /> Settings
            </DropdownMenuItem>
            <DropdownMenuSeparator className="bg-white/10" />
            <DropdownMenuItem onClick={onSignOut} className="text-red-400 focus:text-red-300 focus:bg-red-500/10">
              <LogOut className="h-4 w-4 mr-2" /> Leave & sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
};
