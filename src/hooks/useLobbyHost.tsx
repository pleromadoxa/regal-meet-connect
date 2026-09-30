import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import type { ToastActionElement } from '@/components/ui/toast';
import { channelRetryDelay, sendBroadcastWithRetry, waitForChannelSubscribed } from '@/lib/meetingBroadcast';

interface KnockingGuest {
  userId: string;
  userName: string;
  ts: number;
}

interface HostDecision {
  event: 'admit' | 'deny';
  at: number;
}

/** Don't replay the same decision more often than this (guest re-knocks every few seconds). */
const DECISION_RESEND_COOLDOWN_MS = 2500;
/** Total time we'll spend making sure a single admit/deny leaves this tab. */
const RESPOND_TIMEOUT_MS = 8000;

/**
 * Host-side hook: listens for guest knocks and admits/denies them.
 *
 * Supabase broadcast is fire-and-forget, so a single admit can be lost (guest
 * channel reconnecting, host socket hiccup, host tab hidden). To make admission
 * reliable we:
 *  - keep listening for the guest re-knocking and *re-send* the same decision
 *    until they stop knocking (they leave the lobby on admission),
 *  - only drop a guest from the pending list after a send that actually left
 *    the socket,
 *  - never give up re-subscribing the lobby channel.
 */
export const useLobbyHost = (meetingId: string, isHost: boolean) => {
  const [pending, setPending] = useState<KnockingGuest[]>([]);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const subscribedRef = useRef(false);
  const pendingRef = useRef<KnockingGuest[]>([]);
  const decisionsRef = useRef<Map<string, HostDecision>>(new Map());
  const lastDecisionSentRef = useRef<Map<string, number>>(new Map());
  const retrySubscribeRef = useRef(0);
  const aliveRef = useRef(true);
  const subscribeLobbyRef = useRef<() => void>(() => undefined);
  const { toast, dismiss } = useToast();
  const toastRef = useRef(toast);
  toastRef.current = toast;
  const dismissRef = useRef(dismiss);
  dismissRef.current = dismiss;
  const waitingToastIdsRef = useRef<Map<string, string>>(new Map());

  const syncPending = useCallback((next: KnockingGuest[]) => {
    pendingRef.current = next;
    setPending(next);
  }, []);

  const addToPending = useCallback(
    (guest: KnockingGuest) => {
      const existing = pendingRef.current.find((g) => g.userId === guest.userId);
      if (existing) {
        if (existing.ts === guest.ts) return;
        syncPending(
          pendingRef.current.map((g) => (g.userId === guest.userId ? { ...g, ts: guest.ts ?? g.ts } : g))
        );
        return;
      }
      syncPending([...pendingRef.current, guest]);
    },
    [syncPending]
  );

  const removeFromPending = useCallback(
    (userId: string) => {
      const waitingId = waitingToastIdsRef.current.get(userId);
      if (waitingId) {
        dismissRef.current(waitingId);
        waitingToastIdsRef.current.delete(userId);
      }
      if (!pendingRef.current.some((g) => g.userId === userId)) return;
      syncPending(pendingRef.current.filter((g) => g.userId !== userId));
    },
    [dismissRef, syncPending]
  );

  const respond = useCallback(
    async (
      event: 'admit' | 'deny',
      userId: string,
      opts: { manual?: boolean } = {}
    ): Promise<boolean> => {
      const manual = opts.manual ?? false;
      const channel = channelRef.current;
      if (!channel) {
        if (manual) {
          toastRef.current({
            title: 'Still connecting',
            description: 'The lobby connection is coming up — press the button again in a moment.',
            variant: 'destructive',
          });
        }
        return false;
      }

      const ready = await waitForChannelSubscribed(subscribedRef, RESPOND_TIMEOUT_MS);
      if (!ready) {
        if (manual) {
          toastRef.current({
            title: 'Still connecting',
            description:
              'The lobby connection is reconnecting — we will keep retrying as long as they keep knocking.',
            variant: 'destructive',
          });
        }
        return false;
      }

      const payload = { userId, ts: Date.now() };

      // Record the intent first: even if this send is lost, the guest's next
      // knock will trigger a replay of the same answer.
      decisionsRef.current.set(userId, { event, at: Date.now() });
      lastDecisionSentRef.current.set(userId, Date.now());

      const sent = await sendBroadcastWithRetry(channel, event, payload, {
        attempts: 4,
        delayMs: 600,
      });

      if (sent) {
        removeFromPending(userId);
        if (manual) {
          toastRef.current({
            title: event === 'admit' ? 'Admitting…' : 'Denied',
            description:
              event === 'admit'
                ? 'Waiting for them to confirm they made it in.'
                : 'They have been turned away.',
            duration: 2500,
          });
        }
      } else if (manual) {
        // Keep them visible so the host can press the button again.
        toastRef.current({
          title: 'Could not send',
          description: 'The request did not reach the guest. We will keep retrying — press again if needed.',
          variant: 'destructive',
        });
      }
      return sent;
    },
    [removeFromPending]
  );

  const admit = useCallback(
    (userId: string) => {
      void respond('admit', userId, { manual: true });
    },
    [respond]
  );

  const deny = useCallback(
    (userId: string) => {
      void respond('deny', userId, { manual: true });
    },
    [respond]
  );

  const showGuestToast = useCallback(
    (guest: KnockingGuest) => {
      const { id } = toastRef.current({
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
        ) as unknown as ToastActionElement,
      });
      waitingToastIdsRef.current.set(guest.userId, id);
    },
    [admit, deny]
  );

  const handleKnock = useCallback(
    (raw: unknown) => {
      const guest = raw as KnockingGuest;
      if (!guest?.userId) return;

      const decision = decisionsRef.current.get(guest.userId);
      if (decision) {
        // The guest only keeps knocking if it never got our answer.
        const last = lastDecisionSentRef.current.get(guest.userId) ?? 0;
        if (Date.now() - last < DECISION_RESEND_COOLDOWN_MS) return;
        // Re-run the same decision; it is idempotent on the guest side.
        void respond(decision.event, guest.userId);
        return;
      }

      const isNew = !pendingRef.current.some((g) => g.userId === guest.userId);
      addToPending(guest);
      if (isNew) showGuestToast(guest);
    },
    [addToPending, respond, showGuestToast]
  );

  const subscribeLobby = useCallback(() => {
    if (!isHost || !meetingId) return;
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
      .on('broadcast', { event: 'knock' }, ({ payload }) => handleKnock(payload))
      .subscribe((status) => {
        subscribedRef.current = status === 'SUBSCRIBED';
        if (status === 'SUBSCRIBED') {
          retrySubscribeRef.current = 0;
          return;
        }
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
          // Never give up: a host that stops listening can never admit anyone.
          if (!aliveRef.current) return;
          const attempt = retrySubscribeRef.current;
          retrySubscribeRef.current = attempt + 1;
          window.setTimeout(() => subscribeLobbyRef.current(), channelRetryDelay(attempt));
        }
      });

    channelRef.current = channel;
  }, [handleKnock, isHost, meetingId]);

  subscribeLobbyRef.current = subscribeLobby;

  useEffect(() => {
    aliveRef.current = true;
    if (!isHost || !meetingId) return;

    subscribeLobby();

    const onOnline = () => subscribeLobbyRef.current();
    const onVisible = () => {
      if (document.visibilityState === 'visible' && !subscribedRef.current) {
        subscribeLobbyRef.current();
      }
    };

    window.addEventListener('online', onOnline);
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      // Flip first: removing the channel fires a CLOSED status which would
      // otherwise schedule a resurrect after unmount.
      aliveRef.current = false;
      window.removeEventListener('online', onOnline);
      document.removeEventListener('visibilitychange', onVisible);
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
      subscribedRef.current = false;
    };
  }, [isHost, meetingId, subscribeLobby]);

  return { pending, admit, deny };
};
