import { useMeetingLobbyGuest } from '@/hooks/useMeetingLobbyGuest';
import { Button } from '@/components/ui/button';
import { Loader2, Crown, Video, ShieldCheck } from 'lucide-react';
import lobbyImage from '@/assets/lobby-wait.jpg';

interface MeetingLobbyProps {
  meetingId: string;
  userId: string;
  userName: string;
  onAdmit: () => void;
  onCancel: () => void;
}

export const MeetingLobby = ({ meetingId, userId, userName, onAdmit, onCancel }: MeetingLobbyProps) => {
  const { status } = useMeetingLobbyGuest({
    meetingId,
    userId,
    userName,
    onAdmit,
    onDeny: onCancel,
  });

  return (
    <div className="min-h-screen-safe flex flex-col lg:flex-row bg-[#0a0612]">
      <div className="flex flex-1 items-center justify-center p-5 sm:p-8 md:p-10 lg:p-12 safe-area-inset-top safe-area-inset-bottom">
        <div className="w-full max-w-md text-center space-y-6">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 border border-white/10 text-white/70 text-xs">
            <Video className="h-3.5 w-3.5 text-orange-400" />
            Regal Meeting Lobby
          </div>

          <h1 className="text-3xl sm:text-4xl font-bold text-white tracking-tight">
            {status === 'admitted'
              ? "You're in! Joining now…"
              : status === 'denied'
                ? 'Entry declined'
                : 'Waiting for the host'}
          </h1>

          <p className="text-white/60">
            {status === 'admitted'
              ? 'Connecting you to the meeting room.'
              : status === 'denied'
                ? 'The host did not let you in. You can try again later.'
                : `We've let the host know you're here, ${userName}. They'll admit you shortly.`}
          </p>

          <div className="flex items-center justify-center gap-3 text-white/50 text-sm">
            {status === 'knocking' && (
              <>
                <Loader2 className="h-4 w-4 animate-spin text-orange-400" />
                <span>Notifying host…</span>
              </>
            )}
            {status === 'admitted' && <ShieldCheck className="h-5 w-5 text-emerald-400" />}
          </div>

          <div className="flex items-center justify-center gap-3 pt-2">
            <div className="h-9 w-9 rounded-full bg-gradient-to-br from-orange-400 to-red-600 flex items-center justify-center text-white text-sm font-semibold">
              {userName.charAt(0).toUpperCase()}
            </div>
            <div className="text-left">
              <div className="text-white text-sm font-medium">{userName}</div>
              <div className="text-white/40 text-xs">Meeting · {meetingId}</div>
            </div>
          </div>

          <Button
            variant="outline"
            onClick={onCancel}
            className="border-white/15 bg-white/5 text-white hover:bg-white/10"
          >
            Cancel and leave
          </Button>
        </div>
      </div>

      <div className="relative hidden min-h-[280px] flex-1 items-end overflow-hidden md:flex lg:min-h-screen">
        <img src={lobbyImage} alt="Waiting for host" className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent" />
        <div className="relative z-10 p-8 md:p-10 xl:p-16">
          <div className="inline-flex items-center gap-2 text-orange-300 mb-3">
            <Crown className="h-4 w-4" />
            <span className="text-xs font-semibold uppercase tracking-wider">Host approval required</span>
          </div>
          <h2 className="max-w-md text-2xl font-bold leading-tight text-white md:text-3xl xl:text-4xl">
            Sit tight — your meeting starts in moments.
          </h2>
        </div>
      </div>
    </div>
  );
};
