import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface PresentationPayload {
  active: boolean;
  userId: string;
  userName?: string;
}

/** Syncs host screen-share / presentation mode to every client in the room */
export function useMeetingPresentation(meetingId: string, userId: string) {
  const [presentationActive, setPresentationActive] = useState(false);
  const [presenterId, setPresenterId] = useState<string | null>(null);
  const [presenterName, setPresenterName] = useState<string | null>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const lastPayloadRef = useRef<PresentationPayload | null>(null);

  const broadcastPresentation = useCallback((payload: PresentationPayload) => {
    channelRef.current?.send({
      type: 'broadcast',
      event: 'presentation',
      payload,
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
          broadcastPresentation(lastPayloadRef.current);
        }
      })
      .subscribe((status) => {
        if (status !== 'SUBSCRIBED') return;

        if (lastPayloadRef.current?.active) {
          broadcastPresentation(lastPayloadRef.current);
        }

        channel.send({
          type: 'broadcast',
          event: 'presentation-sync-request',
          payload: { requestedBy: userId },
        });
      });

    channelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [meetingId, userId, broadcastPresentation]);

  const setPresentation = useCallback(
    (active: boolean, userName?: string) => {
      const payload = { active, userId, userName } satisfies PresentationPayload;
      lastPayloadRef.current = payload;
      setPresentationActive(active);
      setPresenterId(active ? userId : null);
      setPresenterName(active ? userName ?? null : null);
      broadcastPresentation(payload);
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
