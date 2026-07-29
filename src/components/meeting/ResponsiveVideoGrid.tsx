import React, { useState, useMemo, useCallback } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { User, MicOff, Crown, MapPin, Pin, Users as UsersIcon } from 'lucide-react';
import { StableVideoElement } from './StableVideoElement';
import { AudioIndicator } from '@/components/AudioIndicator';
import { AllParticipantsSheet } from './AllParticipantsSheet';
import { useIsMobile } from '@/hooks/use-mobile';

interface RemoteStream {
  id: string;
  stream: MediaStream;
  userName: string;
}

interface Participant {
  id: string;
  user_id: string;
  user_name: string;
  is_host: boolean;
  is_muted: boolean;
  joined_at: string;
  country?: string;
  city?: string;
}

interface ResponsiveVideoGridProps {
  localStream: MediaStream | null;
  remoteStreams: RemoteStream[];
  userName: string;
  isVideoEnabled: boolean;
  participants: Participant[];
  currentUserId: string;
  isCurrentUserHost: boolean;
}

/**
 * Google Meet-style paginated grid that scales to 300+ participants.
 * - Renders only N visible video tiles (12 desktop / 6 mobile) for GPU sanity.
 * - Pinned tiles are always shown first.
 * - "View all participants" opens a sheet to find/pin anyone.
 * - Hidden participants still receive audio via the underlying RTCPeerConnections.
 */
export const ResponsiveVideoGrid = ({
  localStream,
  remoteStreams,
  userName,
  isVideoEnabled,
  participants,
  currentUserId,
  isCurrentUserHost,
}: ResponsiveVideoGridProps) => {
  const isMobile = useIsMobile();
  const [pinnedIds, setPinnedIds] = useState<string[]>([]);
  const [showAllSheet, setShowAllSheet] = useState(false);

  const togglePin = useCallback((id: string) => {
    setPinnedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [id, ...prev]));
  }, []);

  // Combine all streams
  const allStreams = useMemo(() => {
    const local = {
      id: 'local',
      stream: localStream,
      userName,
      isLocal: true,
    };
    return [local, ...remoteStreams.map((s) => ({ ...s, isLocal: false }))];
  }, [localStream, remoteStreams, userName]);

  const totalParticipants = allStreams.length;

  // Decide how many tiles to show
  const maxVisible = isMobile ? 6 : 12;

  // Sort: pinned first, then local, then rest
  const orderedStreams = useMemo(() => {
    const pinned = allStreams.filter((s) => pinnedIds.includes(s.id));
    const rest = allStreams.filter((s) => !pinnedIds.includes(s.id));
    return [...pinned, ...rest];
  }, [allStreams, pinnedIds]);

  const visibleStreams = orderedStreams.slice(0, maxVisible);
  const hiddenCount = totalParticipants - visibleStreams.length;

  const visibleCount = visibleStreams.length;
  const cols = visibleCount <= 1 ? 1 : visibleCount <= 2 ? 2 : visibleCount <= 4 ? 2 : visibleCount <= 9 ? 3 : 4;
  const rows = Math.ceil(visibleCount / cols);

  const getParticipantInfo = (streamId: string, streamUserName: string, isLocal: boolean) => {
    if (isLocal) {
      return {
        name: userName,
        isHost: isCurrentUserHost,
        isMuted: !localStream?.getAudioTracks()?.[0]?.enabled,
        country: undefined as string | undefined,
        city: undefined as string | undefined,
      };
    }
    const p = participants.find((x) => x.user_id === streamId);
    return {
      name: p?.user_name || streamUserName,
      isHost: p?.is_host || false,
      isMuted: p?.is_muted || false,
      country: p?.country,
      city: p?.city,
    };
  };

  const sheetParticipants = useMemo(
    () =>
      allStreams.map((s) => {
        const info = getParticipantInfo(s.id, s.userName, s.isLocal);
        return {
          id: s.id,
          name: info.name,
          isHost: info.isHost,
          isMuted: info.isMuted,
          isLocal: s.isLocal,
          hasVideo: !!(s.stream && s.stream.getVideoTracks()[0]?.enabled),
        };
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [allStreams, participants, userName, isCurrentUserHost, localStream]
  );

  return (
    <div className="relative h-full w-full p-2 sm:p-3 pb-28">
      <div
        className="grid gap-2 h-full w-full"
        style={{
          gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
          gridTemplateRows: `repeat(${rows}, minmax(0, 1fr))`,
        }}
      >
        {visibleStreams.map((s) => {
          const info = getParticipantInfo(s.id, s.userName, s.isLocal);
          const hasVideo = !!(s.stream && s.stream.getVideoTracks()[0]?.enabled);
          const isPinned = pinnedIds.includes(s.id);

          return (
            <Card
              key={s.id}
              onClick={() => togglePin(s.id)}
              className={`relative overflow-hidden bg-[#3c4043] border-2 transition-all cursor-pointer aspect-video ${
                isPinned ? 'border-blue-400 ring-2 ring-blue-400/40' : 'border-transparent hover:border-white/30'
              }`}
            >
              <StableVideoElement
                stream={s.stream}
                streamId={s.id}
                isLocal={s.isLocal}
                className={`w-full h-full object-cover transition-opacity duration-200 ${hasVideo ? 'opacity-100' : 'opacity-0'}`}
              />

              {!hasVideo && (
                <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-[#3c4043] to-[#202124]">
                  <div className="flex flex-col items-center">
                    <div className="w-14 h-14 sm:w-20 sm:h-20 rounded-full bg-gradient-to-br from-orange-500 to-purple-600 flex items-center justify-center text-white text-2xl sm:text-3xl font-semibold shadow-lg">
                      {info.name.charAt(0).toUpperCase()}
                    </div>
                  </div>
                </div>
              )}

              {/* Top-right indicators */}
              <div className="absolute top-2 right-2 flex gap-1 z-10">
                {info.isMuted && (
                  <div className="p-1.5 bg-red-500/95 rounded-full">
                    <MicOff className="h-3 w-3 text-white" />
                  </div>
                )}
                {info.isHost && (
                  <div className="p-1.5 bg-yellow-500/95 rounded-full">
                    <Crown className="h-3 w-3 text-white" />
                  </div>
                )}
                {isPinned && (
                  <div className="p-1.5 bg-blue-500/95 rounded-full">
                    <Pin className="h-3 w-3 text-white" />
                  </div>
                )}
              </div>

              {/* Location */}
              {(info.country || info.city) && !s.isLocal && (
                <div className="absolute top-2 left-2 z-10 flex items-center gap-1 bg-black/70 backdrop-blur-sm rounded-md px-2 py-1">
                  <MapPin className="h-3 w-3 text-white/80" />
                  <span className="text-white text-xs font-medium">
                    {info.city && info.country ? `${info.city}, ${info.country}` : info.country || info.city}
                  </span>
                </div>
              )}

              {/* Bottom name bar */}
              <div className="absolute bottom-0 left-0 right-0 p-2 z-10 flex items-center justify-between">
                <span className="text-white text-xs sm:text-sm font-medium bg-black/60 rounded px-2 py-0.5 truncate max-w-[70%]">
                  {info.name}{s.isLocal && ' (You)'}
                </span>
                {s.stream && <AudioIndicator stream={s.stream} className="opacity-90" />}
              </div>
            </Card>
          );
        })}
      </div>

      {/* Hidden / "View all" overlay */}
      {hiddenCount > 0 && (
        <div className="absolute bottom-24 right-3 sm:right-6 z-30">
          <Button
            onClick={() => setShowAllSheet(true)}
            className="bg-black/80 hover:bg-black/90 text-white border border-white/10 rounded-full shadow-xl backdrop-blur-md"
          >
            <UsersIcon className="h-4 w-4 mr-2" />
            View all {totalParticipants}
            <span className="ml-2 bg-orange-500 text-white text-xs rounded-full px-2 py-0.5">+{hiddenCount}</span>
          </Button>
        </div>
      )}

      <AllParticipantsSheet
        open={showAllSheet}
        onOpenChange={setShowAllSheet}
        participants={sheetParticipants}
        pinnedIds={pinnedIds}
        onTogglePin={togglePin}
        totalCount={totalParticipants}
      />
    </div>
  );
};
