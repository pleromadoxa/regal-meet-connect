
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { DeviceSelector } from '@/components/DeviceSelector';
import { InMeetingChat } from '@/components/InMeetingChat';
import { RaiseHand } from '@/components/RaiseHand';
import { VideoReactions } from '@/components/VideoReactions';
import { 
  Mic, 
  MicOff, 
  Video, 
  VideoOff, 
  Monitor, 
  MonitorOff, 
  Phone, 
  Settings,
  MessageSquare,
  LayoutDashboard,
  Captions,
  RotateCcw
} from 'lucide-react';

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
  userName: string;
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
  userName,
  onNavigateToDashboard
}: VideoControlsProps) => {
  const [showSettings, setShowSettings] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [handRaised, setHandRaised] = useState(false);

  const handleHandRaise = (isRaised: boolean) => {
    setHandRaised(isRaised);
    // Here you could broadcast the hand raise status to other participants
  };

  return (
    <>
      {/* Main Controls Bar - Fixed at bottom with better mobile positioning */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-black/80 backdrop-blur-lg border-t border-white/10 px-4 py-3 sm:py-4">
        <div className="flex items-center justify-center space-x-2 sm:space-x-4 max-w-4xl mx-auto">
          {/* Audio Control */}
          <Button
            onClick={onToggleAudio}
            variant="outline"
            size="sm"
            className={`${
              isAudioEnabled 
                ? 'bg-white/20 border-white/40 text-white hover:bg-white/30' 
                : 'bg-red-500/80 border-red-400 text-white hover:bg-red-600'
            } shadow-lg backdrop-blur-sm transition-all duration-200 h-10 w-10 sm:h-12 sm:w-12 p-0`}
          >
            {isAudioEnabled ? (
              <Mic className="h-4 w-4 sm:h-5 sm:w-5" />
            ) : (
              <MicOff className="h-4 w-4 sm:h-5 sm:w-5" />
            )}
          </Button>

          {/* Video Control */}
          <Button
            onClick={onToggleVideo}
            variant="outline"
            size="sm"
            className={`${
              isVideoEnabled 
                ? 'bg-white/20 border-white/40 text-white hover:bg-white/30' 
                : 'bg-red-500/80 border-red-400 text-white hover:bg-red-600'
            } shadow-lg backdrop-blur-sm transition-all duration-200 h-10 w-10 sm:h-12 sm:w-12 p-0`}
          >
            {isVideoEnabled ? (
              <Video className="h-4 w-4 sm:h-5 sm:w-5" />
            ) : (
              <VideoOff className="h-4 w-4 sm:h-5 sm:w-5" />
            )}
          </Button>

          {/* Screen Share */}
          <Button
            onClick={onToggleScreenShare}
            variant="outline"
            size="sm"
            className={`${
              isScreenSharing 
                ? 'bg-blue-500/80 border-blue-400 text-white hover:bg-blue-600' 
                : 'bg-white/20 border-white/40 text-white hover:bg-white/30'
            } shadow-lg backdrop-blur-sm transition-all duration-200 h-10 w-10 sm:h-12 sm:w-12 p-0`}
          >
            {isScreenSharing ? (
              <MonitorOff className="h-4 w-4 sm:h-5 sm:w-5" />
            ) : (
              <Monitor className="h-4 w-4 sm:h-5 sm:w-5" />
            )}
          </Button>

          {/* Camera Switch (Mobile only) */}
          <Button
            onClick={onSwitchCamera}
            variant="outline"
            size="sm"
            className="bg-white/20 border-white/40 text-white hover:bg-white/30 shadow-lg backdrop-blur-sm transition-all duration-200 h-10 w-10 sm:h-12 sm:w-12 p-0 sm:hidden"
          >
            <RotateCcw className="h-4 w-4" />
          </Button>

          {/* Raise Hand */}
          <RaiseHand onHandRaise={handleHandRaise} isRaised={handRaised} />

          {/* Video Reactions */}
          <VideoReactions userName={userName} />

          {/* Chat Toggle */}
          <Button
            onClick={() => setShowChat(!showChat)}
            variant="outline"
            size="sm"
            className={`${
              showChat 
                ? 'bg-blue-500/80 border-blue-400 text-white hover:bg-blue-600' 
                : 'bg-white/20 border-white/40 text-white hover:bg-white/30'
            } shadow-lg backdrop-blur-sm transition-all duration-200 h-10 w-10 sm:h-12 sm:w-12 p-0`}
          >
            <MessageSquare className="h-4 w-4 sm:h-5 sm:w-5" />
          </Button>

          {/* Captions Toggle */}
          <Button
            onClick={onToggleCaptions}
            variant="outline"
            size="sm"
            className={`${
              captionsEnabled 
                ? 'bg-purple-500/80 border-purple-400 text-white hover:bg-purple-600' 
                : 'bg-white/20 border-white/40 text-white hover:bg-white/30'
            } shadow-lg backdrop-blur-sm transition-all duration-200 h-10 w-10 sm:h-12 sm:w-12 p-0`}
          >
            <Captions className="h-4 w-4 sm:h-5 sm:w-5" />
          </Button>

          {/* Settings Toggle */}
          <Button
            onClick={() => setShowSettings(!showSettings)}
            variant="outline"
            size="sm"
            className={`${
              showSettings 
                ? 'bg-gray-500/80 border-gray-400 text-white hover:bg-gray-600' 
                : 'bg-white/20 border-white/40 text-white hover:bg-white/30'
            } shadow-lg backdrop-blur-sm transition-all duration-200 h-10 w-10 sm:h-12 sm:w-12 p-0`}
          >
            <Settings className="h-4 w-4 sm:h-5 sm:w-5" />
          </Button>

          {/* Dashboard Navigation */}
          {onNavigateToDashboard && (
            <Button
              onClick={onNavigateToDashboard}
              variant="outline"
              size="sm"
              className="bg-white/20 border-white/40 text-white hover:bg-white/30 shadow-lg backdrop-blur-sm transition-all duration-200 h-10 w-10 sm:h-12 sm:w-12 p-0"
            >
              <LayoutDashboard className="h-4 w-4 sm:h-5 sm:w-5" />
            </Button>
          )}

          {/* Leave Meeting */}
          <Button
            onClick={onLeaveMeeting}
            variant="outline"
            size="sm"
            className="bg-red-500/80 border-red-400 text-white hover:bg-red-600 shadow-lg backdrop-blur-sm transition-all duration-200 h-10 w-10 sm:h-12 sm:w-12 p-0"
          >
            <Phone className="h-4 w-4 sm:h-5 sm:w-5 rotate-135" />
          </Button>
        </div>
      </div>

      {/* Settings Panel */}
      {showSettings && (
        <div className="fixed bottom-20 sm:bottom-24 right-4 z-40 w-80 max-w-[90vw]">
          <Card className="bg-black/90 backdrop-blur-xl border-white/20 p-4">
            <div className="space-y-4">
              <h3 className="text-white font-semibold mb-4">Device Settings</h3>
              
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

              {/* Camera Switch for Desktop */}
              <div className="hidden sm:block">
                <Button
                  onClick={onSwitchCamera}
                  variant="outline"
                  size="sm"
                  className="w-full bg-white/20 border-white/40 text-white hover:bg-white/30"
                >
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Switch Camera ({currentFacingMode === 'user' ? 'Front' : 'Back'})
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* In-Meeting Chat */}
      {showChat && (
        <InMeetingChat
          userName={userName}
          onClose={() => setShowChat(false)}
        />
      )}
    </>
  );
};
