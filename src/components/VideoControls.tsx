
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
    <Card className="bg-black/30 backdrop-blur-lg border-white/10 p-4">
      <div className="flex items-center justify-center space-x-4">
        {/* Audio Control */}
        <Button
          onClick={onToggleAudio}
          size="lg"
          className={`rounded-full p-4 transition-all duration-200 ${
            isAudioEnabled
              ? 'bg-slate-600 hover:bg-slate-700 text-white'
              : 'bg-red-600 hover:bg-red-700 text-white'
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
          className={`rounded-full p-4 transition-all duration-200 ${
            isVideoEnabled
              ? 'bg-slate-600 hover:bg-slate-700 text-white'
              : 'bg-red-600 hover:bg-red-700 text-white'
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
          className={`rounded-full p-4 transition-all duration-200 ${
            isScreenSharing
              ? 'bg-yellow-600 hover:bg-yellow-700 text-white'
              : 'bg-slate-600 hover:bg-slate-700 text-white'
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
          className="rounded-full p-4 bg-red-600 hover:bg-red-700 text-white transition-all duration-200 transform hover:scale-105"
        >
          <Phone className="h-6 w-6 rotate-[135deg]" />
        </Button>
      </div>
    </Card>
  );
};
