import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import {
  createSfuPeerConnection,
  createSfuSession,
  sfuRenegotiate,
  sfuTracksNew,
  waitForIceConnected,
  type SfuTrackLocator,
} from '@/services/cloudflareSfu';
import { isScreenShareTrack } from '@/lib/largeMeeting';

export interface PublishedSfuTrack {
  userId: string;
  userName: string;
  sessionId: string;
  trackName: string;
  kind: 'audio' | 'video';
}

interface UseCloudflareSfuOptions {
  meetingId: string;
  userId: string;
  userName: string;
  enabled: boolean;
  isPublisher: boolean;
  localStream: MediaStream | null;
  screenShareStream?: MediaStream | null;
}

export function useCloudflareSfu({
  meetingId,
  userId,
  userName,
  enabled,
  isPublisher,
  localStream,
  screenShareStream,
}: UseCloudflareSfuOptions) {
  const [remoteStreams, setRemoteStreams] = useState<Map<string, MediaStream>>(new Map());
  const [isConnected, setIsConnected] = useState(false);
  const [publishedTracks, setPublishedTracks] = useState<PublishedSfuTrack[]>([]);
  const [connectionError, setConnectionError] = useState<string | null>(null);

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const sessionIdRef = useRef<string | null>(null);
  const remoteStreamsRef = useRef<Map<string, MediaStream>>(new Map());
  const pulledTrackKeysRef = useRef<Set<string>>(new Set());
  const publisherSessionsRef = useRef<Map<string, string>>(new Map());
  const lastKnownPublishersRef = useRef<Map<string, PublishedSfuTrack[]>>(new Map());
  const registryChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const publishingRef = useRef(false);
  const reconnectAttemptsRef = useRef(0);
  const maxSfuReconnectAttempts = 5;
  const rebuildRef = useRef<() => void>(() => undefined);
  const publishedTracksRef = useRef<PublishedSfuTrack[]>([]);
  const isPublisherRef = useRef(isPublisher);
  isPublisherRef.current = isPublisher;

  const resetSfuSession = useCallback(() => {
    pcRef.current?.close();
    pcRef.current = null;
    sessionIdRef.current = null;
    pulledTrackKeysRef.current.clear();
    setIsConnected(false);
  }, []);

  const attachSfuRecoveryHandlers = useCallback((pc: RTCPeerConnection) => {
    pc.oniceconnectionstatechange = () => {
      if (pc.iceConnectionState === 'connected' || pc.iceConnectionState === 'completed') {
        reconnectAttemptsRef.current = 0;
        setConnectionError(null);
        setIsConnected(true);
        return;
      }
      if (pc.iceConnectionState === 'failed') {
        // Debounce rebuild — transient "disconnected" recovers without tearing SFU down
        window.setTimeout(() => {
          if (pc.iceConnectionState === 'failed') {
            rebuildRef.current();
          }
        }, 3_000);
      }
    };
  }, []);

  const getOrCreatePc = useCallback(() => {
    if (!pcRef.current) {
      pcRef.current = createSfuPeerConnection();
      attachSfuRecoveryHandlers(pcRef.current);
    }
    return pcRef.current;
  }, [attachSfuRecoveryHandlers]);

  const broadcastPublishedTracks = useCallback(
    (tracks: PublishedSfuTrack[]) => {
      publishedTracksRef.current = tracks;
      registryChannelRef.current?.send({
        type: 'broadcast',
        event: 'tracks-published',
        payload: { userId, userName, sessionId: sessionIdRef.current, tracks },
      });
    },
    [userId, userName]
  );

  /** Late joiners ask publishers to re-announce; also answers roster probes. */
  const respondToTrackRequest = useCallback(() => {
    if (!isPublisherRef.current) return;
    const tracks = publishedTracksRef.current;
    if (!tracks.length || !sessionIdRef.current) return;
    registryChannelRef.current?.send({
      type: 'broadcast',
      event: 'tracks-published',
      payload: { userId, userName, sessionId: sessionIdRef.current, tracks },
    });
  }, [userId, userName]);

  const ensurePublisherSession = useCallback(async () => {
    if (!enabled || !isPublisher || publishingRef.current) return;
    if (!localStream && !screenShareStream) return;

    publishingRef.current = true;
    try {
      if (!sessionIdRef.current) {
        sessionIdRef.current = await createSfuSession(meetingId);
      }
      const pc = getOrCreatePc();
      const sessionId = sessionIdRef.current;

      pc.getSenders().forEach((sender) => {
        if (sender.track) pc.removeTrack(sender);
      });

      const transceivers: RTCRtpTransceiver[] = [];
      const audioTrack = localStream?.getAudioTracks()[0];
      if (audioTrack) {
        transceivers.push(pc.addTransceiver(audioTrack, { direction: 'sendonly' }));
      }
      const screenTrack = screenShareStream?.getVideoTracks()[0];
      const cameraTrack = !screenTrack ? localStream?.getVideoTracks()[0] : undefined;
      if (screenTrack) {
        transceivers.push(pc.addTransceiver(screenTrack, { direction: 'sendonly' }));
      } else if (cameraTrack) {
        transceivers.push(pc.addTransceiver(cameraTrack, { direction: 'sendonly' }));
      }

      if (transceivers.length === 0) return;

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      const pushResponse = await sfuTracksNew(meetingId, sessionId, {
        sessionDescription: { type: offer.type, sdp: offer.sdp ?? '' },
        tracks: transceivers.map(({ mid, sender }) => ({
          location: 'local' as const,
          mid: mid ?? undefined,
          trackName: sender.track?.id ?? `track-${mid}`,
          kind: sender.track?.kind === 'video' ? 'video' : 'audio',
        })),
      });

      if (pushResponse.sessionDescription) {
        await pc.setRemoteDescription(pushResponse.sessionDescription);
      }
      await waitForIceConnected(pc).catch(() => undefined);

      const published: PublishedSfuTrack[] = transceivers
        .map(({ sender }) => sender.track)
        .filter((t): t is MediaStreamTrack => Boolean(t))
        .map((track) => ({
          userId,
          userName,
          sessionId,
          trackName: track.id,
          kind: track.kind === 'video' ? 'video' : 'audio',
        }));

      setPublishedTracks(published);
      publishedTracksRef.current = published;
      broadcastPublishedTracks(published);
      reconnectAttemptsRef.current = 0;
      setIsConnected(true);
    } finally {
      publishingRef.current = false;
    }
  }, [
    enabled,
    isPublisher,
    localStream,
    screenShareStream,
    meetingId,
    userId,
    userName,
    broadcastPublishedTracks,
    getOrCreatePc,
  ]);

  const clearPublisherRemoteState = useCallback((publisherUserId: string, priorSessionId?: string) => {
    if (priorSessionId) {
      for (const key of [...pulledTrackKeysRef.current]) {
        if (key.startsWith(`${priorSessionId}:`)) {
          pulledTrackKeysRef.current.delete(key);
        }
      }
    }

    const stream = remoteStreamsRef.current.get(publisherUserId);
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      remoteStreamsRef.current.delete(publisherUserId);
      setRemoteStreams(new Map(remoteStreamsRef.current));
    }
  }, []);

  const pullRemoteTracks = useCallback(
    async (publisher: { userId: string; sessionId: string; tracks: PublishedSfuTrack[] }) => {
      if (!enabled || isPublisher) return;
      if (publisher.userId === userId) return;

      const priorSession = publisherSessionsRef.current.get(publisher.userId);
      if (priorSession && priorSession !== publisher.sessionId) {
        clearPublisherRemoteState(publisher.userId, priorSession);
      }
      publisherSessionsRef.current.set(publisher.userId, publisher.sessionId);
      lastKnownPublishersRef.current.set(publisher.userId, publisher.tracks);

      const toPull = publisher.tracks.filter((t) => {
        const key = `${t.sessionId}:${t.trackName}`;
        return !pulledTrackKeysRef.current.has(key);
      });
      if (toPull.length === 0) return;

      if (!sessionIdRef.current) {
        sessionIdRef.current = await createSfuSession(meetingId);
      }
      const pc = getOrCreatePc();
      const sessionId = sessionIdRef.current;

      const remoteLocators: SfuTrackLocator[] = toPull.map((t) => ({
        location: 'remote',
        sessionId: t.sessionId,
        trackName: t.trackName,
        kind: t.kind,
      }));

      const pullResponse = await sfuTracksNew(meetingId, sessionId, { tracks: remoteLocators });

      const trackPromises = (pullResponse.tracks ?? []).map(
        ({ mid }) =>
          new Promise<MediaStreamTrack>((resolve, reject) => {
            const timer = setTimeout(() => reject(new Error('SFU track timeout')), 10_000);
            const onTrack = (event: RTCTrackEvent) => {
              if (mid && event.transceiver.mid !== mid) return;
              clearTimeout(timer);
              pc.removeEventListener('track', onTrack);
              resolve(event.track);
            };
            pc.addEventListener('track', onTrack);
          })
      );

      if (pullResponse.requiresImmediateRenegotiation && pullResponse.sessionDescription) {
        await pc.setRemoteDescription(pullResponse.sessionDescription);
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        await sfuRenegotiate(meetingId, sessionId, {
          type: answer.type,
          sdp: answer.sdp ?? '',
        });
      }

      const pulled = await Promise.allSettled(trackPromises);
      let stream = remoteStreamsRef.current.get(publisher.userId);
      if (!stream) {
        stream = new MediaStream();
        remoteStreamsRef.current.set(publisher.userId, stream);
      }

      pulled.forEach((result, index) => {
        if (result.status !== 'fulfilled') return;
        const track = result.value;
        const locator = toPull[index];
        const key = `${locator.sessionId}:${locator.trackName}`;
        pulledTrackKeysRef.current.add(key);
        stream!.getTracks().forEach((existing) => {
          if (existing.kind === track.kind) stream!.removeTrack(existing);
        });
        stream!.addTrack(track);
      });

      setRemoteStreams(new Map(remoteStreamsRef.current));
      reconnectAttemptsRef.current = 0;
      setIsConnected(true);
    },
    [enabled, isPublisher, userId, meetingId, getOrCreatePc, clearPublisherRemoteState]
  );

  const rebuildSfuConnection = useCallback(async () => {
    if (!enabled) return;
    if (reconnectAttemptsRef.current >= maxSfuReconnectAttempts) {
      setConnectionError('Media server connection lost. Try leaving and rejoining the meeting.');
      return;
    }

    reconnectAttemptsRef.current += 1;
    const knownPublishers = new Map(lastKnownPublishersRef.current);
    resetSfuSession();

    if (isPublisher) {
      await ensurePublisherSession();
      return;
    }

    for (const [pubUserId, tracks] of knownPublishers) {
      const sessionId = publisherSessionsRef.current.get(pubUserId);
      if (!sessionId || !tracks.length) continue;
      await pullRemoteTracks({ userId: pubUserId, sessionId, tracks });
    }
  }, [enabled, isPublisher, resetSfuSession, ensurePublisherSession, pullRemoteTracks]);

  useEffect(() => {
    rebuildRef.current = () => {
      void rebuildSfuConnection();
    };
  }, [rebuildSfuConnection]);

  useEffect(() => {
    if (!enabled) return;

    const onNetworkResume = () => {
      void rebuildSfuConnection();
    };

    window.addEventListener('meeting-network-online', onNetworkResume);
    window.addEventListener('meeting-visibility-resume', onNetworkResume);
    return () => {
      window.removeEventListener('meeting-network-online', onNetworkResume);
      window.removeEventListener('meeting-visibility-resume', onNetworkResume);
    };
  }, [enabled, rebuildSfuConnection]);

  useEffect(() => {
    if (!enabled || !meetingId) return;

    const channel = supabase.channel(`meeting-sfu-registry-${meetingId}`);
    channel
      .on('broadcast', { event: 'tracks-published' }, ({ payload }) => {
        const data = payload as {
          userId: string;
          userName: string;
          sessionId: string;
          tracks: PublishedSfuTrack[];
        };
        if (!data?.tracks?.length || isPublisherRef.current) return;
        void pullRemoteTracks({
          userId: data.userId,
          sessionId: data.sessionId,
          tracks: data.tracks,
        });
      })
      .on('broadcast', { event: 'request-tracks' }, ({ payload }) => {
        const requesterId = (payload as { userId?: string } | null)?.userId;
        // Ignore our own probe; publishers re-announce for late joiners
        if (requesterId === userId) return;
        respondToTrackRequest();
      })
      .subscribe(async (status) => {
        if (status !== 'SUBSCRIBED') return;
        if (isPublisherRef.current) {
          await ensurePublisherSession();
          // Help any listeners who subscribed just before we published
          respondToTrackRequest();
          return;
        }
        // Listener late-join: ask active publishers for their current track roster
        await channel.send({
          type: 'broadcast',
          event: 'request-tracks',
          payload: { userId, at: Date.now() },
        });
        // Retry once — first broadcast can race channel membership
        window.setTimeout(() => {
          void channel.send({
            type: 'broadcast',
            event: 'request-tracks',
            payload: { userId, at: Date.now() },
          });
        }, 1500);
      });

    registryChannelRef.current = channel;

    // Periodic re-announce so mid-call joiners always discover publishers
    const announceTimer = window.setInterval(() => {
      if (isPublisherRef.current) respondToTrackRequest();
    }, 12_000);

    return () => {
      window.clearInterval(announceTimer);
      supabase.removeChannel(channel);
      registryChannelRef.current = null;
    };
  }, [enabled, meetingId, userId, pullRemoteTracks, ensurePublisherSession, respondToTrackRequest]);

  useEffect(() => {
    if (!enabled || !isPublisher) return;
    void ensurePublisherSession();
  }, [enabled, isPublisher, localStream, screenShareStream, ensurePublisherSession]);

  useEffect(() => {
    return () => {
      pcRef.current?.close();
      pcRef.current = null;
      sessionIdRef.current = null;
      remoteStreamsRef.current.forEach((s) => s.getTracks().forEach((t) => t.stop()));
      remoteStreamsRef.current.clear();
      pulledTrackKeysRef.current.clear();
    };
  }, []);

  const retryConnection = useCallback(async () => {
    reconnectAttemptsRef.current = 0;
    setConnectionError(null);
    await rebuildSfuConnection();
  }, [rebuildSfuConnection]);

  const hostScreenStream = (() => {
    if (isPublisher) return screenShareStream ?? null;
    for (const [id, stream] of remoteStreams) {
      if (stream.getVideoTracks().some(isScreenShareTrack)) return remoteStreams.get(id) ?? null;
    }
    return null;
  })();

  return {
    remoteStreams,
    isConnected,
    publishedTracks,
    hostScreenStream,
    connectionError,
    retryConnection,
  };
}
