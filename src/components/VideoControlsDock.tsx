
import React, { useState } from 'react';
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
  ChevronDown
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';

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
  onToggleHand,
  onToggleEffects,
  onNavigateToDashboard,
  onLeaveMeeting
}: VideoControlsDockProps) => {
  const isMobile = useIsMobile();
  const [isCollapsed, setIsCollapsed] = useState(false);
  
  const buttonClass = isMobile 
    ? "h-9 w-9 rounded-xl flex items-center justify-center transition-all duration-200 shadow-md border"
    : "h-10 w-10 rounded-full flex items-center justify-center transition-all duration-200 shadow-md border";
  
  const iconClass = isMobile ? "h-4 w-4" : "h-4 w-4";

  const essentialControls = [
    { key: 'audio', onClick: onToggleAudio, active: isAudioEnabled, icon: isAudioEnabled ? Mic : MicOff, color: isAudioEnabled ? 'green' : 'red' },
    { key: 'video', onClick: onToggleVideo, active: isVideoEnabled, icon: isVideoEnabled ? Video : VideoOff, color: isVideoEnabled ? 'blue' : 'red' },
    { key: 'leave', onClick: onLeaveMeeting, active: false, icon: PhoneOff, color: 'red' }
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
    switch (color) {
      case 'green':
        return "bg-green-500/20 border-green-400/40 text-green-400 hover:bg-green-500/30";
      case 'blue':
        return "bg-blue-500/20 border-blue-400/40 text-blue-400 hover:bg-blue-500/30";
      case 'red':
        return "bg-red-500/20 border-red-400/40 text-red-400 hover:bg-red-500/30";
      case 'orange':
        return "bg-orange-500/20 border-orange-400/40 text-orange-400 hover:bg-orange-500/30";
      case 'purple':
        return "bg-purple-500/20 border-purple-400/40 text-purple-400 hover:bg-purple-500/30";
      case 'yellow':
        return active ? "bg-yellow-500/20 border-yellow-400/40 text-yellow-400 hover:bg-yellow-500/30 animate-pulse" : "bg-slate-700/60 border-slate-600/40 text-slate-300 hover:bg-slate-600/60";
      default:
        return active ? "bg-slate-600/60 border-slate-500/40 text-slate-200 hover:bg-slate-500/60" : "bg-slate-700/60 border-slate-600/40 text-slate-300 hover:bg-slate-600/60";
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
    <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 z-50">
      <div className="bg-black/90 backdrop-blur-xl rounded-2xl border border-white/20 shadow-2xl">
        {/* Collapse Toggle */}
        <div className="flex justify-center">
          <Button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="h-6 w-12 rounded-t-xl bg-slate-800/60 border-slate-600/40 text-slate-300 hover:bg-slate-700/60"
            size="sm"
          >
            {isCollapsed ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          </Button>
        </div>

        <div className={cn(
          "transition-all duration-300 overflow-hidden",
          isCollapsed ? "max-h-16" : "max-h-20"
        )}>
          <div className="flex items-center gap-2 p-2 overflow-x-auto scrollbar-hide">
            {/* Essential Controls */}
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

            {!isCollapsed && (
              <>
                <Separator orientation="vertical" className="h-6 bg-white/20 mx-1" />

                {/* Additional Controls */}
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
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
