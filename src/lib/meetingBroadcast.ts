import type { MutableRefObject } from 'react';

/** Wait until a Supabase channel reports SUBSCRIBED (or timeout). */
export async function waitForChannelSubscribed(
  subscribedRef: MutableRefObject<boolean>,
  timeoutMs = 3000
): Promise<boolean> {
  if (subscribedRef.current) return true;

  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (subscribedRef.current) return true;
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
  }
  return subscribedRef.current;
}

export function channelRetryDelay(attempt: number, baseMs = 2000, maxMs = 30000): number {
  return Math.min(baseMs * Math.pow(2, attempt), maxMs);
}
