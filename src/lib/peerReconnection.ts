import { PEER_DISCONNECT_GRACE_MS } from '@/lib/webrtcSignaling';

const disconnectTimers = new Map<string, ReturnType<typeof setTimeout>>();

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
}

export async function restartPeerNegotiation(
  pc: RTCPeerConnection,
  onOfferReady: (offer: RTCSessionDescriptionInit) => Promise<void>
) {
  if (pc.signalingState === 'closed') return;
  try {
    if (pc.connectionState === 'failed' || pc.iceConnectionState === 'failed') {
      pc.restartIce();
    }
    const offer = await pc.createOffer({ iceRestart: true });
    await pc.setLocalDescription(offer);
    await onOfferReady(pc.localDescription!.toJSON());
  } catch (err) {
    console.warn('restartPeerNegotiation failed:', err);
  }
}
