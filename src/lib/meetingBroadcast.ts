import type { MutableRefObject } from 'react';
import type { RealtimeChannel } from '@supabase/supabase-js';

/** Wait until a Supabase channel reports SUBSCRIBED (or timeout). */
export async function waitForChannelSubscribed(
  subscribedRef: MutableRefObject<boolean>,
  timeoutMs = 3000
): Promise<boolean> {
  if (subscribedRef.current) return true;

  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (subscribedRef.current) return true;
    // Use timers, NOT requestAnimationFrame: rAF never fires while the tab is
    // hidden, which used to make this await hang forever and stall any send
    // (admit, reaction, chat) triggered while the window was backgrounded.
    await new Promise<void>((resolve) => setTimeout(resolve, 40));
  }
  return subscribedRef.current;
}

export function channelRetryDelay(attempt: number, baseMs = 2000, maxMs = 30000): number {
  return Math.min(baseMs * Math.pow(2, attempt), maxMs);
}

type BroadcastResult = 'ok' | 'timed out' | 'error';

/**
 * Fire a broadcast payload, retrying on local failure with a short backoff.
 *
 * Broadcasts are fire-and-forget (no receiver ack), so this only guarantees the
 * message left *this* tab. Callers should still keep re-sending stateful
 * messages (lobby knocks/admits) until the other side acknowledges them.
 */
export async function sendBroadcastWithRetry(
  channel: Pick<RealtimeChannel, 'send'>,
  event: string,
  payload: Record<string, unknown>,
  opts: { attempts?: number; delayMs?: number } = {}
): Promise<boolean> {
  const attempts = opts.attempts ?? 3;
  const baseDelay = opts.delayMs ?? 400;

  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      const res = (await channel.send({
        type: 'broadcast',
        event,
        payload,
      })) as BroadcastResult;
      if (res === 'ok') return true;
    } catch {
      // socket not ready — retry below
    }
    if (attempt < attempts - 1) {
      await new Promise<void>((resolve) => setTimeout(resolve, baseDelay * (attempt + 1)));
    }
  }
  return false;
}
