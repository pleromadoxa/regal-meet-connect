
import { useState, useRef, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import {
  buildOutboundBroadcasts,
  detectClientPlatform,
  normalizeInboundSignal,
  PEER_LEAVE_GRACE_MS,
  type NormalizedSignalingMessage,
} from '@/lib/webrtcSignaling';

export type SignalingMessage = NormalizedSignalingMessage;

function presenceDisplayName(presences: unknown): string | undefined {
  const list = Array.isArray(presences) ? presences : [];
  const meta = list[0] as { user_name?: string } | undefined;
  const name = meta?.user_name?.trim();
  return name || undefined;
}

function mergePeerNames(
  prev: Map<string, string>,
  entries: Iterable<[string, string]>
): Map<string, string> {
  const next = new Map(prev);
  for (const [id, name] of entries) {
    if (name.trim()) next.set(id, name.trim());
  }
  return next;
}

export const useWebRTCSignaling = (meetingId: string, userId: string, userName: string = '') => {
  const [connectedPeers, setConnectedPeers] = useState<Set<string>>(new Set());
  const [peerUserNames, setPeerUserNames] = useState<Map<string, string>>(new Map());
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const pendingLeaveTimersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const sessionEpochRef = useRef(String(Date.now()));
  const { toast } = useToast();

  const dispatchSignal = useCallback((message: NormalizedSignalingMessage) => {
    window.dispatchEvent(new CustomEvent('webrtc-signaling', { detail: message }));
  }, []);

  const handleInbound = useCallback(
    (event: string, rawPayload: Record<string, unknown>) => {
      const message = normalizeInboundSignal(event, rawPayload, meetingId);
      if (!message || message.from === userId) return;

      if (message.type === 'user-info' && message.userName) {
        setPeerUserNames((prev) => {
          const next = new Map(prev);
          next.set(message.from, message.userName!);
          return next;
        });
      }

      if (message.type === 'rejoin' || message.type === 'join') {
        cancelPendingLeave(message.from);
        setConnectedPeers((prev) => new Set([...prev, message.from]));
        if (message.userName) {
          setPeerUserNames((prev) => {
            const next = new Map(prev);
            next.set(message.from, message.userName!);
            return next;
          });
        }
      }

      dispatchSignal(message);
    },
    [meetingId, userId, dispatchSignal]
  );

  const cancelPendingLeave = useCallback((peerId: string) => {
    const timer = pendingLeaveTimersRef.current.get(peerId);
    if (timer) {
      clearTimeout(timer);
      pendingLeaveTimersRef.current.delete(peerId);
    }
  }, []);

  const schedulePeerLeave = useCallback(
    (peerId: string) => {
      cancelPendingLeave(peerId);
      const timer = setTimeout(() => {
        pendingLeaveTimersRef.current.delete(peerId);
        setConnectedPeers((prev) => {
          const next = new Set(prev);
          next.delete(peerId);
          return next;
        });
        setPeerUserNames((prev) => {
          const next = new Map(prev);
          next.delete(peerId);
          return next;
        });
        dispatchSignal({
          type: 'leave',
          from: peerId,
          meetingId,
          data: { userId: peerId },
          intentionalLeave: true,
        });
      }, PEER_LEAVE_GRACE_MS);
      pendingLeaveTimersRef.current.set(peerId, timer);
    },
    [cancelPendingLeave, dispatchSignal, meetingId]
  );

  const attachChannelHandlers = useCallback(
    (channel: ReturnType<typeof supabase.channel>) => {
      const mobileEvents = ['peer-join', 'peer-leave', 'offer', 'answer', 'ice', 'ice-candidate'] as const;

      channel
        .on('broadcast', { event: 'signaling' }, ({ payload }) => {
          handleInbound('signaling', payload as Record<string, unknown>);
        });

      mobileEvents.forEach((event) => {
        channel.on('broadcast', { event }, ({ payload }) => {
          handleInbound(event, payload as Record<string, unknown>);
        });
      });

      channel
        .on('presence', { event: 'sync' }, () => {
          const newState = channel.presenceState();
          const peers = new Set<string>();
          const names: [string, string][] = [];

          for (const key of Object.keys(newState)) {
            if (key === userId) continue;
            peers.add(key);
            const name = presenceDisplayName(newState[key]);
            if (name) names.push([key, name]);
          }

          setConnectedPeers(peers);
          if (names.length > 0) {
            setPeerUserNames((prev) => mergePeerNames(prev, names));
          }
        })
        .on('presence', { event: 'join' }, ({ key, newPresences }: { key: string; newPresences: unknown }) => {
          if (key === userId) return;
          cancelPendingLeave(key);
          setConnectedPeers((prev) => new Set([...prev, key]));

          const name = presenceDisplayName(newPresences);
          if (name) {
            setPeerUserNames((prev) => mergePeerNames(prev, [[key, name]]));
          }

          dispatchSignal({
            type: 'rejoin',
            from: key,
            meetingId,
            data: { userId: key, userName: name },
            userName: name,
          });
          setTimeout(() => {
            sendSignalingMessageRef.current?.({
              type: 'user-info',
              data: null,
              userName,
            });
          }, 150);
        })
        .on('presence', { event: 'leave' }, ({ key }: { key: string }) => {
          if (key === userId) return;
          schedulePeerLeave(key);
        });
    },
    [userId, meetingId, userName, handleInbound, cancelPendingLeave, schedulePeerLeave, dispatchSignal]
  );

  const sendSignalingMessageRef = useRef<
    ((message: Omit<SignalingMessage, 'from' | 'meetingId'>) => void) | null
  >(null);

  const subscribeChannel = useCallback(async () => {
    if (!meetingId || !userId) return;

    if (channelRef.current) {
      await supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    const channel = supabase.channel(`meeting-${meetingId}`, {
      config: { presence: { key: userId } },
    });

    attachChannelHandlers(channel);

    channel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        sessionEpochRef.current = String(Date.now());
        await channel.track({
          user_id: userId,
          user_name: userName,
          platform: detectClientPlatform(),
          session_epoch: sessionEpochRef.current,
          online_at: new Date().toISOString(),
        });

        setTimeout(() => {
          sendSignalingMessageRef.current?.({
            type: 'rejoin',
            data: { sessionEpoch: sessionEpochRef.current },
            userName,
          });
          sendSignalingMessageRef.current?.({
            type: 'user-info',
            data: null,
            userName,
          });
        }, 300);
      }

      if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
        console.warn('Signaling channel error, resubscribing…', status);
        setTimeout(() => void subscribeChannel(), 2000);
      }
    });

    channelRef.current = channel;
  }, [meetingId, userId, userName, attachChannelHandlers]);

  const initializeSignaling = useCallback(() => {
    void subscribeChannel();
    return channelRef.current;
  }, [subscribeChannel]);

  const sendSignalingMessage = useCallback(
    (message: Omit<SignalingMessage, 'from' | 'meetingId'>) => {
      if (!channelRef.current) return;

      const fullMessage: NormalizedSignalingMessage = {
        ...message,
        from: userId,
        meetingId,
        userName,
        platform: detectClientPlatform(),
      };

      const broadcasts = buildOutboundBroadcasts(fullMessage);
      broadcasts.forEach(({ event, payload }) => {
        channelRef.current?.send({ type: 'broadcast', event, payload });
      });
    },
    [userId, meetingId, userName]
  );

  sendSignalingMessageRef.current = sendSignalingMessage;

  const cleanup = useCallback(
    (intentional = true) => {
      pendingLeaveTimersRef.current.forEach((timer) => clearTimeout(timer));
      pendingLeaveTimersRef.current.clear();

      if (channelRef.current) {
        sendSignalingMessage({
          type: 'leave',
          data: { userId, userName },
          intentionalLeave: intentional,
        });
        void supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
      setConnectedPeers(new Set());
      setPeerUserNames(new Map());
    },
    [sendSignalingMessage, userId, userName]
  );

  // Reconnect signaling when network returns
  useEffect(() => {
    const onOnline = () => {
      console.log('Network online — refreshing signaling channel');
      void subscribeChannel();
      window.dispatchEvent(new CustomEvent('meeting-network-online'));
    };

    const onVisibility = () => {
      if (document.visibilityState === 'visible') {
        void subscribeChannel();
        window.dispatchEvent(new CustomEvent('meeting-visibility-resume'));
      }
    };

    window.addEventListener('online', onOnline);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.removeEventListener('online', onOnline);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [subscribeChannel]);

  useEffect(() => {
    if (!meetingId || !userId || !userName.trim() || !channelRef.current) return;
    sendSignalingMessage({ type: 'user-info', data: null, userName });

    const channel = channelRef.current;
    void channel.track({
      user_id: userId,
      user_name: userName,
      platform: detectClientPlatform(),
      session_epoch: sessionEpochRef.current,
      online_at: new Date().toISOString(),
    });
  }, [meetingId, userId, userName, sendSignalingMessage]);

  // Keep display names fresh for late joiners and after reconnects
  useEffect(() => {
    if (!meetingId || !userId || !userName.trim()) return;

    const broadcastName = () => {
      sendSignalingMessageRef.current?.({
        type: 'user-info',
        data: { heartbeat: true },
        userName,
      });
    };

    broadcastName();
    const interval = setInterval(broadcastName, 12_000);
    return () => clearInterval(interval);
  }, [meetingId, userId, userName]);

  return {
    initializeSignaling,
    sendSignalingMessage,
    connectedPeers,
    peerUserNames,
    cleanup,
    resubscribe: subscribeChannel,
  };
};
