/** Large meeting / webinar limits and tuning */
export const LARGE_MEETING_THRESHOLDS = {
  /** Switch to webinar-style UI */
  webinarUi: 12,
  /** Stagger peer negotiations more aggressively */
  connectionStaggerMs: 12,
  /** Aggressive audio bitrate reduction */
  audioCompact: 50,
} as const;

export const MEETING_LIMITS = {
  maxParticipants: 500,
  maxMeshPeerConnections: 500,
  peerConnectionDelayMs: 180,
  maxConcurrentNegotiations: 3,
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

export function createPeerConnectionQueue(
  connect: (peerId: string) => void,
  delayMs = MEETING_LIMITS.peerConnectionDelayMs
) {
  const pending: string[] = [];
  const scheduled = new Set<string>();
  let timer: ReturnType<typeof setTimeout> | null = null;

  const pump = () => {
    if (pending.length === 0) {
      timer = null;
      return;
    }
    const peerId = pending.shift()!;
    scheduled.delete(peerId);
    connect(peerId);
    timer = setTimeout(pump, delayMs);
  };

  return {
    enqueue(peerId: string) {
      if (scheduled.has(peerId)) return;
      scheduled.add(peerId);
      pending.push(peerId);
      if (!timer) pump();
    },
    clear() {
      pending.length = 0;
      scheduled.clear();
      if (timer) clearTimeout(timer);
      timer = null;
    },
  };
}
