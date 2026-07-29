import { useMemo, useState } from 'react';
import {
  Crown,
  Mic,
  MicOff,
  Monitor,
  Search,
  User,
  Users,
  Volume2,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { StableVideoElement } from './StableVideoElement';
import { cn } from '@/lib/utils';

export interface PresentationParticipant {
  id: string;
  user_id: string;
  user_name: string;
  is_host?: boolean;
  is_muted?: boolean;
  avatar_url?: string | null;
}

interface HostPresentationLayoutProps {
  meetingTitle?: string;
  meetingDescription?: string;
  isHost: boolean;
  userName: string;
  userId: string;
  participants: PresentationParticipant[];
  speakingUserIds?: Set<string>;
  presentationActive: boolean;
  presenterName?: string | null;
  screenStream: MediaStream | null;
  localScreenStream?: MediaStream | null;
  participantCount: number;
  onToggleMute?: (participantId: string, isMuted: boolean) => void;
  isCurrentUserHost?: boolean;
}

function ParticipantRow({
  name,
  isHost,
  isMuted,
  isYou,
  isSpeaking,
  avatarUrl,
}: {
  name: string;
  isHost?: boolean;
  isMuted?: boolean;
  isYou?: boolean;
  isSpeaking?: boolean;
  avatarUrl?: string | null;
}) {
  return (
    <div
      className={cn(
        'flex items-center gap-3 rounded-xl border px-3 py-2.5 transition-colors',
        isSpeaking
          ? 'border-emerald-400/40 bg-emerald-500/10'
          : 'border-white/8 bg-white/[0.03] hover:bg-white/[0.05]'
      )}
    >
      <div className="relative shrink-0">
        {avatarUrl ? (
          <img src={avatarUrl} alt="" className="h-9 w-9 rounded-full object-cover" />
        ) : (
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-orange-500/30 to-purple-600/30 text-sm font-bold text-white">
            {name.charAt(0).toUpperCase()}
          </div>
        )}
        {isSpeaking && (
          <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-[#121212] bg-emerald-400" />
        )}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate text-sm font-medium text-white">
            {name}
            {isYou && <span className="text-white/45"> (you)</span>}
          </span>
          {isHost && (
            <Badge className="h-5 shrink-0 border-amber-400/30 bg-amber-500/15 px-1.5 text-[10px] text-amber-200">
              <Crown className="mr-0.5 h-3 w-3" />
              Host
            </Badge>
          )}
        </div>
      </div>

      {isMuted ? (
        <MicOff className="h-4 w-4 shrink-0 text-red-400" />
      ) : (
        <Mic className="h-4 w-4 shrink-0 text-emerald-400" />
      )}
    </div>
  );
}

export const HostPresentationLayout = ({
  meetingTitle,
  meetingDescription,
  isHost,
  userName,
  userId,
  participants,
  speakingUserIds = new Set(),
  presentationActive,
  presenterName,
  screenStream,
  localScreenStream,
  participantCount,
}: HostPresentationLayoutProps) => {
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const sorted = [...participants].sort((a, b) => {
      if (a.is_host && !b.is_host) return -1;
      if (!a.is_host && b.is_host) return 1;
      return a.user_name.localeCompare(b.user_name);
    });
    if (!q) return sorted;
    return sorted.filter((p) => p.user_name.toLowerCase().includes(q));
  }, [participants, search]);

  const stageStream = localScreenStream ?? screenStream;
  const showScreen = Boolean(stageStream);
  const receivingPresentation = presentationActive && !stageStream;

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3 p-3 sm:flex-row sm:gap-4 sm:p-4">
      {/* Main stage — host screen or audio meeting hero */}
      <div
        className={cn(
          'relative flex min-h-[240px] min-w-0 flex-1 flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#121212] shadow-2xl',
          isHost && 'lg:min-h-[min(72vh,720px)]'
        )}
      >
        {showScreen ? (
          <>
            <StableVideoElement
              stream={stageStream}
              streamId="presentation-screen"
              isLocal={Boolean(isHost && localScreenStream)}
              className="h-full w-full object-contain bg-black"
              muted={Boolean(isHost && localScreenStream)}
            />
            <div className="pointer-events-none absolute inset-x-0 top-0 bg-gradient-to-b from-black/70 to-transparent p-4">
              <div className="flex items-center gap-2 text-white">
                <Monitor className="h-4 w-4 text-orange-400" />
                <span className="text-sm font-semibold">
                  {isHost ? 'You are presenting' : `${presenterName ?? 'Host'} is presenting`}
                </span>
              </div>
            </div>
          </>
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center px-6 py-10 text-center">
            <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl border border-white/10 bg-white/5">
              <Volume2 className="h-8 w-8 text-orange-400" />
            </div>
            <h2 className="text-xl font-bold text-white sm:text-2xl">
              {meetingTitle || 'Audio meeting'}
            </h2>
            {meetingDescription && (
              <p className="mt-2 max-w-lg text-sm text-white/50">{meetingDescription}</p>
            )}
            <p className="mt-6 text-sm text-white/40">
              {receivingPresentation
                ? 'Receiving presentation…'
                : isHost
                  ? 'Tap Present to share your screen — everyone will see only your screen, not participant video.'
                  : 'Waiting for the host to present. Audio is live for all participants.'}
            </p>
            {speakingUserIds.size > 0 && (
              <div className="mt-8 flex flex-wrap justify-center gap-2">
                {Array.from(speakingUserIds).slice(0, 8).map((id) => {
                  const p = participants.find((x) => x.user_id === id);
                  const label = p?.user_name ?? 'Speaker';
                  return (
                    <span
                      key={id}
                      className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/30 bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-200"
                    >
                      <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
                      {label}
                    </span>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Participants — always visible, scrollable for hundreds */}
      <aside className="flex w-full shrink-0 flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#121212]/95 sm:w-[min(100%,320px)] lg:w-80 xl:w-96">
        <div className="border-b border-white/10 p-4">
          <div className="mb-3 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-white">
              <Users className="h-4 w-4 text-orange-400" />
              <span className="font-semibold">Participants</span>
            </div>
            <Badge variant="secondary" className="bg-white/10 text-white">
              {participantCount}
            </Badge>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search participants…"
              className="h-9 border-white/10 bg-white/5 pl-9 text-sm text-white placeholder:text-white/30"
            />
          </div>
        </div>

        <ScrollArea className="flex-1 min-h-[200px] max-h-[min(50vh,420px)] sm:max-h-none sm:flex-1">
          <div className="space-y-2 p-3">
            {!participants.some((p) => p.user_id === userId) && (
              <ParticipantRow
                name={userName}
                isYou
                isHost={isHost}
                isSpeaking={speakingUserIds.has(userId)}
              />
            )}
            {filtered.map((p) => (
              <ParticipantRow
                key={p.id}
                name={p.user_name}
                isHost={p.is_host}
                isMuted={p.is_muted}
                isYou={p.user_id === userId}
                isSpeaking={speakingUserIds.has(p.user_id)}
                avatarUrl={p.avatar_url}
              />
            ))}
            {filtered.length === 0 && (
              <div className="py-8 text-center text-sm text-white/40">
                <User className="mx-auto mb-2 h-8 w-8 opacity-40" />
                No participants match your search
              </div>
            )}
          </div>
        </ScrollArea>
      </aside>
    </div>
  );
};
