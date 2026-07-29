import { useEffect, useRef, useState, useCallback, type ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';

interface KnockingGuest {
  userId: string;
  userName: string;
  ts: number;
}

/**
 * Host-side hook: listens for guest "knock" requests on the lobby channel and
 * lets the host admit or deny them. Should be active only for the meeting host.
 */
export const useLobbyHost = (meetingId: string, isHost: boolean) => {
  const [pending, setPending] = useState<KnockingGuest[]>([]);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const handledRef = useRef<Set<string>>(new Set());
  const { toast } = useToast();
  const toastRef = useRef(toast);
  toastRef.current = toast;

  const respond = useCallback((event: 'admit' | 'deny', userId: string) => {
    channelRef.current?.send({ type: 'broadcast', event, payload: { userId } });
    handledRef.current.add(userId);
    setPending((prev) => prev.filter((g) => g.userId !== userId));
  }, []);

  useEffect(() => {
    if (!isHost || !meetingId) return;

    const channel = supabase.channel(`lobby-${meetingId}`, {
      config: { broadcast: { self: false } },
    });

    channel
      .on('broadcast', { event: 'knock' }, ({ payload }) => {
        const guest = payload as KnockingGuest;
        if (!guest?.userId || handledRef.current.has(guest.userId)) return;
        setPending((prev) => {
          if (prev.some((g) => g.userId === guest.userId)) return prev;
          toastRef.current({
            title: 'Someone wants to join',
            description: `${guest.userName} is waiting in the lobby`,
            duration: 30000,
            action: (
              <div className="flex gap-2">
                <Button
                  size="sm"
                  className="bg-emerald-600 hover:bg-emerald-700 text-white"
                  onClick={() => respond('admit', guest.userId)}
                >
                  Admit
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="border-white/20 text-white hover:bg-white/10"
                  onClick={() => respond('deny', guest.userId)}
                >
                  Deny
                </Button>
              </div>
            ) as ReactNode,
          });
          return [...prev, guest];
        });
      })
      .subscribe();

    channelRef.current = channel;
    return () => {
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [meetingId, isHost, respond]);

  const admit = (userId: string) => respond('admit', userId);
  const deny = (userId: string) => respond('deny', userId);

  return { pending, admit, deny };
};
