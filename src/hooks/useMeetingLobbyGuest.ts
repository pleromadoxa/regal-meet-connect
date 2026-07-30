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
  const knockTimerRef = useRef<number | null>(null);
  const knockAttemptRef = useRef(0);
  const retrySubscribeRef = useRef(0);
  const onAdmitRef = useRef(onAdmit);
  const onDenyRef = useRef(onDeny);
  onAdmitRef.current = onAdmit;
  onDenyRef.current = onDeny;

  const clearKnockTimer = useCallback(() => {
    if (knockTimerRef.current !== null) {
      window.clearInterval(knockTimerRef.current);
      knockTimerRef.current = null;
    }
  }, []);

  const sendKnock = useCallback(() => {
    channelRef.current?.send({
      type: 'broadcast',
      event: 'knock',
      payload: { userId, userName, ts: Date.now() },
    });
  }, [userId, userName]);

  const scheduleKnocks = useCallback(() => {
    clearKnockTimer();
    sendKnock();
    knockTimerRef.current = window.setInterval(() => {
      knockAttemptRef.current += 1;
      sendKnock();
    }, Math.min(4000 + knockAttemptRef.current * 1000, 12000));
  }, [clearKnockTimer, sendKnock]);

  const subscribeLobby = useCallback(() => {
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    const channel = supabase.channel(`lobby-${meetingId}`, {
      config: { broadcast: { self: false } },
    });

    channel
      .on('broadcast', { event: 'admit' }, ({ payload }) => {
        if (payload?.userId === userId) {
          clearKnockTimer();
          setStatus('admitted');
          window.setTimeout(() => onAdmitRef.current(), 600);
        }
      })
      .on('broadcast', { event: 'deny' }, ({ payload }) => {
        if (payload?.userId === userId) {
          clearKnockTimer();
          setStatus('denied');
          window.setTimeout(() => onDenyRef.current(), 1500);
        }
      })
      .subscribe((subStatus) => {
        if (subStatus === 'SUBSCRIBED') {
          retrySubscribeRef.current = 0;
          knockAttemptRef.current = 0;
          scheduleKnocks();
          return;
        }

        if (subStatus === 'CHANNEL_ERROR' || subStatus === 'TIMED_OUT') {
          clearKnockTimer();
          const attempt = retrySubscribeRef.current;
          if (attempt >= 8) return;
          retrySubscribeRef.current = attempt + 1;
          const delay = channelRetryDelay(attempt);
          window.setTimeout(() => subscribeLobby(), delay);
        }
      });

    channelRef.current = channel;
  }, [meetingId, userId, clearKnockTimer, scheduleKnocks]);

  useEffect(() => {
    subscribeLobby();

    const onOnline = () => {
      if (statusRef.current === 'knocking') {
        knockAttemptRef.current = 0;
        sendKnock();
      }
    };

    const onVisible = () => {
      if (document.visibilityState === 'visible' && statusRef.current === 'knocking') {
        sendKnock();
      }
    };

    window.addEventListener('online', onOnline);
    document.addEventListener('visibilitychange', onVisible);

    return () => {
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
