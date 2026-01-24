
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { 
  Mic, 
  MicOff, 
  Video, 
  VideoOff, 
  Monitor, 
  MonitorOff,
  Settings, 
  MessageSquare,
  Hand,
  Sparkles,
  RotateCcw,
  Captions,
  CaptionsOff,
  PhoneOff,
  LayoutDashboard,
  ChevronUp,
  ChevronDown,
  MoreVertical,
  Users,
  Info
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';
import { format } from 'date-fns';

interface VideoControlsDockProps {
  isVideoEnabled: boolean;
  isAudioEnabled: boolean;
  isScreenSharing: boolean;
  captionsEnabled: boolean;
  showSettings: boolean;
  showChat: boolean;
  handRaised: boolean;
  onToggleVideo: () => void;
  onToggleAudio: () => void;
  onToggleScreenShare: () => void;
  onSwitchCamera: () => void;
  onToggleCaptions: () => void;
  onToggleSettings: () => void;
  onToggleChat: () => void;
  onToggleParticipants?: () => void;
  onToggleHand: () => void;
  onToggleEffects: () => void;
  onNavigateToDashboard?: () => void;
  onLeaveMeeting: () => void;
}

export const VideoControlsDock = ({
  isVideoEnabled,
  isAudioEnabled,
  isScreenSharing,
  captionsEnabled,
  showSettings,
  showChat,
  handRaised,
  onToggleVideo,
  onToggleAudio,
  onToggleScreenShare,
  onSwitchCamera,
  onToggleCaptions,
  onToggleSettings,
  onToggleChat,
  onToggleParticipants,
  onToggleHand,
  onToggleEffects,
  onNavigateToDashboard,
  onLeaveMeeting
}: VideoControlsDockProps) => {
  const isMobile = useIsMobile();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);
  
  const buttonClass = isMobile 
    ? "h-9 w-9 rounded-xl flex items-center justify-center transition-all duration-200 shadow-md border"
    : "h-10 w-10 rounded-full flex items-center justify-center transition-all duration-200 shadow-none border-none hover:bg-white/10 text-white";
  
  const iconClass = isMobile ? "h-4 w-4" : "h-5 w-5";

  const essentialControls = [
    { key: 'audio', onClick: onToggleAudio, active: isAudioEnabled, icon: isAudioEnabled ? Mic : MicOff, color: isAudioEnabled ? 'default' : 'red' },
    { key: 'video', onClick: onToggleVideo, active: isVideoEnabled, icon: isVideoEnabled ? Video : VideoOff, color: isVideoEnabled ? 'default' : 'red' },
  ];

  const mainControls = [
    ...essentialControls,
    { key: 'captions', onClick: onToggleCaptions, active: captionsEnabled, icon: captionsEnabled ? Captions : CaptionsOff, color: captionsEnabled ? 'active' : 'default' },
    { key: 'hand', onClick: onToggleHand, active: handRaised, icon: Hand, color: handRaised ? 'active' : 'default' },
    { key: 'screen', onClick: onToggleScreenShare, active: isScreenSharing, icon: isScreenSharing ? MonitorOff : Monitor, color: isScreenSharing ? 'active' : 'default' },
    { key: 'effects', onClick: onToggleEffects, active: false, icon: Sparkles, color: 'default' },
    { key: 'settings', onClick: onToggleSettings, active: showSettings, icon: Settings, color: showSettings ? 'active' : 'default' },
    { key: 'leave', onClick: onLeaveMeeting, active: false, icon: PhoneOff, color: 'red-pill' }
  ];

  const additionalControls = [
    { key: 'screen', onClick: onToggleScreenShare, active: isScreenSharing, icon: isScreenSharing ? MonitorOff : Monitor, color: isScreenSharing ? 'orange' : 'slate' },
    { key: 'camera', onClick: onSwitchCamera, active: false, icon: RotateCcw, color: 'slate' },
    { key: 'captions', onClick: onToggleCaptions, active: captionsEnabled, icon: captionsEnabled ? Captions : CaptionsOff, color: captionsEnabled ? 'purple' : 'slate' },
    { key: 'chat', onClick: onToggleChat, active: showChat, icon: MessageSquare, color: showChat ? 'blue' : 'slate' },
    { key: 'hand', onClick: onToggleHand, active: handRaised, icon: Hand, color: handRaised ? 'yellow' : 'slate' },
    { key: 'effects', onClick: onToggleEffects, active: false, icon: Sparkles, color: 'slate' },
    { key: 'settings', onClick: onToggleSettings, active: showSettings, icon: Settings, color: showSettings ? 'slate' : 'slate' }
  ];

  if (onNavigateToDashboard) {
    additionalControls.push({ key: 'dashboard', onClick: onNavigateToDashboard, active: false, icon: LayoutDashboard, color: 'slate' });
  }

  const getButtonColors = (color: string, active: boolean) => {
    if (isMobile) {
       switch (color) {
        case 'red':
          return "bg-red-500/20 border-red-400/40 text-red-400 hover:bg-red-500/30";
        case 'active':
          return "bg-blue-500/20 border-blue-400/40 text-blue-400 hover:bg-blue-500/30";
        default:
          return active ? "bg-slate-600/60 border-slate-500/40 text-slate-200 hover:bg-slate-500/60" : "bg-slate-700/60 border-slate-600/40 text-slate-300 hover:bg-slate-600/60";
       }
    }

    // Desktop styles (Google Meet like)
    switch (color) {
      case 'red':
        return "bg-red-600 hover:bg-red-700 text-white rounded-full";
      case 'red-pill':
        return "bg-red-600 hover:bg-red-700 text-white rounded-full w-14 px-0";
      case 'active':
        return "bg-blue-300 text-blue-900 hover:bg-blue-200 rounded-full";
      case 'default':
      default:
        return "bg-zinc-800 text-white hover:bg-zinc-700 rounded-full border border-zinc-700";
    }
  };

  if (isMobile) {
    return (
      <div className="fixed bottom-0 left-0 right-0 z-50 safe-area-inset-bottom">
        <div className="bg-black/95 backdrop-blur-xl border-t border-white/10">
          {/* Collapse Toggle */}
          <div className="flex justify-center py-1">
            <Button
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="h-6 w-12 rounded-t-lg bg-slate-800/60 border-slate-600/40 text-slate-300 hover:bg-slate-700/60"
              size="sm"
            >
              {isCollapsed ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            </Button>
          </div>

        <div className={cn(
            "transition-all duration-300 overflow-hidden",
            isCollapsed ? "max-h-20" : "max-h-40"
          )}>
            {/* Essential Controls - Always Visible */}
            <div className="flex flex-wrap items-center justify-center gap-2 px-3 py-3">
              {essentialControls.map((control) => {
                const Icon = control.icon;
                return (
                  <Button
                    key={control.key}
                    onClick={control.onClick}
                    className={cn(buttonClass, getButtonColors(control.color, control.active))}
                    size="sm"
                  >
                    <Icon className={iconClass} />
                  </Button>
                );
              })}
            </div>

            {/* Additional Controls - Hidden when collapsed */}
            {!isCollapsed && (
              <div className="flex flex-wrap items-center justify-center gap-2 px-3 pb-3 max-w-full">
                {additionalControls.map((control) => {
                  const Icon = control.icon;
                  return (
                    <Button
                      key={control.key}
                      onClick={control.onClick}
                      className={cn(buttonClass, getButtonColors(control.color, control.active))}
                      size="sm"
                    >
                      <Icon className={iconClass} />
                    </Button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full bg-zinc-900 border-t border-white/5 p-3 z-50">
      <div className="flex items-center justify-between w-full max-w-[1920px] mx-auto px-4">
        {/* Left: Meeting Info */}
        <div className="hidden md:flex items-center gap-4 text-white min-w-[200px]">
          <span className="text-sm font-medium">{format(currentTime, 'hh:mm a')}</span>
          <Separator orientation="vertical" className="h-4 bg-zinc-700" />
          <span className="text-sm font-medium tracking-tight text-zinc-300">
             {window.location.pathname.split('/').pop()?.slice(0, 9) || 'meeting'}
          </span>
        </div>

        {/* Center: Controls */}
        <div className="flex items-center gap-2 md:gap-3">
            {mainControls.map((control) => {
              const Icon = control.icon;
              const isLeave = control.key === 'leave';
              return (
                <Button
                  key={control.key}
                  onClick={control.onClick}
                  className={cn(
                    isLeave ? "w-16 h-10 rounded-full" : "h-10 w-10 rounded-full",
                    getButtonColors(control.color, control.active)
                  )}
                  variant="ghost"
                  size="icon"
                >
                  <Icon className={iconClass} />
                </Button>
              );
            })}
        </div>

        {/* Right: Side Panel Toggles */}
        <div className="hidden md:flex items-center justify-end gap-2 min-w-[200px]">
            <Button
              onClick={() => {}} // Info toggle
              className="h-10 w-10 rounded-full bg-transparent hover:bg-zinc-800 text-white"
              variant="ghost"
              size="icon"
            >
               <Info className="h-5 w-5" />
            </Button>

            <Button
              onClick={onToggleParticipants}
              className="h-10 w-10 rounded-full bg-transparent hover:bg-zinc-800 text-white"
              variant="ghost"
              size="icon"
            >
               <Users className="h-5 w-5" />
            </Button>

            <Button
              onClick={onToggleChat}
              className={cn(
                "h-10 w-10 rounded-full hover:bg-zinc-800 text-white",
                showChat ? "bg-blue-300 text-blue-900 hover:bg-blue-200" : "bg-transparent"
              )}
              variant="ghost"
              size="icon"
            >
               <MessageSquare className="h-5 w-5" />
            </Button>

            <Button
              onClick={() => {}} // Activities toggle
              className="h-10 w-10 rounded-full bg-transparent hover:bg-zinc-800 text-white"
              variant="ghost"
              size="icon"
            >
               <MoreVertical className="h-5 w-5" />
            </Button>
        </div>
      </div>
    </div>
  );
};
