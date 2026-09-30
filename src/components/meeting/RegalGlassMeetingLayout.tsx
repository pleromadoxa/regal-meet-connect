import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { Menu, ChevronsLeft, ChevronsRight, ZoomIn, ZoomOut, Maximize2 } from 'lucide-react';
import { StableVideoElement } from './StableVideoElement';
import { ProfileAvatar } from '@/components/ProfileAvatar';
import { useAuth } from '@/hooks/useAuth';
import {
  streamHasUsableVideo,
  useStreamHasUsableVideo,
} from '@/hooks/useStreamHasUsableVideo';
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
  speakingParticipants?: Set<string>;
}

type Tile = {
  id: string;
  stream: MediaStream | null;
  name: string;
  isLocal: boolean;
  isHost: boolean;
  avatarUrl?: string | null;
};

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
  speakingParticipants = new Set(),
}: RegalGlassMeetingLayoutProps) => {
  const { user, profile } = useAuth();
  const localAvatar = resolveAvatarUrl(profile, user);
  const email = user?.email || '';

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const isPanningRef = useRef(false);
  const panStartRef = useRef({ x: 0, y: 0, panX: 0, panY: 0 });
  const mainStageRef = useRef<HTMLDivElement>(null);

  const handleZoomIn = useCallback(() => {
    setZoom((z) => Math.min(z + 0.25, 3));
  }, []);

  const handleZoomOut = useCallback(() => {
    setZoom((z) => {
      const next = Math.max(z - 0.25, 0.5);
      if (next <= 1) setPan({ x: 0, y: 0 });
      return next;
    });
  }, []);

  const handleZoomReset = useCallback(() => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }, []);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      setZoom((z) => {
        const delta = e.deltaY > 0 ? -0.15 : 0.15;
        const next = Math.min(Math.max(z + delta, 0.5), 3);
        if (next <= 1) setPan({ x: 0, y: 0 });
        return next;
      });
    }
  }, []);

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    if (zoom <= 1) return;
    isPanningRef.current = true;
    panStartRef.current = { x: e.clientX, y: e.clientY, panX: pan.x, panY: pan.y };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }, [zoom, pan]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!isPanningRef.current) return;
    const dx = e.clientX - panStartRef.current.x;
    const dy = e.clientY - panStartRef.current.y;
    setPan({ x: panStartRef.current.panX + dx, y: panStartRef.current.panY + dy });
  }, []);

  const handlePointerUp = useCallback(() => {
    isPanningRef.current = false;
  }, []);

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

  const autoSwitchedRef = useRef(false);
  useEffect(() => {
    if (autoSwitchedRef.current || selectedVideoId !== 'local') {
      if (selectedVideoId !== 'local') autoSwitchedRef.current = true;
      return;
    }
    const preferred = remoteStreams.find((r) => streamHasUsableVideo(r.stream));
    if (preferred) {
      autoSwitchedRef.current = true;
      onVideoSelect(preferred.id);
    }
  }, [remoteStreams, selectedVideoId, onVideoSelect]);

  const mainTile =
    tiles.find((t) => t.id === selectedVideoId) ||
    tiles.find((t) => !t.isLocal) ||
    tiles[0];

  const filmstripTiles = tiles.filter((t) => t.id !== mainTile?.id);
  const mainSpeaking = Boolean(
    mainTile && speakingParticipants.has(mainTile.isLocal ? currentUserId : mainTile.id)
  );

  const hostParticipant = participants.find((p) => p.is_host && p.user_id !== currentUserId);
  const hostLabel = isCurrentUserHost
    ? userName
    : hostParticipant?.user_name || 'Host';

  const hasSidebar = filmstripTiles.length > 0 || !sidebarCollapsed;

  return (
    <div className="relative flex-1 min-h-0 overflow-hidden bg-[#0b0b0f]">
      <div
        ref={mainStageRef}
        className={cn(
          'absolute inset-0 transition-all duration-300 ease-in-out',
          hasSidebar && !sidebarCollapsed && 'md:left-[min(20.75rem,33vw)]'
        )}
        onWheel={handleWheel}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        style={{ cursor: zoom > 1 ? (isPanningRef.current ? 'grabbing' : 'grab') : undefined }}
      >
        <div
          className="h-full w-full origin-center transition-transform duration-150 ease-out"
          style={{
            transform: `scale(${zoom}) translate(${pan.x / zoom}px, ${pan.y / zoom}px)`,
          }}
        >
          <MainStage
            tile={mainTile}
            isVideoEnabled={isVideoEnabled}
            speaking={mainSpeaking}
          />
        </div>
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-black/45 via-transparent to-black/25" />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-black/30" />
      </div>

      {/* Zoom controls */}
      <div className="absolute right-3 top-16 z-30 flex flex-col gap-1.5 md:flex">
        {zoom > 1 && (
          <button
            type="button"
            onClick={handleZoomReset}
            className="flex h-8 w-8 items-center justify-center rounded-full border border-white/15 bg-black/50 text-white/70 backdrop-blur-md transition hover:bg-white/15 hover:text-white"
            aria-label="Reset zoom"
            title="Reset zoom"
          >
            <Maximize2 className="h-3.5 w-3.5" />
          </button>
        )}
        <button
          type="button"
          onClick={handleZoomIn}
          className="flex h-8 w-8 items-center justify-center rounded-full border border-white/15 bg-black/50 text-white/70 backdrop-blur-md transition hover:bg-white/15 hover:text-white"
          aria-label="Zoom in"
          title="Zoom in (Ctrl+Scroll)"
        >
          <ZoomIn className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onClick={handleZoomOut}
          className="flex h-8 w-8 items-center justify-center rounded-full border border-white/15 bg-black/50 text-white/70 backdrop-blur-md transition hover:bg-white/15 hover:text-white"
          aria-label="Zoom out"
          title="Zoom out (Ctrl+Scroll)"
        >
          <ZoomOut className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Sidebar collapse toggle */}
      <button
        type="button"
        onClick={() => setSidebarCollapsed((c) => !c)}
        className={cn(
          'absolute z-30 flex h-8 w-8 items-center justify-center rounded-full',
          'border border-white/15 bg-black/50 text-white/70 backdrop-blur-md transition hover:bg-white/15 hover:text-white',
          'hidden md:flex',
          sidebarCollapsed ? 'left-3 top-16' : 'left-[min(20.25rem,32.5vw)] top-16'
        )}
        aria-label={sidebarCollapsed ? 'Expand participants' : 'Collapse participants'}
        title={sidebarCollapsed ? 'Show participants' : 'Hide participants'}
      >
        {sidebarCollapsed ? (
          <ChevronsRight className="h-4 w-4" />
        ) : (
          <ChevronsLeft className="h-4 w-4" />
        )}
      </button>

      <aside
        className={cn(
          'absolute left-3 top-16 z-20 hidden flex-col overflow-hidden rounded-[1.75rem] transition-all duration-300 ease-in-out',
          'border border-white/15 bg-black/35 shadow-2xl backdrop-blur-2xl md:flex',
          'bottom-[calc(var(--meeting-stack-height)+0.5rem)]',
          sidebarCollapsed ? 'w-0 border-0 p-0 opacity-0' : 'w-[min(20rem,32vw)]'
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
            className="rounded-full p-2 text-white/70 hover:bg-white/10 hover:text-white"
            aria-label="More"
          >
            <Menu className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 space-y-2 overflow-y-auto p-3">
          {filmstripTiles.map((tile) => (
            <ParticipantThumb
              key={tile.id}
              tile={tile}
              isVideoEnabled={isVideoEnabled}
              raised={raisedHands.has(tile.isLocal ? currentUserId : tile.id)}
              speaking={speakingParticipants.has(tile.isLocal ? currentUserId : tile.id)}
              onSelect={() => onVideoSelect(tile.id)}
            />
          ))}
        </div>
      </aside>

      <div className="absolute inset-x-0 bottom-[calc(var(--meeting-stack-height)+0.75rem)] z-20 flex gap-2 overflow-x-auto px-3 pb-1 md:hidden">
        {filmstripTiles.map((tile) => (
          <button
            key={tile.id}
            type="button"
            onClick={() => onVideoSelect(tile.id)}
            className="relative h-20 w-16 shrink-0 overflow-hidden rounded-xl border border-white/20 bg-black/40"
            aria-label={`Show ${tile.name}`}
          >
            <ThumbMedia tile={tile} isVideoEnabled={isVideoEnabled} speaking={speakingParticipants.has(tile.isLocal ? currentUserId : tile.id)} />
            {raisedHands.has(tile.isLocal ? currentUserId : tile.id) ? (
              <span className="absolute bottom-1 right-1 text-sm" aria-hidden>
                ✋
              </span>
            ) : null}
          </button>
        ))}
      </div>
    </div>
  );
};

function MainStage({
  tile,
  isVideoEnabled,
  speaking,
}: {
  tile?: Tile;
  isVideoEnabled: boolean;
  speaking: boolean;
}) {
  const streamLive = useStreamHasUsableVideo(tile?.stream);
  const hasVideo = tile?.isLocal ? isVideoEnabled && streamLive : streamLive;

  if (hasVideo && tile?.stream) {
    return (
      <StableVideoElement
        stream={tile.stream}
        streamId={tile.id}
        isLocal={tile.isLocal}
        className="h-full w-full object-cover"
      />
    );
  }

  return (
    <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[#1a1224] via-[#12101a] to-[#0b0b0f]">
      <div className="text-center">
        <div className="relative mx-auto mb-4 h-28 w-28">
          {speaking ? (
            <>
              <span className="absolute inset-[-14px] animate-ping rounded-full bg-primary/25" />
              <span className="absolute inset-[-8px] rounded-full border-2 border-primary/55" />
            </>
          ) : null}
          <ProfileAvatar
            avatarUrl={tile?.avatarUrl}
            displayName={tile?.name || 'Guest'}
            size="lg"
            ring={false}
            className={cn('h-28 w-28 text-3xl', speaking && 'ring-4 ring-primary/60')}
          />
        </div>
        <p className="text-xl font-semibold text-white">
          {tile?.name}
          {tile?.isLocal ? ' (You)' : ''}
        </p>
        {speaking ? <p className="mt-1 text-sm text-primary/90">Speaking…</p> : null}
      </div>
    </div>
  );
}

function ParticipantThumb({
  tile,
  isVideoEnabled,
  raised,
  speaking,
  onSelect,
}: {
  tile: Tile;
  isVideoEnabled: boolean;
  raised: boolean;
  speaking: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        'group relative aspect-[4/5] overflow-hidden rounded-2xl border bg-white/5 text-left transition',
        speaking
          ? 'border-primary/60 ring-2 ring-primary/40'
          : 'border-white/15 hover:border-white/35 hover:ring-2 hover:ring-primary/50'
      )}
      aria-label={`Show ${tile.name}`}
    >
      <ThumbMedia tile={tile} isVideoEnabled={isVideoEnabled} speaking={speaking} />
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
  speaking = false,
}: {
  tile: Tile;
  isVideoEnabled: boolean;
  speaking?: boolean;
}) {
  const streamLive = useStreamHasUsableVideo(tile.stream);
  const hasVideo = tile.isLocal ? isVideoEnabled && streamLive : streamLive;

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
    <div className="relative flex h-full w-full items-center justify-center bg-gradient-to-br from-white/10 to-black/40">
      {speaking ? (
        <span className="absolute inset-3 animate-ping rounded-full bg-primary/20" />
      ) : null}
      <ProfileAvatar
        avatarUrl={tile.avatarUrl}
        displayName={tile.name}
        size="sm"
        ring={false}
        className={cn('h-12 w-12', speaking && 'ring-2 ring-primary/70')}
      />
    </div>
  );
}
