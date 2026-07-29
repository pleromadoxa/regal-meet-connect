import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { MeetingPlanLimits } from '@/lib/meetingPlanLimits';
import {
  MeetingMediaMode,
  ParticipantMediaRole,
  TopologyBroadcastPayload,
  resolveMediaMode,
  resolveMediaRole,
  shouldMeshWithPeer,
  SFU_AUTO_THRESHOLD,
  useMeshConnections,
  useSfuConnections,
} from '@/lib/meetingTopology';
import { checkSfuAvailability } from '@/services/cloudflareSfu';

interface UseMeetingTopologyOptions {
  meetingId: string;
  userId: string;
  isHost: boolean;
  participantCount: number;
  hostUserId?: string | null;
  planLimits?: MeetingPlanLimits;
}

export function useMeetingTopology({
  meetingId,
  userId,
  isHost,
  participantCount,
  hostUserId: hostUserIdProp,
  planLimits,
}: UseMeetingTopologyOptions) {
  const [sfuAvailable, setSfuAvailable] = useState(false);
  const [remoteTopology, setRemoteTopology] = useState<TopologyBroadcastPayload | null>(null);
  const [publisherIds, setPublisherIds] = useState<string[]>([]);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const hostUserId = hostUserIdProp ?? remoteTopology?.hostUserId ?? (isHost ? userId : null);

  useEffect(() => {
    let cancelled = false;
    checkSfuAvailability()
      .then((ok) => {
        if (!cancelled) setSfuAvailable(ok);
      })
      .catch(() => {
        if (!cancelled) setSfuAvailable(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const sfuThreshold = useMemo(() => {
    if (!planLimits) return SFU_AUTO_THRESHOLD;
    return planLimits.sfuEnabled ? SFU_AUTO_THRESHOLD : Number.POSITIVE_INFINITY;
  }, [planLimits]);

  const computedMode = useMemo(
    () => resolveMediaMode(participantCount, sfuAvailable, sfuThreshold),
    [participantCount, sfuAvailable, sfuThreshold]
  );

  const mediaMode: MeetingMediaMode = remoteTopology?.mediaMode ?? computedMode;

  useEffect(() => {
    if (isHost && hostUserId) {
      setPublisherIds((prev) => (prev.includes(hostUserId) ? prev : [hostUserId, ...prev]));
    }
  }, [isHost, hostUserId]);

  const effectivePublishers = remoteTopology?.publisherIds ?? publisherIds;
  const mediaRole: ParticipantMediaRole = resolveMediaRole(
    mediaMode,
    userId,
    isHost,
    effectivePublishers
  );

  const isLargeMeeting =
    participantCount > SFU_AUTO_THRESHOLD && Number.isFinite(sfuThreshold);

  useEffect(() => {
    if (!meetingId) return;

    const channel = supabase.channel(`meeting-topology-${meetingId}`);
    channel
      .on('broadcast', { event: 'topology' }, ({ payload }) => {
        setRemoteTopology(payload as TopologyBroadcastPayload);
        if (Array.isArray((payload as TopologyBroadcastPayload).publisherIds)) {
          setPublisherIds((payload as TopologyBroadcastPayload).publisherIds);
        }
      })
      .subscribe();

    channelRef.current = channel;
    return () => {
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [meetingId]);

  const broadcastTopology = useCallback(
    (mode: MeetingMediaMode) => {
      const payload: TopologyBroadcastPayload = {
        mediaMode: mode,
        participantCount,
        hostUserId: hostUserId ?? userId,
        publisherIds: effectivePublishers.length
          ? effectivePublishers
          : hostUserId
            ? [hostUserId]
            : isHost
              ? [userId]
              : [],
        switchedAt: new Date().toISOString(),
      };
      setRemoteTopology(payload);
      channelRef.current?.send({ type: 'broadcast', event: 'topology', payload });
    },
    [participantCount, hostUserId, userId, isHost, effectivePublishers]
  );

  // Host auto-broadcasts when crossing the SFU threshold
  useEffect(() => {
    if (!isHost || participantCount <= SFU_AUTO_THRESHOLD) return;
    if (!planLimits?.sfuEnabled) return;
    if (computedMode === 'mesh') return;
    broadcastTopology(computedMode);
  }, [isHost, participantCount, computedMode, broadcastTopology, planLimits?.sfuEnabled]);

  const promoteToSpeaker = useCallback(
    (targetUserId: string) => {
      if (!isHost) return;
      setPublisherIds((prev) => {
        if (prev.includes(targetUserId)) return prev;
        const next = [...prev, targetUserId];
        const payload: TopologyBroadcastPayload = {
          mediaMode,
          participantCount,
          hostUserId: hostUserId ?? userId,
          publisherIds: next,
          switchedAt: new Date().toISOString(),
        };
        setRemoteTopology(payload);
        channelRef.current?.send({ type: 'broadcast', event: 'topology', payload });
        channelRef.current?.send({
          type: 'broadcast',
          event: 'promote',
          payload: { userId: targetUserId },
        });
        return next;
      });
    },
    [isHost, mediaMode, participantCount, hostUserId, userId]
  );

  const demoteToListener = useCallback(
    (targetUserId: string) => {
      if (!isHost || targetUserId === hostUserId) return;
      setPublisherIds((prev) => {
        const next = prev.filter((id) => id !== targetUserId);
        broadcastTopology(mediaMode);
        return next;
      });
    },
    [isHost, hostUserId, mediaMode, broadcastTopology]
  );

  const shouldConnectToPeer = useCallback(
    (peerId: string) =>
      shouldMeshWithPeer(mediaMode, mediaRole, userId, peerId, hostUserId ?? null),
    [mediaMode, mediaRole, userId, hostUserId]
  );

  return {
    mediaMode,
    mediaRole,
    hostUserId,
    publisherIds: effectivePublishers,
    participantCount,
    isLargeMeeting,
    sfuAvailable,
    useMesh: useMeshConnections(mediaMode),
    useSfu: useSfuConnections(mediaMode),
    shouldConnectToPeer,
    promoteToSpeaker,
    demoteToListener,
    isListener: mediaRole === 'listener',
    isSfuMode: mediaMode === 'sfu',
    maxParticipants: planLimits?.maxParticipants ?? 500,
    sfuEnabled: planLimits?.sfuEnabled ?? true,
  };
}
