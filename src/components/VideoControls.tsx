
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Video, VideoOff, Mic, MicOff, ScreenShare, ScreenShareOff, Phone, SwitchCamera } from 'lucide-react';

interface VideoControlsProps {
  isVideoEnabled: boolean;
  isAudioEnabled: boolean;
  isScreenSharing: boolean;
  currentFacingMode: 'user' | 'environment';
  onToggleVideo: () => void;
  onToggleAudio: () => void;
  onToggleScreenShare: () => void;
  onSwitchCamera: () => void;
  onLeaveMeeting: () => void;
}

export const VideoControls = ({
  isVideoEnabled,
  isAudioEnabled,
  isScreenSharing,
  currentFacingMode,
  onToggleVideo,
  onToggleAudio,
  onToggleScreenShare,
  onSwitchCamera,
  onLeaveMeeting
}: VideoControlsProps) => {
  return (
    <div className="fixed bottom-4 sm:bottom-6 left-1/2 transform -translate-x-1/2 z-50 w-full max-w-lg px-4">
      <Card className="bg-black/90 backdrop-blur-xl border-white/20 p-3 sm:p-6 shadow-2xl">
        <div className="flex items-center justify-center space-x-2 sm:space-x-4 lg:space-x-6">
          {/* Audio Control */}
          <Button
            onClick={onToggleAudio}
            size="lg"
            variant="outline"
            className={`rounded-full p-2 sm:p-3 lg:p-4 border-2 transition-all duration-200 shadow-lg min-w-[48px] min-h-[48px] ${
              isAudioEnabled
                ? 'bg-white text-slate-800 border-white/80 hover:bg-gray-100 hover:shadow-xl'
                : 'bg-red-500 text-white border-red-400 hover:bg-red-600 hover:shadow-xl shadow-red-500/30'
            }`}
          >
            {isAudioEnabled ? (
              <Mic className="h-4 w-4 sm:h-5 sm:w-5 lg:h-6 lg:w-6" />
            ) : (
              <MicOff className="h-4 w-4 sm:h-5 sm:w-5 lg:h-6 lg:w-6" />
            )}
          </Button>

          {/* Video Control */}
          <Button
            onClick={onToggleVideo}
            size="lg"
            variant="outline"
            className={`rounded-full p-2 sm:p-3 lg:p-4 border-2 transition-all duration-200 shadow-lg min-w-[48px] min-h-[48px] ${
              isVideoEnabled
                ? 'bg-white text-slate-800 border-white/80 hover:bg-gray-100 hover:shadow-xl'
                : 'bg-red-500 text-white border-red-400 hover:bg-red-600 hover:shadow-xl shadow-red-500/30'
            }`}
          >
            {isVideoEnabled ? (
              <Video className="h-4 w-4 sm:h-5 sm:w-5 lg:h-6 lg:w-6" />
            ) : (
              <VideoOff className="h-4 w-4 sm:h-5 sm:w-5 lg:h-6 lg:w-6" />
            )}
          </Button>

          {/* Camera Switch Control - Only show on mobile */}
          <div className="block sm:hidden">
            <Button
              onClick={onSwitchCamera}
              size="lg"
              variant="outline"
              className="rounded-full p-2 border-2 bg-white text-slate-800 border-white/80 hover:bg-gray-100 transition-all duration-200 shadow-lg min-w-[48px] min-h-[48px]"
            >
              <SwitchCamera className="h-4 w-4" />
            </Button>
          </div>

          {/* Screen Share Control */}
          <Button
            onClick={onToggleScreenShare}
            size="lg"
            variant="outline"
            className={`rounded-full p-2 sm:p-3 lg:p-4 border-2 transition-all duration-200 shadow-lg min-w-[48px] min-h-[48px] ${
              isScreenSharing
                ? 'bg-blue-500 text-white border-blue-400 hover:bg-blue-600 hover:shadow-xl shadow-blue-500/30'
                : 'bg-white text-slate-800 border-white/80 hover:bg-gray-100 hover:shadow-xl'
            }`}
          >
            {isScreenSharing ? (
              <ScreenShareOff className="h-4 w-4 sm:h-5 sm:w-5 lg:h-6 lg:w-6" />
            ) : (
              <ScreenShare className="h-4 w-4 sm:h-5 sm:w-5 lg:h-6 lg:w-6" />
            )}
          </Button>

          {/* Camera Switch Control - Show on larger screens */}
          <div className="hidden sm:block">
            <Button
              onClick={onSwitchCamera}
              size="lg"
              variant="outline"
              className="rounded-full p-3 lg:p-4 border-2 bg-white text-slate-800 border-white/80 hover:bg-gray-100 transition-all duration-200 shadow-lg"
            >
              <SwitchCamera className="h-5 w-5 lg:h-6 lg:w-6" />
            </Button>
          </div>

          {/* Leave Meeting */}
          <Button
            onClick={onLeaveMeeting}
            size="lg"
            variant="outline"
            className="rounded-full p-2 sm:p-3 lg:p-4 border-2 bg-red-500 text-white border-red-400 hover:bg-red-600 transition-all duration-200 transform hover:scale-105 hover:shadow-xl shadow-red-500/30 min-w-[48px] min-h-[48px]"
          >
            <Phone className="h-4 w-4 sm:h-5 sm:w-5 lg:h-6 lg:w-6 rotate-[135deg]" />
          </Button>
        </div>
      </Card>
    </div>
  );
};
