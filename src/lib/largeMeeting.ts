import { SFU_AUTO_THRESHOLD } from '@/lib/meetingTopology';

/** Large meeting / webinar limits and tuning */
export const LARGE_MEETING_THRESHOLDS = {
  /** Switch to webinar-style UI */
  webinarUi: 12,
  /** Stagger peer negotiations more aggressively */
  connectionStaggerMs: 12,
  /** Aggressive audio bitrate / sample-rate reduction */
  audioCompact: 16,
} as const;

export const MEETING_LIMITS = {
  maxParticipants: 500,
  /**
   * Hard ceiling on simultaneous mesh peer connections for any one client.
   * Host-hub hosts may still need many legs, but we never allow unbounded P2P fan-out.
   */
  maxMeshPeerConnections: Math.max(SFU_AUTO_THRESHOLD + 4, 16),
  /** Slightly slower negotiation pump under load reduces offer glare */
  peerConnectionDelayMs: 260,
  maxConcurrentNegotiations: 2,
} as const;

export function isScreenShareTrack(track: MediaStreamTrack | null | undefined): boolean {
  if (!track || track.kind !== 'video') return false;
  try {
    const settings = track.getSettings() as MediaTrackSettings & { displaySurface?: string };
    if (settings.displaySurface) return true;
  } catch {
    /* getSettings may fail on some browsers */
  }
  return /screen|window|display|tab/i.test(track.label);
}

export function getAudioConstraintsForParticipantCount(count: number): MediaTrackConstraints {
  const compact = count > LARGE_MEETING_THRESHOLDS.audioCompact;
  return {
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: true,
    channelCount: 1,
    sampleRate: compact ? 16000 : 48000,
  };
}

/** Extra delay between peer connects as room size grows (host-hub safety). */
export function peerConnectDelayForCount(participantCount: number): number {
  if (participantCount > 80) return 450;
  if (participantCount > 40) return 350;
  if (participantCount > SFU_AUTO_THRESHOLD) return 300;
  return MEETING_LIMITS.peerConnectionDelayMs;
}

export function createPeerConnectionQueue(
  connect: (peerId: string) => void,
  delayMs = MEETING_LIMITS.peerConnectionDelayMs
) {
  const pending: string[] = [];
  const scheduled = new Set<string>();
  let timer: ReturnType<typeof setTimeout> | null = null;
  let currentDelay = delayMs;

  const pump = () => {
    if (pending.length === 0) {
      timer = null;
      return;
    }
    const peerId = pending.shift()!;
    scheduled.delete(peerId);
    connect(peerId);
    timer = setTimeout(pump, currentDelay);
  };

  return {
    enqueue(peerId: string) {
      if (scheduled.has(peerId)) return;
      scheduled.add(peerId);
      pending.push(peerId);
      if (!timer) pump();
    },
    setDelay(ms: number) {
      currentDelay = Math.max(120, ms);
    },
    clear() {
      pending.length = 0;
      scheduled.clear();
      if (timer) clearTimeout(timer);
      timer = null;
    },
  };
}
