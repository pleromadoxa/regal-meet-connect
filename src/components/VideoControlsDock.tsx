
import React from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
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
  Phone, 
  RotateCcw, 
  Captions,
  CaptionsOff,
  LayoutDashboard
} from 'lucide-react';

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
  onNavigateToDashboard,
  onLeaveMeeting
}: VideoControlsDockProps) => {
  return (
    <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 z-50">
      <Card className="bg-black/90 backdrop-blur-xl border-white/20 shadow-2xl">
        <div className="flex items-center justify-center space-x-2 p-4">
          {/* Microphone */}
          <Button
            onClick={onToggleAudio}
            variant="ghost"
            size="lg"
            className={`h-14 w-14 rounded-full ${
              isAudioEnabled 
                ? 'bg-white/20 hover:bg-white/30 text-white' 
                : 'bg-red-500/80 hover:bg-red-600/80 text-white'
            } transition-all duration-300 shadow-lg`}
          >
            {isAudioEnabled ? <Mic className="h-6 w-6" /> : <MicOff className="h-6 w-6" />}
          </Button>

          {/* Video */}
          <Button
            onClick={onToggleVideo}
            variant="ghost"
            size="lg"
            className={`h-14 w-14 rounded-full ${
              isVideoEnabled 
                ? 'bg-white/20 hover:bg-white/30 text-white' 
                : 'bg-red-500/80 hover:bg-red-600/80 text-white'
            } transition-all duration-300 shadow-lg`}
          >
            {isVideoEnabled ? <Video className="h-6 w-6" /> : <VideoOff className="h-6 w-6" />}
          </Button>

          {/* Switch Camera */}
          <Button
            onClick={onSwitchCamera}
            variant="ghost"
            size="lg"
            className="h-14 w-14 rounded-full bg-white/20 hover:bg-white/30 text-white transition-all duration-300 shadow-lg"
          >
            <RotateCcw className="h-6 w-6" />
          </Button>

          {/* Screen Share */}
          <Button
            onClick={onToggleScreenShare}
            variant="ghost"
            size="lg"
            className={`h-14 w-14 rounded-full ${
              isScreenSharing 
                ? 'bg-orange-500/80 hover:bg-orange-600/80 text-white' 
                : 'bg-white/20 hover:bg-white/30 text-white'
            } transition-all duration-300 shadow-lg`}
          >
            {isScreenSharing ? <MonitorOff className="h-6 w-6" /> : <Monitor className="h-6 w-6" />}
          </Button>

          {/* Captions */}
          <Button
            onClick={onToggleCaptions}
            variant="ghost"
            size="lg"
            className={`h-14 w-14 rounded-full ${
              captionsEnabled 
                ? 'bg-blue-500/80 hover:bg-blue-600/80 text-white' 
                : 'bg-white/20 hover:bg-white/30 text-white'
            } transition-all duration-300 shadow-lg`}
          >
            {captionsEnabled ? <Captions className="h-6 w-6" /> : <CaptionsOff className="h-6 w-6" />}
          </Button>

          {/* Raise Hand */}
          <Button
            onClick={onToggleHand}
            variant="ghost"
            size="lg"
            className={`h-14 w-14 rounded-full ${
              handRaised 
                ? 'bg-yellow-500/80 hover:bg-yellow-600/80 text-white' 
                : 'bg-white/20 hover:bg-white/30 text-white'
            } transition-all duration-300 shadow-lg`}
          >
            <Hand className="h-6 w-6" />
          </Button>

          {/* Chat */}
          <Button
            onClick={onToggleChat}
            variant="ghost"
            size="lg"
            className={`h-14 w-14 rounded-full ${
              showChat 
                ? 'bg-green-500/80 hover:bg-green-600/80 text-white' 
                : 'bg-white/20 hover:bg-white/30 text-white'
            } transition-all duration-300 shadow-lg`}
          >
            <MessageSquare className="h-6 w-6" />
          </Button>

          {/* Settings */}
          <Button
            onClick={onToggleSettings}
            variant="ghost"
            size="lg"
            className={`h-14 w-14 rounded-full ${
              showSettings 
                ? 'bg-gray-500/80 hover:bg-gray-600/80 text-white' 
                : 'bg-white/20 hover:bg-white/30 text-white'
            } transition-all duration-300 shadow-lg`}
          >
            <Settings className="h-6 w-6" />
          </Button>

          {/* Dashboard */}
          {onNavigateToDashboard && (
            <Button
              onClick={onNavigateToDashboard}
              variant="ghost"
              size="lg"
              className="h-14 w-14 rounded-full bg-white/20 hover:bg-white/30 text-white transition-all duration-300 shadow-lg"
            >
              <LayoutDashboard className="h-6 w-6" />
            </Button>
          )}

          {/* Leave Meeting - Larger and centered */}
          <div className="ml-4 pl-4 border-l border-white/20">
            <Button
              onClick={onLeaveMeeting}
              variant="ghost"
              size="lg"
              className="h-16 w-16 rounded-full bg-red-500/80 hover:bg-red-600/80 text-white transition-all duration-300 shadow-lg flex items-center justify-center"
            >
              <Phone className="h-8 w-8 rotate-135" />
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
};
