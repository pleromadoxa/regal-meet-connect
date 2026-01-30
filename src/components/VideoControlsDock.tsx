
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
  Info,
  Smile
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';
import { format } from 'date-fns';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

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
  
  // Google Meet Colors
  const colors = {
    barBg: "bg-[#202124]",
    btnDefault: "bg-[#3c4043] hover:bg-[#4a4e51] text-white border-transparent",
    btnRed: "bg-[#ea4335] hover:bg-[#d93025] text-white border-transparent",
    btnActive: "bg-[#a8c7fa] hover:bg-[#8ab4f8] text-[#041e49] border-transparent",
    btnGhost: "bg-transparent hover:bg-[#3c4043] text-white",
  };

  const buttonClass = isMobile 
    ? "h-12 w-12 rounded-full flex items-center justify-center transition-all duration-200 shadow-sm"
    : "h-10 w-10 rounded-full flex items-center justify-center transition-all duration-200 shadow-sm";
  
  const iconClass = "h-5 w-5";

  // Configuration for Center Controls
  const centerControls = [
    {
      key: 'audio',
      onClick: onToggleAudio,
      active: isAudioEnabled, // If active (ON), use default. If inactive (OFF), use red.
      icon: isAudioEnabled ? Mic : MicOff,
      style: isAudioEnabled ? 'default' : 'red',
      tooltip: isAudioEnabled ? 'Turn off microphone' : 'Turn on microphone'
    },
    {
      key: 'video',
      onClick: onToggleVideo,
      active: isVideoEnabled,
      icon: isVideoEnabled ? Video : VideoOff,
      style: isVideoEnabled ? 'default' : 'red',
      tooltip: isVideoEnabled ? 'Turn off camera' : 'Turn on camera'
    },
    {
      key: 'captions',
      onClick: onToggleCaptions,
      active: captionsEnabled,
      icon: captionsEnabled ? Captions : CaptionsOff,
      style: captionsEnabled ? 'active' : 'default',
      tooltip: 'Turn on captions'
    },
    {
      key: 'hand',
      onClick: onToggleHand,
      active: handRaised,
      icon: Hand,
      style: handRaised ? 'active' : 'default',
      tooltip: 'Raise hand'
    },
    {
      key: 'screen',
      onClick: onToggleScreenShare,
      active: isScreenSharing,
      icon: isScreenSharing ? MonitorOff : Monitor,
      style: isScreenSharing ? 'active' : 'default',
      tooltip: 'Present now'
    },
    {
      key: 'effects',
      onClick: onToggleEffects,
      active: false,
      icon: Sparkles,
      style: 'default',
      tooltip: 'Apply visual effects'
    },
    {
      key: 'more',
      onClick: onToggleSettings, // Using settings for now, or could trigger a dropdown
      active: showSettings,
      icon: MoreVertical,
      style: showSettings ? 'active' : 'default',
      tooltip: 'More options'
    },
    {
      key: 'leave',
      onClick: onLeaveMeeting,
      active: false,
      icon: PhoneOff,
      style: 'leave', // Special pill style
      tooltip: 'Leave call'
    }
  ];

  const getButtonStyle = (style: string) => {
    switch (style) {
      case 'red': return colors.btnRed;
      case 'active': return colors.btnActive;
      case 'leave': return `${colors.btnRed} w-16 rounded-full px-0`;
      case 'default': default: return colors.btnDefault;
    }
  };

  if (isMobile) {
    // Mobile View - simplified bottom bar
    return (
      <div className="fixed bottom-0 left-0 right-0 z-50">
        <div className="bg-[#202124] border-t border-white/10 px-4 py-4 pb-8 flex items-center justify-between">
            <Button
              onClick={onLeaveMeeting}
              className={cn("h-12 w-12 rounded-full", colors.btnRed)}
              size="icon"
            >
              <PhoneOff className="h-5 w-5" />
            </Button>

            <Button
              onClick={onToggleVideo}
              className={cn("h-12 w-12 rounded-full", isVideoEnabled ? colors.btnDefault : colors.btnRed)}
              size="icon"
            >
              {isVideoEnabled ? <Video className="h-5 w-5" /> : <VideoOff className="h-5 w-5" />}
            </Button>

            <Button
              onClick={onToggleAudio}
              className={cn("h-12 w-12 rounded-full", isAudioEnabled ? colors.btnDefault : colors.btnRed)}
              size="icon"
            >
              {isAudioEnabled ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5" />}
            </Button>

            <Button
              onClick={onToggleHand}
              className={cn("h-12 w-12 rounded-full", handRaised ? colors.btnActive : colors.btnDefault)}
              size="icon"
            >
              <Hand className="h-5 w-5" />
            </Button>

             <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  className={cn("h-12 w-12 rounded-full", colors.btnDefault)}
                  size="icon"
                >
                  <MoreVertical className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 bg-[#3c4043] text-white border-zinc-700">
                <DropdownMenuLabel>More Options</DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-zinc-600" />
                <DropdownMenuItem onClick={onSwitchCamera} className="focus:bg-zinc-600 focus:text-white">
                  <RotateCcw className="mr-2 h-4 w-4" /> Switch Camera
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onToggleCaptions} className="focus:bg-zinc-600 focus:text-white">
                  {captionsEnabled ? <CaptionsOff className="mr-2 h-4 w-4" /> : <Captions className="mr-2 h-4 w-4" />}
                  {captionsEnabled ? 'Turn off captions' : 'Turn on captions'}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onToggleScreenShare} className="focus:bg-zinc-600 focus:text-white">
                   <Monitor className="mr-2 h-4 w-4" /> Share Screen
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onToggleChat} className="focus:bg-zinc-600 focus:text-white">
                   <MessageSquare className="mr-2 h-4 w-4" /> In-call Messages
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onToggleEffects} className="focus:bg-zinc-600 focus:text-white">
                   <Sparkles className="mr-2 h-4 w-4" /> Effects
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onToggleSettings} className="focus:bg-zinc-600 focus:text-white">
                   <Settings className="mr-2 h-4 w-4" /> Settings
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
        </div>
      </div>
    );
  }

  // Desktop View
  return (
    <div className={cn("w-full h-20 flex items-center px-4 z-50 fixed bottom-0 left-0 right-0", colors.barBg)}>
      {/* Left: Time and Meeting ID */}
      <div className="flex-1 flex items-center justify-start gap-4 text-white min-w-[200px]">
        <div className="text-lg font-medium tracking-wide">{format(currentTime, 'h:mm a')}</div>
        <Separator orientation="vertical" className="h-6 bg-zinc-600" />
        <div className="text-base font-medium text-zinc-300 tracking-tight">
           {window.location.pathname.split('/').pop()?.slice(0, 9) || 'meeting-id'}
        </div>
      </div>

      {/* Center: Main Controls */}
      <div className="flex items-center justify-center gap-3">
          {centerControls.map((control) => {
            const Icon = control.icon;
            return (
              <Button
                key={control.key}
                onClick={control.onClick}
                className={cn(
                  buttonClass,
                  getButtonStyle(control.style)
                )}
                title={control.tooltip}
              >
                <Icon className={iconClass} />
              </Button>
            );
          })}
      </div>

      {/* Right: Side Panel Toggles */}
      <div className="flex-1 flex items-center justify-end gap-2 min-w-[200px]">
          <Button
            onClick={() => {}} // Info toggle
            className={cn("h-10 w-10 rounded-full", colors.btnGhost)}
            size="icon"
            title="Meeting details"
          >
             <Info className="h-5 w-5" />
          </Button>

          <Button
            onClick={onToggleParticipants}
            className={cn("h-10 w-10 rounded-full", colors.btnGhost)}
            size="icon"
            title="People"
          >
             <Users className="h-5 w-5" />
          </Button>

          <Button
            onClick={onToggleChat}
            className={cn(
              "h-10 w-10 rounded-full relative",
              showChat ? colors.btnActive : colors.btnGhost
            )}
            size="icon"
            title="Chat with everyone"
          >
             <MessageSquare className="h-5 w-5" />
          </Button>

          <Button
            onClick={() => {}} // Activities toggle
            className={cn("h-10 w-10 rounded-full", colors.btnGhost)}
            size="icon"
            title="Activities"
          >
             <Smile className="h-5 w-5" />
          </Button>

          {onNavigateToDashboard && (
             <Button
               onClick={onNavigateToDashboard}
               className={cn("h-10 w-10 rounded-full ml-2", colors.btnGhost)}
               size="icon"
               title="Dashboard"
             >
                <LayoutDashboard className="h-5 w-5" />
             </Button>
          )}
      </div>
    </div>
  );
};
