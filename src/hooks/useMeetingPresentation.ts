import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { sendBroadcastWithRetry, waitForChannelSubscribed } from '@/lib/meetingBroadcast';

// NOTE: a `type` (not `interface`) so the payload stays assignable to the
// `Record<string, unknown>` broadcast payload shape.
type PresentationPayload = {
  active: boolean;
  userId: string;
  userName?: string;
};

/** How often a presenting client re-asserts its state so nobody stays stuck. */
const PRESENCE_REBROADCAST_MS = 12000;

/** Syncs host screen-share / presentation mode to every client in the room */
export function useMeetingPresentation(meetingId: string, userId: string) {
  const [presentationActive, setPresentationActive] = useState(false);
  const [presenterId, setPresenterId] = useState<string | null>(null);
  const [presenterName, setPresenterName] = useState<string | null>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const subscribedRef = useRef(false);
  const lastPayloadRef = useRef<PresentationPayload | null>(null);

  const broadcastPresentation = useCallback(async (payload: PresentationPayload) => {
    const channel = channelRef.current;
    if (!channel) return;

    // Wait for the socket instead of firing into a channel that is still
    // connecting (the very first "start presenting" click often loses it).
    const ready = await waitForChannelSubscribed(subscribedRef, 4000);
    if (!ready) return;

    await sendBroadcastWithRetry(channel, 'presentation', payload, {
      attempts: 3,
      delayMs: 500,
    });
  }, []);

  useEffect(() => {
    if (!meetingId) return;

    const channel = supabase.channel(`meeting-presentation-${meetingId}`);
    channel
      .on('broadcast', { event: 'presentation' }, ({ payload }) => {
        const data = payload as PresentationPayload;
        setPresentationActive(Boolean(data.active));
        setPresenterId(data.active ? data.userId : null);
        setPresenterName(data.active ? data.userName ?? null : null);
      })
      .on('broadcast', { event: 'presentation-sync-request' }, () => {
        if (lastPayloadRef.current?.active && lastPayloadRef.current.userId === userId) {
          void broadcastPresentation(lastPayloadRef.current);
        }
      })
      .subscribe((status) => {
        subscribedRef.current = status === 'SUBSCRIBED';
        if (status !== 'SUBSCRIBED') return;

        if (lastPayloadRef.current?.active) {
          void broadcastPresentation(lastPayloadRef.current);
        }

        channel.send({
          type: 'broadcast',
          event: 'presentation-sync-request',
          payload: { requestedBy: userId },
        });
      });

    channelRef.current = channel;

    const resync = () => {
      if (lastPayloadRef.current?.active && lastPayloadRef.current.userId === userId) {
        void broadcastPresentation(lastPayloadRef.current);
        return;
      }
      channel.send({
        type: 'broadcast',
        event: 'presentation-sync-request',
        payload: { requestedBy: userId },
      });
    };

    const onVisible = () => {
      if (document.visibilityState === 'visible') resync();
    };
    window.addEventListener('online', resync);
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      window.removeEventListener('online', resync);
      document.removeEventListener('visibilitychange', onVisible);
      subscribedRef.current = false;
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [meetingId, userId, broadcastPresentation]);

  // While we are the presenter, keep re-asserting the state so a viewer whose
  // channel hiccoughed (or who joined during a dropped message) converges.
  useEffect(() => {
    if (!presentationActive || presenterId !== userId) return;
    const payload = lastPayloadRef.current;
    if (!payload?.active) return;

    const timer = window.setInterval(() => {
      void broadcastPresentation(payload);
    }, PRESENCE_REBROADCAST_MS);
    return () => window.clearInterval(timer);
  }, [presentationActive, presenterId, userId, broadcastPresentation]);

  const setPresentation = useCallback(
    (active: boolean, userName?: string) => {
      const payload = { active, userId, userName } satisfies PresentationPayload;
      lastPayloadRef.current = payload;
      setPresentationActive(active);
      setPresenterId(active ? userId : null);
      setPresenterName(active ? userName ?? null : null);
      void broadcastPresentation(payload);
    },
    [userId, broadcastPresentation]
  );

  return {
    presentationActive,
    presenterId,
    presenterName,
    setPresentation,
  };
}
