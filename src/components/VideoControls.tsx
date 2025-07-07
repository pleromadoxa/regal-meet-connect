
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { DeviceSelector } from '@/components/DeviceSelector';
import { VideoReactions } from '@/components/VideoReactions';
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
  ChevronDown
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
  captionsEnabled
}: VideoControlsProps) => {
  const [showDeviceSelector, setShowDeviceSelector] = useState(false);

  const handleSendReaction = (type: 'heart' | 'like' | 'celebration') => {
    // Broadcast reaction to other participants
    window.dispatchEvent(new CustomEvent('send-reaction', {
      detail: { type }
    }));
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-black/80 backdrop-blur-xl border-t border-white/20 p-3 sm:p-4">
      <div className="flex flex-col sm:flex-row items-center justify-between max-w-6xl mx-auto space-y-4 sm:space-y-0">
        {/* Reactions */}
        <div className="order-2 sm:order-1">
          <VideoReactions onSendReaction={handleSendReaction} />
        </div>

        {/* Main Controls */}
        <div className="flex items-center space-x-2 sm:space-x-4 order-1 sm:order-2">
          {/* Audio Control with Device Selector */}
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
                  className="rounded-l-none border-l-0 px-2 bg-white/20 border-white/40 text-white hover:bg-white/30 shadow-lg backdrop-blur-sm"
                >
                  <ChevronDown className="h-3 w-3" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80 bg-slate-800 border-white/20">
                <DeviceSelector
                  type="audio"
                  currentDevice={currentAudioDevice}
                  onDeviceChange={(deviceId) => onDeviceChange('audio', deviceId)}
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Video Control with Device Selector */}
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
                  className="rounded-l-none border-l-0 px-2 bg-white/20 border-white/40 text-white hover:bg-white/30 shadow-lg backdrop-blur-sm"
                >
                  <ChevronDown className="h-3 w-3" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80 bg-slate-800 border-white/20">
                <DeviceSelector
                  type="video"
                  currentDevice={currentVideoDevice}
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
            } shadow-lg backdrop-blur-sm transition-all duration-200`}
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
                  currentDevice={currentAudioDevice}
                  onDeviceChange={(deviceId) => onDeviceChange('audio', deviceId)}
                />
                <DeviceSelector
                  type="video"
                  currentDevice={currentVideoDevice}
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

        {/* Empty space for balance on mobile */}
        <div className="order-3 sm:order-3 w-20 sm:w-0"></div>
      </div>
    </div>
  );
};
