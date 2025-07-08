
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
      <div className="bg-black/95 backdrop-blur-xl rounded-2xl border border-white/30 p-4 shadow-2xl">
        <div className="flex items-center space-x-3">
          {/* Audio Control */}
          <Button
            onClick={onToggleAudio}
            variant={isAudioEnabled ? "default" : "destructive"}
            size="lg"
            className={`rounded-xl transition-all duration-300 text-white border-2 ${
              isAudioEnabled 
                ? "bg-green-600 hover:bg-green-700 border-green-500 shadow-green-500/30" 
                : "bg-red-600 hover:bg-red-700 border-red-500 shadow-red-500/30"
            } shadow-lg`}
          >
            {isAudioEnabled ? <Mic className="h-6 w-6" /> : <MicOff className="h-6 w-6" />}
          </Button>

          {/* Video Control */}
          <Button
            onClick={onToggleVideo}
            variant={isVideoEnabled ? "default" : "destructive"}
            size="lg"
            className={`rounded-xl transition-all duration-300 text-white border-2 ${
              isVideoEnabled 
                ? "bg-blue-600 hover:bg-blue-700 border-blue-500 shadow-blue-500/30" 
                : "bg-red-600 hover:bg-red-700 border-red-500 shadow-red-500/30"
            } shadow-lg`}
          >
            {isVideoEnabled ? <Video className="h-6 w-6" /> : <VideoOff className="h-6 w-6" />}
          </Button>

          {/* Screen Share */}
          <Button
            onClick={onToggleScreenShare}
            variant={isScreenSharing ? "default" : "outline"}
            size="lg"
            className={`rounded-xl transition-all duration-300 text-white border-2 ${
              isScreenSharing 
                ? "bg-purple-600 hover:bg-purple-700 border-purple-500 shadow-purple-500/30" 
                : "bg-white/20 hover:bg-white/30 border-white/50"
            } shadow-lg`}
          >
            {isScreenSharing ? <MonitorOff className="h-6 w-6" /> : <Monitor className="h-6 w-6" />}
          </Button>

          {/* Switch Camera */}
          <Button
            onClick={onSwitchCamera}
            variant="outline"
            size="lg"
            className="rounded-xl bg-white/20 hover:bg-white/30 border-2 border-white/50 text-white shadow-lg transition-all duration-300"
          >
            <SwitchCamera className="h-6 w-6" />
          </Button>

          {/* Captions */}
          <Button
            onClick={onToggleCaptions}
            variant={captionsEnabled ? "default" : "outline"}
            size="lg"
            className={`rounded-xl transition-all duration-300 text-white border-2 ${
              captionsEnabled 
                ? "bg-indigo-600 hover:bg-indigo-700 border-indigo-500 shadow-indigo-500/30" 
                : "bg-white/20 hover:bg-white/30 border-white/50"
            } shadow-lg`}
          >
            <Subtitles className="h-6 w-6" />
          </Button>

          {/* Video Effects */}
          <Button
            onClick={onToggleEffects}
            variant="outline"
            size="lg"
            className="rounded-xl bg-white/20 hover:bg-white/30 border-2 border-white/50 text-white shadow-lg transition-all duration-300"
          >
            <Palette className="h-6 w-6" />
          </Button>

          {/* Hand Raise */}
          <Button
            onClick={onToggleHand}
            variant={handRaised ? "default" : "outline"}
            size="lg"
            className={`rounded-xl transition-all duration-300 text-white border-2 ${
              handRaised 
                ? "bg-yellow-600 hover:bg-yellow-700 border-yellow-500 shadow-yellow-500/30 animate-pulse" 
                : "bg-white/20 hover:bg-white/30 border-white/50"
            } shadow-lg`}
          >
            <Hand className="h-6 w-6" />
          </Button>

          {/* Chat */}
          <Button
            onClick={onToggleChat}
            variant={showChat ? "default" : "outline"}
            size="lg"
            className={`rounded-xl transition-all duration-300 text-white border-2 ${
              showChat 
                ? "bg-cyan-600 hover:bg-cyan-700 border-cyan-500 shadow-cyan-500/30" 
                : "bg-white/20 hover:bg-white/30 border-white/50"
            } shadow-lg`}
          >
            <MessageSquare className="h-6 w-6" />
          </Button>

          {/* Settings */}
          <Button
            onClick={onToggleSettings}
            variant={showSettings ? "default" : "outline"}
            size="lg"
            className={`rounded-xl transition-all duration-300 text-white border-2 ${
              showSettings 
                ? "bg-gray-600 hover:bg-gray-700 border-gray-500 shadow-gray-500/30" 
                : "bg-white/20 hover:bg-white/30 border-white/50"
            } shadow-lg`}
          >
            <Settings className="h-6 w-6" />
          </Button>

          {/* Dashboard */}
          {onNavigateToDashboard && (
            <Button
              onClick={onNavigateToDashboard}
              variant="outline"
              size="lg"
              className="rounded-xl bg-white/20 hover:bg-white/30 border-2 border-white/50 text-white shadow-lg transition-all duration-300"
            >
              <LayoutDashboard className="h-6 w-6" />
            </Button>
          )}

          {/* Leave Meeting */}
          <Button
            onClick={onLeaveMeeting}
            variant="destructive"
            size="lg"
            className="rounded-xl bg-red-600 hover:bg-red-700 border-2 border-red-500 text-white shadow-red-500/30 shadow-lg transition-all duration-300"
          >
            <LogOut className="h-6 w-6" />
          </Button>
        </div>
      </div>
    </div>
  );
};
