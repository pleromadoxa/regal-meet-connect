import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { channelRetryDelay } from '@/lib/meetingBroadcast';

export type LobbyGuestStatus = 'knocking' | 'admitted' | 'denied';

interface UseMeetingLobbyGuestOptions {
  meetingId: string;
  userId: string;
  userName: string;
  onAdmit: () => void;
  onDeny: () => void;
}

const KNOCK_BASE_MS = 4000;
const KNOCK_MAX_MS = 12000;

/** Guest lobby channel with resilient knock + admit/deny handling. */
export function useMeetingLobbyGuest({
  meetingId,
  userId,
  userName,
  onAdmit,
  onDeny,
}: UseMeetingLobbyGuestOptions) {
  const [status, setStatus] = useState<LobbyGuestStatus>('knocking');
  const statusRef = useRef<LobbyGuestStatus>('knocking');
  statusRef.current = status;
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const subscribedRef = useRef(false);
  const knockTimerRef = useRef<number | null>(null);
  const knockAttemptRef = useRef(0);
  const retrySubscribeRef = useRef(0);
  const aliveRef = useRef(true);
  const subscribeLobbyRef = useRef<() => void>(() => undefined);
  const onAdmitRef = useRef(onAdmit);
  const onDenyRef = useRef(onDeny);
  onAdmitRef.current = onAdmit;
  onDenyRef.current = onDeny;
  const sendKnockRef = useRef<() => void>(() => undefined);

  const clearKnockTimer = useCallback(() => {
    if (knockTimerRef.current !== null) {
      window.clearTimeout(knockTimerRef.current);
      knockTimerRef.current = null;
    }
  }, []);

  const sendKnock = useCallback(() => {
    if (statusRef.current !== 'knocking') return;
    const channel = channelRef.current;
    if (!channel) return;

    // Self-schedule the next knock so the backoff actually escalates instead
    // of the interval keeping its initial (short) delay forever.
    clearKnockTimer();
    const delay = Math.min(KNOCK_BASE_MS + knockAttemptRef.current * 1000, KNOCK_MAX_MS);
    knockTimerRef.current = window.setTimeout(() => {
      knockAttemptRef.current += 1;
      sendKnockRef.current();
    }, delay);

    channel
      .send({
        type: 'broadcast',
        event: 'knock',
        payload: { userId, userName, ts: Date.now() },
      })
      .then((res) => {
        // A knock that failed to leave this tab should not slow the retry down.
        if (res !== 'ok') knockAttemptRef.current = 0;
      })
      .catch(() => {
        knockAttemptRef.current = 0;
      });
  }, [clearKnockTimer, userId, userName]);

  sendKnockRef.current = sendKnock;

  const startKnocking = useCallback(() => {
    if (statusRef.current !== 'knocking') return;
    knockAttemptRef.current = 0;
    sendKnock();
  }, [sendKnock]);

  const subscribeLobby = useCallback(() => {
    if (!aliveRef.current) return;
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    subscribedRef.current = false;
    const channel = supabase.channel(`lobby-${meetingId}`, {
      config: { broadcast: { self: false } },
    });

    channel
      .on('broadcast', { event: 'admit' }, ({ payload }) => {
        if (payload?.userId !== userId) return;
        if (statusRef.current === 'admitted') return;
        clearKnockTimer();
        setStatus('admitted');
        window.setTimeout(() => onAdmitRef.current(), 600);
      })
      .on('broadcast', { event: 'deny' }, ({ payload }) => {
        if (payload?.userId !== userId) return;
        if (statusRef.current === 'denied') return;
        clearKnockTimer();
        setStatus('denied');
        window.setTimeout(() => onDenyRef.current(), 1500);
      })
      .subscribe((subStatus) => {
        subscribedRef.current = subStatus === 'SUBSCRIBED';

        if (subStatus === 'SUBSCRIBED') {
          retrySubscribeRef.current = 0;
          startKnocking();
          return;
        }

        if (
          subStatus === 'CHANNEL_ERROR' ||
          subStatus === 'TIMED_OUT' ||
          subStatus === 'CLOSED'
        ) {
          clearKnockTimer();
          // Never give up: the guest keeps waiting in the lobby otherwise.
          if (!aliveRef.current) return;
          const attempt = retrySubscribeRef.current;
          retrySubscribeRef.current = attempt + 1;
          window.setTimeout(() => subscribeLobbyRef.current(), channelRetryDelay(attempt));
        }
      });

    channelRef.current = channel;
  }, [clearKnockTimer, meetingId, startKnocking, userId]);

  subscribeLobbyRef.current = subscribeLobby;

  useEffect(() => {
    aliveRef.current = true;
    subscribeLobby();

    const reconnect = () => {
      if (statusRef.current !== 'knocking') return;
      if (subscribedRef.current) {
        knockAttemptRef.current = 0;
        sendKnock();
        return;
      }
      subscribeLobbyRef.current();
    };

    const onOnline = () => reconnect();
    const onVisible = () => {
      if (document.visibilityState === 'visible') reconnect();
    };

    window.addEventListener('online', onOnline);
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      // Flip first: removing the channel fires CLOSED which would otherwise
      // schedule a resurrect after unmount.
      aliveRef.current = false;
      clearKnockTimer();
      window.removeEventListener('online', onOnline);
      document.removeEventListener('visibilitychange', onVisible);
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [subscribeLobby, clearKnockTimer, sendKnock]);

  return { status };
}
