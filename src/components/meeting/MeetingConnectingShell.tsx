import { Loader2, Video } from 'lucide-react';

interface MeetingConnectingShellProps {
  message?: string;
  subMessage?: string;
}

export function MeetingConnectingShell({
  message = 'Connecting to meeting…',
  subMessage,
}: MeetingConnectingShellProps) {
  return (
    <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-[#202124]/95 backdrop-blur-sm">
      <Video className="mb-4 h-10 w-10 text-orange-400 animate-pulse" />
      <Loader2 className="mb-3 h-8 w-8 animate-spin text-white/80" />
      <p className="text-lg font-medium text-white">{message}</p>
      {subMessage && <p className="mt-2 text-sm text-white/55">{subMessage}</p>}
    </div>
  );
}
