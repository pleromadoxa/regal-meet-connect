
import React from 'react';
import { Button } from '@/components/ui/button';
import { 
  Mic, 
  MicOff, 
  Video, 
  VideoOff, 
  Monitor, 
  MonitorOff, 
  SwitchCamera, 
  Settings, 
  MessageSquare, 
  Hand, 
  Palette, 
  LogOut,
  LayoutDashboard,
  Subtitles
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
  return (
    <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50">
      <div className="bg-black/90 backdrop-blur-xl rounded-2xl border border-white/20 p-4 shadow-2xl">
        <div className="flex items-center space-x-3">
          {/* Audio Control */}
          <Button
            onClick={onToggleAudio}
            variant={isAudioEnabled ? "default" : "destructive"}
            size="lg"
            className={`rounded-xl transition-all duration-300 ${
              isAudioEnabled 
                ? "bg-green-600 hover:bg-green-700 shadow-green-500/20" 
                : "bg-red-600 hover:bg-red-700 shadow-red-500/20"
            } shadow-lg`}
          >
            {isAudioEnabled ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5" />}
          </Button>

          {/* Video Control */}
          <Button
            onClick={onToggleVideo}
            variant={isVideoEnabled ? "default" : "destructive"}
            size="lg"
            className={`rounded-xl transition-all duration-300 ${
              isVideoEnabled 
                ? "bg-blue-600 hover:bg-blue-700 shadow-blue-500/20" 
                : "bg-red-600 hover:bg-red-700 shadow-red-500/20"
            } shadow-lg`}
          >
            {isVideoEnabled ? <Video className="h-5 w-5" /> : <VideoOff className="h-5 w-5" />}
          </Button>

          {/* Screen Share */}
          <Button
            onClick={onToggleScreenShare}
            variant={isScreenSharing ? "default" : "outline"}
            size="lg"
            className={`rounded-xl transition-all duration-300 ${
              isScreenSharing 
                ? "bg-purple-600 hover:bg-purple-700 shadow-purple-500/20" 
                : "bg-white/10 hover:bg-white/20 border-white/30"
            } shadow-lg`}
          >
            {isScreenSharing ? <MonitorOff className="h-5 w-5" /> : <Monitor className="h-5 w-5" />}
          </Button>

          {/* Switch Camera */}
          <Button
            onClick={onSwitchCamera}
            variant="outline"
            size="lg"
            className="rounded-xl bg-white/10 hover:bg-white/20 border-white/30 shadow-lg transition-all duration-300"
          >
            <SwitchCamera className="h-5 w-5" />
          </Button>

          {/* Captions */}
          <Button
            onClick={onToggleCaptions}
            variant={captionsEnabled ? "default" : "outline"}
            size="lg"
            className={`rounded-xl transition-all duration-300 ${
              captionsEnabled 
                ? "bg-indigo-600 hover:bg-indigo-700 shadow-indigo-500/20" 
                : "bg-white/10 hover:bg-white/20 border-white/30"
            } shadow-lg`}
          >
            <Subtitles className="h-5 w-5" />
          </Button>

          {/* Video Effects */}
          <Button
            onClick={onToggleEffects}
            variant="outline"
            size="lg"
            className="rounded-xl bg-white/10 hover:bg-white/20 border-white/30 shadow-lg transition-all duration-300"
          >
            <Palette className="h-5 w-5" />
          </Button>

          {/* Hand Raise */}
          <Button
            onClick={onToggleHand}
            variant={handRaised ? "default" : "outline"}
            size="lg"
            className={`rounded-xl transition-all duration-300 ${
              handRaised 
                ? "bg-yellow-600 hover:bg-yellow-700 shadow-yellow-500/20 animate-pulse" 
                : "bg-white/10 hover:bg-white/20 border-white/30"
            } shadow-lg`}
          >
            <Hand className="h-5 w-5" />
          </Button>

          {/* Chat */}
          <Button
            onClick={onToggleChat}
            variant={showChat ? "default" : "outline"}
            size="lg"
            className={`rounded-xl transition-all duration-300 ${
              showChat 
                ? "bg-cyan-600 hover:bg-cyan-700 shadow-cyan-500/20" 
                : "bg-white/10 hover:bg-white/20 border-white/30"
            } shadow-lg`}
          >
            <MessageSquare className="h-5 w-5" />
          </Button>

          {/* Settings */}
          <Button
            onClick={onToggleSettings}
            variant={showSettings ? "default" : "outline"}
            size="lg"
            className={`rounded-xl transition-all duration-300 ${
              showSettings 
                ? "bg-gray-600 hover:bg-gray-700 shadow-gray-500/20" 
                : "bg-white/10 hover:bg-white/20 border-white/30"
            } shadow-lg`}
          >
            <Settings className="h-5 w-5" />
          </Button>

          {/* Dashboard */}
          {onNavigateToDashboard && (
            <Button
              onClick={onNavigateToDashboard}
              variant="outline"
              size="lg"
              className="rounded-xl bg-white/10 hover:bg-white/20 border-white/30 shadow-lg transition-all duration-300"
            >
              <LayoutDashboard className="h-5 w-5" />
            </Button>
          )}

          {/* Leave Meeting */}
          <Button
            onClick={onLeaveMeeting}
            variant="destructive"
            size="lg"
            className="rounded-xl bg-red-600 hover:bg-red-700 shadow-red-500/20 shadow-lg transition-all duration-300"
          >
            <LogOut className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </div>
  );
};
