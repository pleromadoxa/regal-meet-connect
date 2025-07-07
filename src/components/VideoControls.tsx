
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
    <Card className="bg-white/90 backdrop-blur-lg border-white/30 p-4 shadow-xl">
      <div className="flex items-center justify-center space-x-4">
        {/* Audio Control */}
        <Button
          onClick={onToggleAudio}
          size="lg"
          variant="outline"
          className={`rounded-full p-4 border-2 transition-all duration-200 ${
            isAudioEnabled
              ? 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
              : 'bg-red-500 text-white border-red-600 hover:bg-red-600'
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
              ? 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
              : 'bg-red-500 text-white border-red-600 hover:bg-red-600'
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
              ? 'bg-blue-500 text-white border-blue-600 hover:bg-blue-600'
              : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
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
          className="rounded-full p-4 border-2 bg-red-500 text-white border-red-600 hover:bg-red-600 transition-all duration-200 transform hover:scale-105"
        >
          <Phone className="h-6 w-6 rotate-[135deg]" />
        </Button>
      </div>
    </Card>
  );
};
