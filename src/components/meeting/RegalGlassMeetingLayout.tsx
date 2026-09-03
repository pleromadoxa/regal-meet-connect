import React, { useEffect, useMemo } from 'react';
import { Menu, User } from 'lucide-react';
import { StableVideoElement } from './StableVideoElement';
import { ProfileAvatar } from '@/components/ProfileAvatar';
import { useAuth } from '@/hooks/useAuth';
import { resolveAvatarUrl } from '@/lib/profileAvatar';
import { cn } from '@/lib/utils';

interface RemoteStream {
  id: string;
  stream: MediaStream;
  userName: string;
}

interface RegalGlassMeetingLayoutProps {
  localStream: MediaStream | null;
  remoteStreams: RemoteStream[];
  userName: string;
  isVideoEnabled: boolean;
  selectedVideoId: string;
  onVideoSelect: (streamId: string) => void;
  isCurrentUserHost: boolean;
  participants: Array<{
    user_id?: string;
    user_name?: string;
    is_host?: boolean;
    avatar_url?: string | null;
  }>;
  currentUserId: string;
  raisedHands?: Set<string>;
}

type Tile = {
  id: string;
  stream: MediaStream | null;
  name: string;
  isLocal: boolean;
  isHost: boolean;
  avatarUrl?: string | null;
};

function streamHasLiveVideo(stream: MediaStream | null | undefined): boolean {
  return Boolean(
    stream?.getVideoTracks()?.some((track) => track.readyState === 'live' && track.enabled)
  );
}

export const RegalGlassMeetingLayout = ({
  localStream,
  remoteStreams,
  userName,
  isVideoEnabled,
  selectedVideoId,
  onVideoSelect,
  isCurrentUserHost,
  participants,
  currentUserId,
  raisedHands = new Set(),
}: RegalGlassMeetingLayoutProps) => {
  const { user, profile } = useAuth();
  const localAvatar = resolveAvatarUrl(profile, user);
  const email = user?.email || '';

  const tiles = useMemo<Tile[]>(() => {
    const localTile: Tile = {
      id: 'local',
      stream: localStream,
      name: userName,
      isLocal: true,
      isHost: isCurrentUserHost,
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
        avatarUrl: participant?.avatar_url,
      };
    });

    return [localTile, ...remotes];
  }, [
    localStream,
    remoteStreams,
    userName,
    isCurrentUserHost,
    localAvatar,
    participants,
  ]);

  // Prefer a remote with live video as the spotlight when still on local default.
  useEffect(() => {
    if (selectedVideoId !== 'local') return;
    const preferred = remoteStreams.find((r) => streamHasLiveVideo(r.stream));
    if (preferred) onVideoSelect(preferred.id);
  }, [remoteStreams, selectedVideoId, onVideoSelect]);

  const mainTile =
    tiles.find((t) => t.id === selectedVideoId) ||
    tiles.find((t) => !t.isLocal) ||
    tiles[0];

  const filmstripTiles = tiles.filter((t) => t.id !== mainTile?.id);
  const mainHasVideo =
    mainTile?.isLocal
      ? isVideoEnabled && streamHasLiveVideo(mainTile.stream)
      : streamHasLiveVideo(mainTile?.stream);

  const hostParticipant = participants.find((p) => p.is_host && p.user_id !== currentUserId);
  const hostLabel = isCurrentUserHost
    ? userName
    : hostParticipant?.user_name || 'Host';

  return (
    <div className="relative flex-1 min-h-0 overflow-hidden bg-[#0b0b0f]">
      {/* Full-bleed spotlight */}
      <div className="absolute inset-0">
        {mainHasVideo && mainTile?.stream ? (
          <StableVideoElement
            stream={mainTile.stream}
            streamId={mainTile.id}
            isLocal={mainTile.isLocal}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[#1a1224] via-[#12101a] to-[#0b0b0f]">
            <div className="text-center">
              <div className="mx-auto mb-4 flex h-28 w-28 items-center justify-center rounded-full bg-white/10 ring-1 ring-white/15">
                {mainTile?.avatarUrl ? (
                  <img
                    src={mainTile.avatarUrl}
                    alt=""
                    className="h-full w-full rounded-full object-cover"
                  />
                ) : (
                  <User className="h-12 w-12 text-white/50" />
                )}
              </div>
              <p className="text-xl font-semibold text-white">
                {mainTile?.name}
                {mainTile?.isLocal ? ' (You)' : ''}
              </p>
            </div>
          </div>
        )}
        {/* Soft vignette so overlays stay readable */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-black/45 via-transparent to-black/25" />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-black/30" />
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
              {email || (isCurrentUserHost ? 'Host · Regal Meeting' : `In call with ${hostLabel}`)}
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
                <ParticipantThumb
                  key={tile.id}
                  tile={tile}
                  isVideoEnabled={isVideoEnabled}
                  raised={raisedHands.has(tile.id) || (tile.isLocal && raisedHands.has(currentUserId))}
                  onSelect={() => onVideoSelect(tile.id)}
                />
              ))
            )}
          </div>
        </div>
      </aside>

      {/* Mobile filmstrip — phones only */}
      <div className="absolute bottom-[calc(var(--meeting-dock-height)+0.25rem)] left-0 right-0 z-20 px-3 md:hidden">
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          {filmstripTiles.map((tile) => (
            <button
              key={tile.id}
              type="button"
              onClick={() => onVideoSelect(tile.id)}
              className="relative h-20 w-[4.5rem] shrink-0 overflow-hidden rounded-2xl border border-white/20 bg-black/40 shadow-lg backdrop-blur-xl touch-target sm:h-24 sm:w-20"
              aria-label={`Show ${tile.name}`}
            >
              <ThumbMedia tile={tile} isVideoEnabled={isVideoEnabled} />
              <span className="absolute inset-x-0 bottom-0 truncate bg-gradient-to-t from-black/80 to-transparent px-1.5 pb-1 pt-4 text-[10px] font-medium text-white">
                {tile.name.split(' ')[0]}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

function ParticipantThumb({
  tile,
  isVideoEnabled,
  raised,
  onSelect,
}: {
  tile: Tile;
  isVideoEnabled: boolean;
  raised: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className="group relative aspect-[4/5] overflow-hidden rounded-2xl border border-white/15 bg-white/5 text-left transition hover:border-white/35 hover:ring-2 hover:ring-primary/50"
      aria-label={`Show ${tile.name}`}
    >
      <ThumbMedia tile={tile} isVideoEnabled={isVideoEnabled} />
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 via-black/30 to-transparent px-2 pb-2 pt-6">
        <p className="truncate text-xs font-medium text-white">{tile.name}</p>
      </div>
      {raised && (
        <span className="absolute bottom-2 right-2 text-base drop-shadow" aria-hidden>
          ✋
        </span>
      )}
    </button>
  );
}

function ThumbMedia({
  tile,
  isVideoEnabled,
}: {
  tile: Tile;
  isVideoEnabled: boolean;
}) {
  const hasVideo = tile.isLocal
    ? isVideoEnabled && streamHasLiveVideo(tile.stream)
    : streamHasLiveVideo(tile.stream);

  if (hasVideo && tile.stream) {
    return (
      <StableVideoElement
        stream={tile.stream}
        streamId={`thumb-${tile.id}`}
        isLocal={tile.isLocal}
        className="h-full w-full object-cover"
      />
    );
  }

  return (
    <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-white/10 to-black/40">
      <ProfileAvatar
        avatarUrl={tile.avatarUrl}
        displayName={tile.name}
        size="sm"
        ring={false}
        className="h-12 w-12"
      />
    </div>
  );
}
