import { PEER_DISCONNECT_GRACE_MS } from '@/lib/webrtcSignaling';

const disconnectTimers = new Map<string, ReturnType<typeof setTimeout>>();
const lastRestartAt = new Map<string, number>();

/** Minimum gap between ICE restarts for the same peer (avoids renegotiation storms). */
export const PEER_RESTART_COOLDOWN_MS = 5_000;

export function schedulePeerDisconnectCleanup(
  peerId: string,
  onCleanup: () => void,
  graceMs = PEER_DISCONNECT_GRACE_MS
) {
  cancelPeerDisconnectCleanup(peerId);
  const timer = setTimeout(() => {
    disconnectTimers.delete(peerId);
    onCleanup();
  }, graceMs);
  disconnectTimers.set(peerId, timer);
}

export function cancelPeerDisconnectCleanup(peerId: string) {
  const timer = disconnectTimers.get(peerId);
  if (timer) {
    clearTimeout(timer);
    disconnectTimers.delete(peerId);
  }
}

export function clearAllPeerDisconnectTimers() {
  disconnectTimers.forEach((timer) => clearTimeout(timer));
  disconnectTimers.clear();
  lastRestartAt.clear();
}

export async function restartPeerNegotiation(
  pc: RTCPeerConnection,
  onOfferReady: (offer: RTCSessionDescriptionInit) => Promise<void>,
  peerId?: string
) {
  if (pc.signalingState === 'closed') return;

  // Avoid glare / stacked restarts while another offer/answer is in flight
  if (pc.signalingState !== 'stable') return;

  const key = peerId || 'anon';
  const now = Date.now();
  const previous = lastRestartAt.get(key) ?? 0;
  if (now - previous < PEER_RESTART_COOLDOWN_MS) return;
  lastRestartAt.set(key, now);

  try {
    if (pc.connectionState === 'failed' || pc.iceConnectionState === 'failed') {
      pc.restartIce();
    }
    const offer = await pc.createOffer({ iceRestart: true });
    if (pc.signalingState !== 'stable') return;
    await pc.setLocalDescription(offer);
    await onOfferReady(pc.localDescription!.toJSON());
  } catch (err) {
    console.warn('restartPeerNegotiation failed:', err);
  }
}
