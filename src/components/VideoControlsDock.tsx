
import React from 'react';
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
  LayoutDashboard
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
  
  const buttonClass = isMobile 
    ? "h-12 w-12 rounded-2xl flex items-center justify-center transition-all duration-200 shadow-lg border-2"
    : "h-12 w-12 sm:h-14 sm:w-14 rounded-full flex items-center justify-center transition-all duration-200 shadow-lg border-2";
  
  const iconClass = isMobile ? "h-5 w-5" : "h-5 w-5 sm:h-6 sm:w-6";

  if (isMobile) {
    return (
      <div className="fixed bottom-0 left-0 right-0 z-50 safe-area-inset-bottom">
        <div className="bg-black/95 backdrop-blur-xl border-t border-white/10">
          <div className="flex items-center justify-center gap-4 p-4 overflow-x-auto scrollbar-hide">
            <div className="flex items-center gap-4 min-w-max">
              {/* Leave Meeting - Red */}
              <Button
                onClick={onLeaveMeeting}
                className={cn(
                  buttonClass,
                  "bg-red-500/90 border-red-400/40 text-white hover:bg-red-600/90"
                )}
                size="sm"
              >
                <PhoneOff className={iconClass} />
              </Button>

              {/* Audio Toggle */}
              <Button
                onClick={onToggleAudio}
                className={cn(
                  buttonClass,
                  isAudioEnabled 
                    ? "bg-slate-700/80 border-slate-600/40 text-white hover:bg-slate-600/80" 
                    : "bg-slate-700/80 border-slate-600/40 text-slate-300 hover:bg-slate-600/80"
                )}
                size="sm"
              >
                {isAudioEnabled ? (
                  <Mic className={iconClass} />
                ) : (
                  <MicOff className={iconClass} />
                )}
              </Button>

              {/* Video Toggle */}
              <Button
                onClick={onToggleVideo}
                className={cn(
                  buttonClass,
                  "bg-slate-700/80 border-slate-600/40 text-white hover:bg-slate-600/80"
                )}
                size="sm"
              >
                {isVideoEnabled ? (
                  <Video className={iconClass} />
                ) : (
                  <VideoOff className={iconClass} />
                )}
              </Button>

              {/* Screen Share */}
              <Button
                onClick={onToggleScreenShare}
                className={cn(
                  buttonClass,
                  isScreenSharing 
                    ? "bg-orange-500/20 border-orange-400/40 text-orange-400 hover:bg-orange-500/30" 
                    : "bg-slate-700/80 border-slate-600/40 text-slate-300 hover:bg-slate-600/80"
                )}
                size="sm"
              >
                {isScreenSharing ? (
                  <MonitorOff className={iconClass} />
                ) : (
                  <Monitor className={iconClass} />
                )}
              </Button>

              {/* Effects */}
              <Button
                onClick={onToggleEffects}
                className={cn(
                  buttonClass,
                  "bg-slate-700/80 border-slate-600/40 text-slate-300 hover:bg-slate-600/80"
                )}
                size="sm"
              >
                <Sparkles className={iconClass} />
              </Button>

              {/* Raise Hand */}
              <Button
                onClick={onToggleHand}
                className={cn(
                  buttonClass,
                  handRaised 
                    ? "bg-yellow-500/20 border-yellow-400/40 text-yellow-400 hover:bg-yellow-500/30 animate-pulse" 
                    : "bg-slate-700/80 border-slate-600/40 text-slate-300 hover:bg-slate-600/80"
                )}
                size="sm"
              >
                <Hand className={iconClass} />
              </Button>

              {/* Chat */}
              <Button
                onClick={onToggleChat}
                className={cn(
                  buttonClass,
                  showChat 
                    ? "bg-blue-500/20 border-blue-400/40 text-blue-400 hover:bg-blue-500/30" 
                    : "bg-slate-700/80 border-slate-600/40 text-slate-300 hover:bg-slate-600/80"
                )}
                size="sm"
              >
                <MessageSquare className={iconClass} />
              </Button>

              {/* Settings */}
              <Button
                onClick={onToggleSettings}
                className={cn(
                  buttonClass,
                  showSettings 
                    ? "bg-slate-600/60 border-slate-500/40 text-slate-200 hover:bg-slate-500/60" 
                    : "bg-slate-700/80 border-slate-600/40 text-slate-300 hover:bg-slate-600/80"
                )}
                size="sm"
              >
                <Settings className={iconClass} />
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 z-50">
      <div className="bg-black/90 backdrop-blur-xl rounded-2xl border border-white/20 shadow-2xl">
        <div className="flex items-center gap-2 p-3 overflow-x-auto scrollbar-hide">
          <div className="flex items-center gap-2 min-w-max">
            {/* Audio Toggle */}
            <Button
              onClick={onToggleAudio}
              className={cn(
                buttonClass,
                isAudioEnabled 
                  ? "bg-green-500/20 border-green-400/40 text-green-400 hover:bg-green-500/30" 
                  : "bg-red-500/20 border-red-400/40 text-red-400 hover:bg-red-500/30"
              )}
              size="sm"
            >
              {isAudioEnabled ? (
                <Mic className={iconClass} />
              ) : (
                <MicOff className={iconClass} />
              )}
            </Button>

            {/* Video Toggle */}
            <Button
              onClick={onToggleVideo}
              className={cn(
                buttonClass,
                isVideoEnabled 
                  ? "bg-blue-500/20 border-blue-400/40 text-blue-400 hover:bg-blue-500/30" 
                  : "bg-red-500/20 border-red-400/40 text-red-400 hover:bg-red-500/30"
              )}
              size="sm"
            >
              {isVideoEnabled ? (
                <Video className={iconClass} />
              ) : (
                <VideoOff className={iconClass} />
              )}
            </Button>

            <Separator orientation="vertical" className="h-8 bg-white/20 mx-1" />

            {/* Screen Share */}
            <Button
              onClick={onToggleScreenShare}
              className={cn(
                buttonClass,
                isScreenSharing 
                  ? "bg-orange-500/20 border-orange-400/40 text-orange-400 hover:bg-orange-500/30" 
                  : "bg-slate-700/60 border-slate-600/40 text-slate-300 hover:bg-slate-600/60"
              )}
              size="sm"
            >
              {isScreenSharing ? (
                <MonitorOff className={iconClass} />
              ) : (
                <Monitor className={iconClass} />
              )}
            </Button>

            {/* Switch Camera */}
            <Button
              onClick={onSwitchCamera}
              className={cn(
                buttonClass,
                "bg-slate-700/60 border-slate-600/40 text-slate-300 hover:bg-slate-600/60"
              )}
              size="sm"
            >
              <RotateCcw className={iconClass} />
            </Button>

            <Separator orientation="vertical" className="h-8 bg-white/20 mx-1" />

            {/* Captions */}
            <Button
              onClick={onToggleCaptions}
              className={cn(
                buttonClass,
                captionsEnabled 
                  ? "bg-purple-500/20 border-purple-400/40 text-purple-400 hover:bg-purple-500/30" 
                  : "bg-slate-700/60 border-slate-600/40 text-slate-300 hover:bg-slate-600/60"
              )}
              size="sm"
            >
              {captionsEnabled ? (
                <Captions className={iconClass} />
              ) : (
                <CaptionsOff className={iconClass} />
              )}
            </Button>

            {/* Chat */}
            <Button
              onClick={onToggleChat}
              className={cn(
                buttonClass,
                showChat 
                  ? "bg-blue-500/20 border-blue-400/40 text-blue-400 hover:bg-blue-500/30" 
                  : "bg-slate-700/60 border-slate-600/40 text-slate-300 hover:bg-slate-600/60"
              )}
              size="sm"
            >
              <MessageSquare className={iconClass} />
            </Button>

            {/* Raise Hand */}
            <Button
              onClick={onToggleHand}
              className={cn(
                buttonClass,
                handRaised 
                  ? "bg-yellow-500/20 border-yellow-400/40 text-yellow-400 hover:bg-yellow-500/30 animate-pulse" 
                  : "bg-slate-700/60 border-slate-600/40 text-slate-300 hover:bg-slate-600/60"
              )}
              size="sm"
            >
              <Hand className={iconClass} />
            </Button>

            {/* Effects */}
            <Button
              onClick={onToggleEffects}
              className={cn(
                buttonClass,
                "bg-slate-700/60 border-slate-600/40 text-slate-300 hover:bg-slate-600/60"
              )}
              size="sm"
            >
              <Sparkles className={iconClass} />
            </Button>

            <Separator orientation="vertical" className="h-8 bg-white/20 mx-1" />

            {/* Settings */}
            <Button
              onClick={onToggleSettings}
              className={cn(
                buttonClass,
                showSettings 
                  ? "bg-slate-600/60 border-slate-500/40 text-slate-200 hover:bg-slate-500/60" 
                  : "bg-slate-700/60 border-slate-600/40 text-slate-300 hover:bg-slate-600/60"
              )}
              size="sm"
            >
              <Settings className={iconClass} />
            </Button>

            {/* Dashboard (if available) */}
            {onNavigateToDashboard && (
              <Button
                onClick={onNavigateToDashboard}
                className={cn(
                  buttonClass,
                  "bg-slate-700/60 border-slate-600/40 text-slate-300 hover:bg-slate-600/60"
                )}
                size="sm"
              >
                <LayoutDashboard className={iconClass} />
              </Button>
            )}

            <Separator orientation="vertical" className="h-8 bg-white/20 mx-1" />

            {/* Leave Meeting */}
            <Button
              onClick={onLeaveMeeting}
              className={cn(
                buttonClass,
                "bg-red-500/20 border-red-400/40 text-red-400 hover:bg-red-500/30"
              )}
              size="sm"
            >
              <PhoneOff className={iconClass} />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
