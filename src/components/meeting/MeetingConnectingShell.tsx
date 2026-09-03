import { Loader2, Mic, Video } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface MeetingConnectingShellProps {
  message?: string;
  subMessage?: string;
  onRequestPermissions?: () => void;
  onJoinAudioOnly?: () => void;
  showActions?: boolean;
}

export function MeetingConnectingShell({
  message = 'Connecting to meeting…',
  subMessage,
  onRequestPermissions,
  onJoinAudioOnly,
  showActions = false,
}: MeetingConnectingShellProps) {
  return (
    <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-[#202124]/95 px-6 backdrop-blur-sm">
      <Video className="mb-4 h-10 w-10 animate-pulse text-orange-400" />
      <Loader2 className="mb-3 h-8 w-8 animate-spin text-white/80" />
      <p className="text-center text-lg font-medium text-white">{message}</p>
      {subMessage && <p className="mt-2 max-w-sm text-center text-sm text-white/55">{subMessage}</p>}

      {showActions && (
        <div className="mt-8 flex w-full max-w-xs flex-col gap-2">
          {onRequestPermissions && (
            <Button
              type="button"
              onClick={onRequestPermissions}
              className="w-full bg-orange-500 hover:bg-orange-600"
            >
              <Video className="mr-2 h-4 w-4" />
              Enable camera & microphone
            </Button>
          )}
          {onJoinAudioOnly && (
            <Button
              type="button"
              variant="outline"
              onClick={onJoinAudioOnly}
              className="w-full border-white/20 bg-white/5 text-white hover:bg-white/10"
            >
              <Mic className="mr-2 h-4 w-4" />
              Join with audio only
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
