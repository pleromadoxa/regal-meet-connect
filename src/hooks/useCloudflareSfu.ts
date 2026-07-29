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

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const sessionIdRef = useRef<string | null>(null);
  const remoteStreamsRef = useRef<Map<string, MediaStream>>(new Map());
  const pulledTrackKeysRef = useRef<Set<string>>(new Set());
  const registryChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const publishingRef = useRef(false);

  const broadcastPublishedTracks = useCallback(
    (tracks: PublishedSfuTrack[]) => {
      registryChannelRef.current?.send({
        type: 'broadcast',
        event: 'tracks-published',
        payload: { userId, userName, sessionId: sessionIdRef.current, tracks },
      });
    },
    [userId, userName]
  );

  const ensurePublisherSession = useCallback(async () => {
    if (!enabled || !isPublisher || publishingRef.current) return;
    if (!localStream && !screenShareStream) return;

    publishingRef.current = true;
    try {
      if (!sessionIdRef.current) {
        sessionIdRef.current = await createSfuSession(meetingId);
      }
      if (!pcRef.current) {
        pcRef.current = createSfuPeerConnection();
      }
      const pc = pcRef.current;
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
      if (screenTrack) {
        transceivers.push(pc.addTransceiver(screenTrack, { direction: 'sendonly' }));
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
      broadcastPublishedTracks(published);
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
  ]);

  const pullRemoteTracks = useCallback(
    async (publisher: { userId: string; sessionId: string; tracks: PublishedSfuTrack[] }) => {
      if (!enabled || isPublisher) return;
      if (publisher.userId === userId) return;

      const toPull = publisher.tracks.filter((t) => {
        const key = `${t.sessionId}:${t.trackName}`;
        return !pulledTrackKeysRef.current.has(key);
      });
      if (toPull.length === 0) return;

      if (!sessionIdRef.current) {
        sessionIdRef.current = await createSfuSession(meetingId);
      }
      if (!pcRef.current) {
        pcRef.current = createSfuPeerConnection();
      }
      const pc = pcRef.current;
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
      setIsConnected(true);
    },
    [enabled, isPublisher, userId, meetingId]
  );

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
        if (!data?.tracks?.length || isPublisher) return;
        void pullRemoteTracks({
          userId: data.userId,
          sessionId: data.sessionId,
          tracks: data.tracks,
        });
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED' && isPublisher) {
          await ensurePublisherSession();
        }
      });

    registryChannelRef.current = channel;
    return () => {
      supabase.removeChannel(channel);
      registryChannelRef.current = null;
    };
  }, [enabled, meetingId, isPublisher, pullRemoteTracks, ensurePublisherSession]);

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
  };
}
