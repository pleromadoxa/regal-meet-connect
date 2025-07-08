
import { useState } from 'react';
import { Button } from '@/components/ui/button';
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
  Hand, 
  MoreHorizontal,
  SwitchCamera,
  Subtitles,
  SubtitlesOff,
  Home,
  Palette
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
  onToggleEffects?: () => void;
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
  const [showMore, setShowMore] = useState(false);

  return (
    <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-30">
      <div className="bg-black/80 backdrop-blur-xl rounded-2xl border border-white/20 shadow-2xl p-4">
        <div className="flex items-center space-x-3">
          {/* Primary Controls */}
          <Button
            onClick={onToggleAudio}
            variant={isAudioEnabled ? "default" : "destructive"}
            size="lg"
            className={`rounded-xl transition-all duration-300 transform hover:scale-110 active:scale-95 ${
              isAudioEnabled 
                ? "bg-white/20 hover:bg-white/30 text-white border-white/30" 
                : "bg-red-500/80 hover:bg-red-500 text-white animate-pulse"
            }`}
          >
            {isAudioEnabled ? (
              <Mic className="h-5 w-5 drop-shadow-lg" />
            ) : (
              <MicOff className="h-5 w-5 drop-shadow-lg" />
            )}
          </Button>

          <Button
            onClick={onToggleVideo}
            variant={isVideoEnabled ? "default" : "destructive"}
            size="lg"
            className={`rounded-xl transition-all duration-300 transform hover:scale-110 active:scale-95 ${
              isVideoEnabled 
                ? "bg-white/20 hover:bg-white/30 text-white border-white/30" 
                : "bg-red-500/80 hover:bg-red-500 text-white animate-pulse"
            }`}
          >
            {isVideoEnabled ? (
              <Video className="h-5 w-5 drop-shadow-lg" />
            ) : (
              <VideoOff className="h-5 w-5 drop-shadow-lg" />
            )}
          </Button>

          <Button
            onClick={onToggleScreenShare}
            variant={isScreenSharing ? "default" : "outline"}
            size="lg"
            className={`rounded-xl transition-all duration-300 transform hover:scale-110 active:scale-95 ${
              isScreenSharing 
                ? "bg-orange-500/80 hover:bg-orange-500 text-white border-orange-400 animate-pulse" 
                : "bg-white/10 hover:bg-white/20 text-white border-white/30"
            }`}
          >
            {isScreenSharing ? (
              <MonitorOff className="h-5 w-5 drop-shadow-lg" />
            ) : (
              <Monitor className="h-5 w-5 drop-shadow-lg" />
            )}
          </Button>

          {/* Secondary Controls */}
          <div className="h-8 w-px bg-white/20"></div>

          <Button
            onClick={onSwitchCamera}
            variant="outline"
            size="lg"
            className="rounded-xl bg-white/10 hover:bg-white/20 text-white border-white/30 transition-all duration-300 transform hover:scale-110 active:scale-95 hover:rotate-180"
          >
            <SwitchCamera className="h-5 w-5 drop-shadow-lg transition-transform duration-300" />
          </Button>

          <Button
            onClick={onToggleHand}
            variant={handRaised ? "default" : "outline"}
            size="lg"
            className={`rounded-xl transition-all duration-300 transform hover:scale-110 active:scale-95 ${
              handRaised 
                ? "bg-yellow-500/80 hover:bg-yellow-500 text-yellow-900 border-yellow-400 animate-bounce" 
                : "bg-white/10 hover:bg-white/20 text-white border-white/30"
            }`}
          >
            <Hand className="h-5 w-5 drop-shadow-lg" />
          </Button>

          <Button
            onClick={onToggleChat}
            variant={showChat ? "default" : "outline"}
            size="lg"
            className={`rounded-xl transition-all duration-300 transform hover:scale-110 active:scale-95 ${
              showChat 
                ? "bg-blue-500/80 hover:bg-blue-500 text-white border-blue-400" 
                : "bg-white/10 hover:bg-white/20 text-white border-white/30"
            }`}
          >
            <MessageSquare className="h-5 w-5 drop-shadow-lg" />
          </Button>

          {/* More Options Toggle */}
          <Button
            onClick={() => setShowMore(!showMore)}
            variant="outline"
            size="lg"
            className={`rounded-xl transition-all duration-300 transform hover:scale-110 active:scale-95 ${
              showMore 
                ? "bg-white/20 hover:bg-white/30 text-white border-white/40" 
                : "bg-white/10 hover:bg-white/20 text-white border-white/30"
            }`}
          >
            <MoreHorizontal className={`h-5 w-5 drop-shadow-lg transition-transform duration-300 ${showMore ? 'rotate-90' : ''}`} />
          </Button>

          {/* Additional Controls (when expanded) */}
          {showMore && (
            <>
              <div className="h-8 w-px bg-white/20"></div>
              
              <Button
                onClick={onToggleCaptions}
                variant={captionsEnabled ? "default" : "outline"}
                size="lg"
                className={`rounded-xl transition-all duration-300 transform hover:scale-110 active:scale-95 ${
                  captionsEnabled 
                    ? "bg-green-500/80 hover:bg-green-500 text-white border-green-400" 
                    : "bg-white/10 hover:bg-white/20 text-white border-white/30"
                }`}
              >
                {captionsEnabled ? (
                  <Subtitles className="h-5 w-5 drop-shadow-lg" />
                ) : (
                  <SubtitlesOff className="h-5 w-5 drop-shadow-lg" />
                )}
              </Button>

              {onToggleEffects && (
                <Button
                  onClick={onToggleEffects}
                  variant="outline"
                  size="lg"
                  className="rounded-xl bg-white/10 hover:bg-white/20 text-white border-white/30 transition-all duration-300 transform hover:scale-110 active:scale-95"
                >
                  <Palette className="h-5 w-5 drop-shadow-lg" />
                </Button>
              )}

              <Button
                onClick={onToggleSettings}
                variant={showSettings ? "default" : "outline"}
                size="lg"
                className={`rounded-xl transition-all duration-300 transform hover:scale-110 active:scale-95 hover:rotate-45 ${
                  showSettings 
                    ? "bg-purple-500/80 hover:bg-purple-500 text-white border-purple-400" 
                    : "bg-white/10 hover:bg-white/20 text-white border-white/30"
                }`}
              >
                <Settings className="h-5 w-5 drop-shadow-lg transition-transform duration-300" />
              </Button>

              {onNavigateToDashboard && (
                <Button
                  onClick={onNavigateToDashboard}
                  variant="outline"
                  size="lg"
                  className="rounded-xl bg-white/10 hover:bg-white/20 text-white border-white/30 transition-all duration-300 transform hover:scale-110 active:scale-95"
                >
                  <Home className="h-5 w-5 drop-shadow-lg" />
                </Button>
              )}
            </>
          )}

          {/* Leave Meeting */}
          <div className="h-8 w-px bg-white/20"></div>
          
          <Button
            onClick={onLeaveMeeting}
            variant="destructive"
            size="lg"
            className="rounded-xl bg-red-600/80 hover:bg-red-600 text-white border-red-500 transition-all duration-300 transform hover:scale-110 active:scale-95 animate-pulse hover:animate-none"
          >
            <Phone className="h-5 w-5 drop-shadow-lg rotate-[135deg]" />
          </Button>
        </div>
      </div>
    </div>
  );
};
