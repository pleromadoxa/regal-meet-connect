import { useEffect, useRef, useState } from 'react';
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
  const channelRef = useRef<any>(null);
  const handledRef = useRef<Set<string>>(new Set());
  const { toast } = useToast();

  useEffect(() => {
    if (!isHost || !meetingId) return;

    const channel = supabase.channel(`lobby-${meetingId}`, {
      config: { broadcast: { self: false } },
    });

    const respond = (event: 'admit' | 'deny', userId: string) => {
      channel.send({ type: 'broadcast', event, payload: { userId } });
      handledRef.current.add(userId);
      setPending((prev) => prev.filter((g) => g.userId !== userId));
    };

    channel
      .on('broadcast', { event: 'knock' }, ({ payload }) => {
        const guest = payload as KnockingGuest;
        if (!guest?.userId || handledRef.current.has(guest.userId)) return;
        setPending((prev) => {
          if (prev.some((g) => g.userId === guest.userId)) return prev;
          // Show toast with Admit/Deny actions
          toast({
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
            ) as any,
          });
          return [...prev, guest];
        });
      })
      .subscribe();

    channelRef.current = channel;
    return () => {
      supabase.removeChannel(channel);
    };
  }, [meetingId, isHost, toast]);

  const admit = (userId: string) => {
    channelRef.current?.send({ type: 'broadcast', event: 'admit', payload: { userId } });
    handledRef.current.add(userId);
    setPending((prev) => prev.filter((g) => g.userId !== userId));
  };

  const deny = (userId: string) => {
    channelRef.current?.send({ type: 'broadcast', event: 'deny', payload: { userId } });
    handledRef.current.add(userId);
    setPending((prev) => prev.filter((g) => g.userId !== userId));
  };

  return { pending, admit, deny };
};
