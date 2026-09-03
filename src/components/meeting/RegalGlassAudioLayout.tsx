import React, { useEffect, useMemo } from 'react';
import { Menu, Mic, MicOff, Crown } from 'lucide-react';
import { ProfileAvatar } from '@/components/ProfileAvatar';
import { AudioIndicator } from '@/components/AudioIndicator';
import { useAuth } from '@/hooks/useAuth';
import { resolveAvatarUrl } from '@/lib/profileAvatar';
import { cn } from '@/lib/utils';

interface RemoteStream {
  id: string;
  stream: MediaStream;
  userName: string;
}

interface ParticipantLike {
  user_id?: string;
  user_name?: string;
  is_host?: boolean;
  is_muted?: boolean;
  avatar_url?: string | null;
}

interface RegalGlassAudioLayoutProps {
  localStream: MediaStream | null;
  remoteStreams: RemoteStream[];
  userName: string;
  selectedParticipantId: string;
  onSelectParticipant: (id: string) => void;
  isCurrentUserHost: boolean;
  participants: ParticipantLike[];
  currentUserId: string;
  speakingParticipants?: Set<string>;
  raisedHands?: Set<string>;
}

type Tile = {
  id: string;
  stream: MediaStream | null;
  name: string;
  isLocal: boolean;
  isHost: boolean;
  isMuted: boolean;
  avatarUrl?: string | null;
};

export const RegalGlassAudioLayout = ({
  localStream,
  remoteStreams,
  userName,
  selectedParticipantId,
  onSelectParticipant,
  isCurrentUserHost,
  participants,
  currentUserId,
  speakingParticipants = new Set(),
  raisedHands = new Set(),
}: RegalGlassAudioLayoutProps) => {
  const { user, profile } = useAuth();
  const localAvatar = resolveAvatarUrl(profile, user);
  const email = user?.email || '';

  const tiles = useMemo<Tile[]>(() => {
    const localMuted = !(localStream?.getAudioTracks()?.[0]?.enabled ?? true);
    const localTile: Tile = {
      id: 'local',
      stream: localStream,
      name: userName,
      isLocal: true,
      isHost: isCurrentUserHost,
      isMuted: localMuted,
      avatarUrl: localAvatar,
    };

    const remotes: Tile[] = remoteStreams.map((remote) => {
      const participant = participants.find((p) => p.user_id === remote.id);
      return {
        id: remote.id,
        stream: remote.stream,
        name: remote.userName || participant?.user_name || 'Guest',
        isLocal: false,
        isHost: Boolean(participant?.is_host),
        isMuted:
          participant?.is_muted ??
          !(remote.stream?.getAudioTracks()?.[0]?.enabled ?? true),
        avatarUrl: participant?.avatar_url,
      };
    });

    // Include DB participants without an active media stream yet
    const knownIds = new Set(remotes.map((r) => r.id));
    participants.forEach((p) => {
      if (!p.user_id || p.user_id === currentUserId || knownIds.has(p.user_id)) return;
      remotes.push({
        id: p.user_id,
        stream: null,
        name: p.user_name || 'Guest',
        isLocal: false,
        isHost: Boolean(p.is_host),
        isMuted: Boolean(p.is_muted),
        avatarUrl: p.avatar_url,
      });
    });

    return [localTile, ...remotes];
  }, [
    localStream,
    remoteStreams,
    userName,
    isCurrentUserHost,
    localAvatar,
    participants,
    currentUserId,
  ]);

  // Follow the active speaker only when the current spotlight is idle
  useEffect(() => {
    if (speakingParticipants.size === 0) return;
    const currentKey =
      selectedParticipantId === 'local' ? currentUserId : selectedParticipantId;
    if (currentKey && speakingParticipants.has(currentKey)) return;

    const speakingId = [...speakingParticipants][0];
    if (!speakingId) return;
    const next = speakingId === currentUserId ? 'local' : speakingId;
    if (next !== selectedParticipantId) onSelectParticipant(next);
  }, [speakingParticipants, currentUserId, selectedParticipantId, onSelectParticipant]);

  const mainTile =
    tiles.find((t) => t.id === selectedParticipantId) ||
    tiles.find((t) => speakingParticipants.has(t.isLocal ? currentUserId : t.id)) ||
    tiles[0];

  const filmstripTiles = tiles.filter((t) => t.id !== mainTile?.id);
  const mainSpeaking = Boolean(
    mainTile && speakingParticipants.has(mainTile.isLocal ? currentUserId : mainTile.id)
  );

  return (
    <div className="relative flex-1 min-h-0 overflow-hidden">
      {/* Atmospheric backdrop — mirrors video spotlight without a camera feed */}
      <div className="absolute inset-0 bg-[#0b0b0f]">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_35%,hsl(24_100%_50%/0.18),transparent_55%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_80%_80%,hsl(280_100%_60%/0.12),transparent_50%)]" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/50 via-transparent to-black/30" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-black/35" />
      </div>

      {/* Center spotlight participant */}
      <div className="absolute inset-0 z-10 flex items-center justify-center px-4 pb-[calc(var(--meeting-stack-height)+1rem)] pt-20 md:pl-[min(22rem,34vw)]">
        {mainTile && (
          <div className="flex flex-col items-center text-center">
            <div className="relative mb-6">
              {mainSpeaking && (
                <>
                  <span className="absolute inset-[-18px] animate-ping rounded-full bg-primary/20" />
                  <span className="absolute inset-[-10px] rounded-full border-2 border-primary/50" />
                </>
              )}
              <ProfileAvatar
                avatarUrl={mainTile.avatarUrl}
                displayName={mainTile.name}
                size="xl"
                ring={false}
                className={cn(
                  'h-36 w-36 text-4xl shadow-2xl sm:h-44 sm:w-44',
                  mainSpeaking && 'ring-4 ring-primary/60'
                )}
              />
              <div
                className={cn(
                  'absolute -bottom-1 -right-1 flex h-10 w-10 items-center justify-center rounded-full border-2 border-[#0b0b0f] shadow-lg',
                  mainTile.isMuted ? 'bg-red-500' : 'bg-emerald-500'
                )}
              >
                {mainTile.isMuted ? (
                  <MicOff className="h-5 w-5 text-white" />
                ) : (
                  <Mic className="h-5 w-5 text-white" />
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <h2 className="text-2xl font-semibold tracking-tight text-white drop-shadow-md sm:text-3xl">
                {mainTile.name}
                {mainTile.isLocal ? ' (You)' : ''}
              </h2>
              {mainTile.isHost && (
                <span className="inline-flex items-center gap-1 rounded-full border border-amber-400/30 bg-amber-500/15 px-2 py-0.5 text-xs text-amber-200">
                  <Crown className="h-3 w-3" /> Host
                </span>
              )}
            </div>
            <p className="mt-2 text-sm text-white/55">
              {mainSpeaking ? 'Speaking…' : mainTile.isMuted ? 'Muted' : 'In the call'}
            </p>

            {mainTile.stream && !mainTile.isMuted && (
              <div className="mt-5">
                <AudioIndicator stream={mainTile.stream} className="opacity-90 scale-125" />
              </div>
            )}
          </div>
        )}
      </div>

      {/* Left glass participant rail — desktop & tablets */}
      <aside
        className={cn(
          'absolute left-3 top-16 z-20 hidden w-[min(20rem,32vw)] flex-col overflow-hidden rounded-[1.75rem]',
          'border border-white/15 bg-black/35 shadow-2xl backdrop-blur-2xl md:flex',
          'bottom-[calc(var(--meeting-stack-height)+0.5rem)]'
        )}
      >
        <div className="flex items-center gap-3 border-b border-white/10 px-4 py-3.5">
          <ProfileAvatar
            avatarUrl={localAvatar}
            displayName={userName}
            email={email}
            size="sm"
            ring={false}
            className="h-10 w-10"
          />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-white">{userName}</p>
            <p className="truncate text-xs text-white/55">
              {email || (isCurrentUserHost ? 'Host · Audio call' : 'Audio · Regal Meeting')}
            </p>
          </div>
          <button
            type="button"
            className="rounded-full p-2 text-white/70 transition hover:bg-white/10 hover:text-white"
            aria-label="Participant options"
          >
            <Menu className="h-5 w-5" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-3 scrollbar-hide">
          <div className="grid grid-cols-2 gap-2.5">
            {filmstripTiles.length === 0 ? (
              <div className="col-span-2 flex h-28 items-center justify-center rounded-2xl bg-white/5 text-sm text-white/50">
                Waiting for others…
              </div>
            ) : (
              filmstripTiles.map((tile) => (
                <AudioThumb
                  key={tile.id}
                  tile={tile}
                  speaking={speakingParticipants.has(tile.isLocal ? currentUserId : tile.id)}
                  raised={raisedHands.has(tile.id) || (tile.isLocal && raisedHands.has(currentUserId))}
                  onSelect={() => onSelectParticipant(tile.id)}
                />
              ))
            )}
          </div>
        </div>
      </aside>

      {/* Mobile filmstrip — phones only */}
      <div className="absolute bottom-[calc(var(--meeting-dock-height)+0.25rem)] left-0 right-0 z-20 px-3 md:hidden">
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          {filmstripTiles.map((tile) => {
            const speaking = speakingParticipants.has(tile.isLocal ? currentUserId : tile.id);
            return (
              <button
                key={tile.id}
                type="button"
                onClick={() => onSelectParticipant(tile.id)}
                className={cn(
                  'relative flex h-20 w-[4.5rem] shrink-0 flex-col items-center justify-center gap-1 overflow-hidden rounded-2xl border bg-black/40 shadow-lg backdrop-blur-xl touch-target sm:h-24 sm:w-20',
                  speaking ? 'border-primary/60 ring-2 ring-primary/40' : 'border-white/20'
                )}
                aria-label={`Focus ${tile.name}`}
              >
                <ProfileAvatar
                  avatarUrl={tile.avatarUrl}
                  displayName={tile.name}
                  size="sm"
                  ring={false}
                  className="h-10 w-10"
                />
                <span className="truncate px-1 text-[10px] font-medium text-white">
                  {tile.name.split(' ')[0]}
                </span>
                {tile.isMuted && (
                  <span className="absolute right-1 top-1 rounded-full bg-red-500/90 p-0.5">
                    <MicOff className="h-2.5 w-2.5 text-white" />
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

function AudioThumb({
  tile,
  speaking,
  raised,
  onSelect,
}: {
  tile: Tile;
  speaking: boolean;
  raised: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        'group relative aspect-[4/5] overflow-hidden rounded-2xl border bg-white/5 text-left transition',
        speaking
          ? 'border-primary/50 ring-2 ring-primary/40'
          : 'border-white/15 hover:border-white/35 hover:ring-2 hover:ring-primary/40'
      )}
      aria-label={`Focus ${tile.name}`}
    >
      <div className="flex h-full w-full flex-col items-center justify-center gap-2 bg-gradient-to-br from-white/10 to-black/40 p-3">
        <div className="relative">
          <ProfileAvatar
            avatarUrl={tile.avatarUrl}
            displayName={tile.name}
            size="sm"
            ring={false}
            className="h-14 w-14"
          />
          {speaking && (
            <span className="absolute inset-0 animate-pulse rounded-full ring-2 ring-primary/70" />
          )}
        </div>
        {tile.stream && !tile.isMuted && (
          <AudioIndicator stream={tile.stream} className="opacity-80 scale-75" />
        )}
      </div>
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/35 to-transparent px-2 pb-2 pt-6">
        <p className="truncate text-xs font-medium text-white">{tile.name}</p>
      </div>
      <div
        className={cn(
          'absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full',
          tile.isMuted ? 'bg-red-500/90' : 'bg-emerald-500/90'
        )}
      >
        {tile.isMuted ? (
          <MicOff className="h-3 w-3 text-white" />
        ) : (
          <Mic className="h-3 w-3 text-white" />
        )}
      </div>
      {raised && (
        <span className="absolute bottom-2 right-2 text-base drop-shadow" aria-hidden>
          ✋
        </span>
      )}
    </button>
  );
}
