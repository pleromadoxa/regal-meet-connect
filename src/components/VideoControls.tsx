
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Video, VideoOff, Mic, MicOff, ScreenShare, ScreenShareOff, Phone } from 'lucide-react';

interface VideoControlsProps {
  isVideoEnabled: boolean;
  isAudioEnabled: boolean;
  isScreenSharing: boolean;
  onToggleVideo: () => void;
  onToggleAudio: () => void;
  onToggleScreenShare: () => void;
  onLeaveMeeting: () => void;
}

export const VideoControls = ({
  isVideoEnabled,
  isAudioEnabled,
  isScreenSharing,
  onToggleVideo,
  onToggleAudio,
  onToggleScreenShare,
  onLeaveMeeting
}: VideoControlsProps) => {
  return (
    <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50">
      <Card className="bg-black/80 backdrop-blur-lg border-white/10 p-4 shadow-2xl">
        <div className="flex items-center justify-center space-x-4">
          {/* Audio Control */}
          <Button
            onClick={onToggleAudio}
            size="lg"
            variant="outline"
            className={`rounded-full p-4 border-2 transition-all duration-200 ${
              isAudioEnabled
                ? 'bg-white/90 text-slate-800 border-white/50 hover:bg-white hover:shadow-lg'
                : 'bg-red-500/90 text-white border-red-400/50 hover:bg-red-600 hover:shadow-lg shadow-red-500/25'
            }`}
          >
            {isAudioEnabled ? (
              <Mic className="h-6 w-6" />
            ) : (
              <MicOff className="h-6 w-6" />
            )}
          </Button>

          {/* Video Control */}
          <Button
            onClick={onToggleVideo}
            size="lg"
            variant="outline"
            className={`rounded-full p-4 border-2 transition-all duration-200 ${
              isVideoEnabled
                ? 'bg-white/90 text-slate-800 border-white/50 hover:bg-white hover:shadow-lg'
                : 'bg-red-500/90 text-white border-red-400/50 hover:bg-red-600 hover:shadow-lg shadow-red-500/25'
            }`}
          >
            {isVideoEnabled ? (
              <Video className="h-6 w-6" />
            ) : (
              <VideoOff className="h-6 w-6" />
            )}
          </Button>

          {/* Screen Share Control */}
          <Button
            onClick={onToggleScreenShare}
            size="lg"
            variant="outline"
            className={`rounded-full p-4 border-2 transition-all duration-200 ${
              isScreenSharing
                ? 'bg-blue-500/90 text-white border-blue-400/50 hover:bg-blue-600 hover:shadow-lg shadow-blue-500/25'
                : 'bg-white/90 text-slate-800 border-white/50 hover:bg-white hover:shadow-lg'
            }`}
          >
            {isScreenSharing ? (
              <ScreenShareOff className="h-6 w-6" />
            ) : (
              <ScreenShare className="h-6 w-6" />
            )}
          </Button>

          {/* Leave Meeting */}
          <Button
            onClick={onLeaveMeeting}
            size="lg"
            variant="outline"
            className="rounded-full p-4 border-2 bg-red-500/90 text-white border-red-400/50 hover:bg-red-600 transition-all duration-200 transform hover:scale-105 hover:shadow-lg shadow-red-500/25"
          >
            <Phone className="h-6 w-6 rotate-[135deg]" />
          </Button>
        </div>
      </Card>
    </div>
  );
};
