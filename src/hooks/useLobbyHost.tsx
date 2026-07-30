import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { channelRetryDelay, waitForChannelSubscribed } from '@/lib/meetingBroadcast';

interface KnockingGuest {
  userId: string;
  userName: string;
  ts: number;
}

/**
 * Host-side hook: listens for guest knocks and admits/denies with retry on bad network.
 */
export const useLobbyHost = (meetingId: string, isHost: boolean) => {
  const [pending, setPending] = useState<KnockingGuest[]>([]);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const subscribedRef = useRef(false);
  const handledRef = useRef<Set<string>>(new Set());
  const retrySubscribeRef = useRef(0);
  const subscribeLobbyRef = useRef<() => void>(() => undefined);
  const { toast } = useToast();
  const toastRef = useRef(toast);
  toastRef.current = toast;

  const respond = useCallback(async (event: 'admit' | 'deny', userId: string) => {
    if (!channelRef.current) return false;

    const ready = await waitForChannelSubscribed(subscribedRef, 5000);
    if (!ready) return false;

    for (let attempt = 0; attempt < 3; attempt += 1) {
      const { error } = await channelRef.current.send({
        type: 'broadcast',
        event,
        payload: { userId, ts: Date.now() },
      });
      if (!error) {
        handledRef.current.add(userId);
        setPending((prev) => prev.filter((g) => g.userId !== userId));
        return true;
      }
      await new Promise((r) => window.setTimeout(r, 500 * (attempt + 1)));
    }
    return false;
  }, []);

  const admit = useCallback(
    (userId: string) => {
      void respond('admit', userId);
    },
    [respond]
  );

  const deny = useCallback(
    (userId: string) => {
      void respond('deny', userId);
    },
    [respond]
  );

  const showGuestToast = useCallback(
    (guest: KnockingGuest) => {
      toastRef.current({
        title: 'Someone wants to join',
        description: `${guest.userName} is waiting in the lobby`,
        duration: 60000,
        action: (
          <div className="flex gap-2">
            <Button
              size="sm"
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
              onClick={() => admit(guest.userId)}
            >
              Admit
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="border-white/20 text-white hover:bg-white/10"
              onClick={() => deny(guest.userId)}
            >
              Deny
            </Button>
          </div>
        ) as ReactNode,
      });
    },
    [admit, deny]
  );

  const subscribeLobby = useCallback(() => {
    if (!isHost || !meetingId) return;

    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    subscribedRef.current = false;
    const channel = supabase.channel(`lobby-${meetingId}`, {
      config: { broadcast: { self: false } },
    });

    channel
      .on('broadcast', { event: 'knock' }, ({ payload }) => {
        const guest = payload as KnockingGuest;
        if (!guest?.userId || handledRef.current.has(guest.userId)) return;

        setPending((prev) => {
          const exists = prev.some((g) => g.userId === guest.userId);
          if (exists) {
            return prev.map((g) => (g.userId === guest.userId ? { ...g, ts: guest.ts ?? g.ts } : g));
          }
          showGuestToast(guest);
          return [...prev, guest];
        });
      })
      .subscribe((status) => {
        subscribedRef.current = status === 'SUBSCRIBED';
        if (status === 'SUBSCRIBED') {
          retrySubscribeRef.current = 0;
          return;
        }
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          const attempt = retrySubscribeRef.current;
          if (attempt >= 8) return;
          retrySubscribeRef.current = attempt + 1;
          window.setTimeout(() => subscribeLobbyRef.current(), channelRetryDelay(attempt));
        }
      });

    channelRef.current = channel;
  }, [isHost, meetingId, showGuestToast]);

  subscribeLobbyRef.current = subscribeLobby;

  useEffect(() => {
    if (!isHost || !meetingId) return;

    subscribeLobby();

    const onOnline = () => subscribeLobbyRef.current();

    window.addEventListener('online', onOnline);
    return () => {
      window.removeEventListener('online', onOnline);
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
      subscribedRef.current = false;
    };
  }, [isHost, meetingId, subscribeLobby]);

  return { pending, admit, deny };
};
