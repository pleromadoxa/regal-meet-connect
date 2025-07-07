
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { DeviceSelector } from '@/components/DeviceSelector';
import { VideoReactions } from '@/components/VideoReactions';
import { RaiseHand } from '@/components/RaiseHand';
import { InMeetingChat } from '@/components/InMeetingChat';
import { 
  Mic, 
  MicOff, 
  Video, 
  VideoOff, 
  Monitor, 
  MonitorOff, 
  Phone, 
  RotateCw,
  Settings,
  ChevronDown,
  LayoutDashboard
} from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

interface VideoControlsProps {
  isVideoEnabled: boolean;
  isAudioEnabled: boolean;
  isScreenSharing: boolean;
  currentFacingMode: 'user' | 'environment';
  currentAudioDevice: string;
  currentVideoDevice: string;
  onToggleVideo: () => void;
  onToggleAudio: () => void;
  onToggleScreenShare: () => void;
  onSwitchCamera: () => void;
  onLeaveMeeting: () => void;
  onDeviceChange: (type: 'audio' | 'video', deviceId: string) => void;
  onToggleCaptions: () => void;
  captionsEnabled: boolean;
  userName?: string;
  onNavigateToDashboard?: () => void;
}

export const VideoControls = ({
  isVideoEnabled,
  isAudioEnabled,
  isScreenSharing,
  currentFacingMode,
  currentAudioDevice,
  currentVideoDevice,
  onToggleVideo,
  onToggleAudio,
  onToggleScreenShare,
  onSwitchCamera,
  onLeaveMeeting,
  onDeviceChange,
  onToggleCaptions,
  captionsEnabled,
  userName = 'User',
  onNavigateToDashboard
}: VideoControlsProps) => {
  const [showDeviceSelector, setShowDeviceSelector] = useState(false);

  const handleSendReaction = (type: 'heart' | 'like' | 'celebration') => {
    window.dispatchEvent(new CustomEvent('send-reaction', {
      detail: { type }
    }));
  };

  const handleHandRaise = (isRaised: boolean) => {
    window.dispatchEvent(new CustomEvent('hand-raise', {
      detail: { isRaised, userName }
    }));
  };

  const handleSendMessage = (message: string) => {
    window.dispatchEvent(new CustomEvent('chat-message', {
      detail: { message, userName }
    }));
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-black/80 backdrop-blur-xl border-t border-white/20 p-2 sm:p-4 pb-safe">
      <div className="flex flex-col sm:flex-row items-center justify-between max-w-6xl mx-auto space-y-3 sm:space-y-0">
        {/* Left side - Reactions */}
        <div className="order-2 sm:order-1 flex items-center space-x-2">
          <VideoReactions onSendReaction={handleSendReaction} />
          <RaiseHand onHandRaise={handleHandRaise} />
          <InMeetingChat userName={userName} onSendMessage={handleSendMessage} />
        </div>

        {/* Center - Main Controls */}
        <div className="flex items-center space-x-1 sm:space-x-2 order-1 sm:order-2">
          {/* Audio Control */}
          <div className="flex items-center">
            <Button
              onClick={onToggleAudio}
              variant="outline"
              size="sm"
              className={`rounded-r-none ${
                isAudioEnabled 
                  ? 'bg-white/20 border-white/40 text-white hover:bg-white/30' 
                  : 'bg-red-500/80 border-red-400 text-white hover:bg-red-600/80'
              } shadow-lg backdrop-blur-sm transition-all duration-200`}
            >
              {isAudioEnabled ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />}
            </Button>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-l-none border-l-0 px-1 sm:px-2 bg-white/20 border-white/40 text-white hover:bg-white/30 shadow-lg backdrop-blur-sm"
                >
                  <ChevronDown className="h-3 w-3" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80 bg-slate-800 border-white/20">
                <DeviceSelector
                  type="audio"
                  currentDeviceId={currentAudioDevice}
                  onDeviceChange={(deviceId) => onDeviceChange('audio', deviceId)}
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Video Control */}
          <div className="flex items-center">
            <Button
              onClick={onToggleVideo}
              variant="outline"
              size="sm"
              className={`rounded-r-none ${
                isVideoEnabled 
                  ? 'bg-white/20 border-white/40 text-white hover:bg-white/30' 
                  : 'bg-red-500/80 border-red-400 text-white hover:bg-red-600/80'
              } shadow-lg backdrop-blur-sm transition-all duration-200`}
            >
              {isVideoEnabled ? <Video className="h-4 w-4" /> : <VideoOff className="h-4 w-4" />}
            </Button>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-l-none border-l-0 px-1 sm:px-2 bg-white/20 border-white/40 text-white hover:bg-white/30 shadow-lg backdrop-blur-sm"
                >
                  <ChevronDown className="h-3 w-3" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80 bg-slate-800 border-white/20">
                <DeviceSelector
                  type="video"
                  currentDeviceId={currentVideoDevice}
                  onDeviceChange={(deviceId) => onDeviceChange('video', deviceId)}
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Screen Share */}
          <Button
            onClick={onToggleScreenShare}
            variant="outline"
            size="sm"
            className={`${
              isScreenSharing 
                ? 'bg-blue-500/80 border-blue-400 text-white hover:bg-blue-600/80' 
                : 'bg-white/20 border-white/40 text-white hover:bg-white/30'
            } shadow-lg backdrop-blur-sm transition-all duration-200`}
          >
            {isScreenSharing ? <MonitorOff className="h-4 w-4" /> : <Monitor className="h-4 w-4" />}
          </Button>

          {/* Switch Camera (Mobile) */}
          <Button
            onClick={onSwitchCamera}
            variant="outline"
            size="sm"
            className="bg-white/20 border-white/40 text-white hover:bg-white/30 shadow-lg backdrop-blur-sm transition-all duration-200 sm:hidden"
          >
            <RotateCw className="h-4 w-4" />
          </Button>

          {/* Captions */}
          <Button
            onClick={onToggleCaptions}
            variant="outline"
            size="sm"
            className={`${
              captionsEnabled 
                ? 'bg-purple-500/80 border-purple-400 text-white hover:bg-purple-600/80' 
                : 'bg-white/20 border-white/40 text-white hover:bg-white/30'
            } shadow-lg backdrop-blur-sm transition-all duration-200 text-xs sm:text-sm px-2 sm:px-3`}
          >
            CC
          </Button>

          {/* Settings */}
          <Popover open={showDeviceSelector} onOpenChange={setShowDeviceSelector}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="bg-white/20 border-white/40 text-white hover:bg-white/30 shadow-lg backdrop-blur-sm transition-all duration-200 hidden sm:flex"
              >
                <Settings className="h-4 w-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-96 bg-slate-800 border-white/20">
              <div className="space-y-4">
                <h3 className="text-white font-semibold">Device Settings</h3>
                <DeviceSelector
                  type="audio"
                  currentDeviceId={currentAudioDevice}
                  onDeviceChange={(deviceId) => onDeviceChange('audio', deviceId)}
                />
                <DeviceSelector
                  type="video"
                  currentDeviceId={currentVideoDevice}
                  onDeviceChange={(deviceId) => onDeviceChange('video', deviceId)}
                />
                <Button
                  onClick={onSwitchCamera}
                  variant="outline"
                  className="w-full border-white/30 text-white hover:bg-white/10"
                >
                  <RotateCw className="h-4 w-4 mr-2" />
                  Switch Camera ({currentFacingMode === 'user' ? 'Front' : 'Back'})
                </Button>
              </div>
            </PopoverContent>
          </Popover>

          {/* Leave Meeting */}
          <Button
            onClick={onLeaveMeeting}
            variant="outline"
            size="sm"
            className="bg-red-500/80 border-red-400 text-white hover:bg-red-600/80 shadow-lg backdrop-blur-sm transition-all duration-200"
          >
            <Phone className="h-4 w-4 rotate-135" />
          </Button>
        </div>

        {/* Right side - Dashboard Navigation */}
        <div className="order-3 flex items-center">
          {onNavigateToDashboard && (
            <Button
              onClick={onNavigateToDashboard}
              variant="outline"
              size="sm"
              className="bg-white/20 border-white/40 text-white hover:bg-white/30 hover:border-white/60 shadow-lg backdrop-blur-sm transition-all duration-200"
            >
              <LayoutDashboard className="h-4 w-4 mr-1 sm:mr-2" />
              <span className="hidden sm:inline">Dashboard</span>
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};
