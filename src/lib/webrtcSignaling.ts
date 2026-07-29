/**
 * Normalizes WebRTC signaling between the web client and mobile apps.
 * Web uses broadcast event "signaling" with typed payloads.
 * Mobile uses peer-join / offer / answer / ice events per regal-meeting-api.md.
 */

export type SignalingType =
  | 'offer'
  | 'answer'
  | 'ice-candidate'
  | 'join'
  | 'leave'
  | 'rejoin'
  | 'user-info'
  | 'audio-toggle'
  | 'speaking-state';

export interface NormalizedSignalingMessage {
  type: SignalingType;
  from: string;
  to?: string;
  meetingId?: string;
  userName?: string;
  data: unknown;
  intentionalLeave?: boolean;
  platform?: 'web' | 'mobile';
}

export function detectClientPlatform(): 'web' | 'mobile' {
  if (typeof navigator === 'undefined') return 'web';
  const ua = navigator.userAgent || '';
  if (/Android|iPhone|iPad|iPod|Mobile/i.test(ua)) return 'mobile';
  return 'web';
}

/** Map mobile broadcast events into the web signaling shape */
export function normalizeInboundSignal(
  event: string,
  payload: Record<string, unknown> | null | undefined,
  meetingId: string
): NormalizedSignalingMessage | null {
  if (!payload || typeof payload !== 'object') return null;

  const from = String(payload.from ?? payload.userId ?? '');
  if (!from) return null;

  const to = payload.to ? String(payload.to) : undefined;
  const userName = payload.userName ? String(payload.userName) : payload.name ? String(payload.name) : undefined;

  if (event === 'signaling' && payload.type) {
    return {
      type: payload.type as SignalingType,
      from,
      to,
      meetingId: String(payload.meetingId ?? meetingId),
      userName: userName ?? (payload.userName as string | undefined),
      data: payload.data ?? null,
      intentionalLeave: Boolean(payload.intentionalLeave),
      platform: (payload.platform as 'web' | 'mobile') ?? 'web',
    };
  }

  if (event === 'peer-join') {
    return { type: 'rejoin', from, userName, meetingId, data: { userName } };
  }

  if (event === 'peer-leave') {
    return {
      type: 'leave',
      from,
      meetingId,
      data: payload,
      intentionalLeave: Boolean(payload.intentional),
    };
  }

  if (event === 'offer') {
    const sdp = payload.sdp ?? (payload.data as { sdp?: string } | undefined)?.sdp;
    return {
      type: 'offer',
      from,
      to,
      meetingId,
      data: sdp ? { type: 'offer', sdp } : payload.data ?? payload,
    };
  }

  if (event === 'answer') {
    const sdp = payload.sdp ?? (payload.data as { sdp?: string } | undefined)?.sdp;
    return {
      type: 'answer',
      from,
      to,
      meetingId,
      data: sdp ? { type: 'answer', sdp } : payload.data ?? payload,
    };
  }

  if (event === 'ice' || event === 'ice-candidate') {
    const candidate = payload.candidate ?? payload.data;
    return { type: 'ice-candidate', from, to, meetingId, data: candidate };
  }

  return null;
}

/** Emit both web and mobile-compatible broadcasts for interoperability */
export function buildOutboundBroadcasts(
  message: Omit<NormalizedSignalingMessage, 'from' | 'meetingId'> & { from: string; meetingId: string }
): Array<{ event: string; payload: Record<string, unknown> }> {
  const base = {
    from: message.from,
    to: message.to,
    meetingId: message.meetingId,
    userName: message.userName,
    platform: detectClientPlatform(),
  };

  const broadcasts: Array<{ event: string; payload: Record<string, unknown> }> = [
    {
      event: 'signaling',
      payload: {
        ...base,
        type: message.type,
        data: message.data,
        intentionalLeave: message.intentionalLeave,
      },
    },
  ];

  switch (message.type) {
    case 'offer': {
      const sdp =
        (message.data as RTCSessionDescriptionInit | null)?.sdp ??
        (message.data as { sdp?: string })?.sdp;
      if (sdp) broadcasts.push({ event: 'offer', payload: { ...base, sdp } });
      break;
    }
    case 'answer': {
      const sdp =
        (message.data as RTCSessionDescriptionInit | null)?.sdp ??
        (message.data as { sdp?: string })?.sdp;
      if (sdp) broadcasts.push({ event: 'answer', payload: { ...base, sdp } });
      break;
    }
    case 'ice-candidate': {
      const candidate = message.data;
      broadcasts.push({ event: 'ice', payload: { ...base, candidate } });
      broadcasts.push({ event: 'ice-candidate', payload: { ...base, candidate } });
      break;
    }
    case 'join':
    case 'rejoin':
      broadcasts.push({
        event: 'peer-join',
        payload: { ...base, name: message.userName },
      });
      break;
    case 'leave':
      broadcasts.push({
        event: 'peer-leave',
        payload: { ...base, intentional: message.intentionalLeave ?? true },
      });
      break;
    default:
      break;
  }

  return broadcasts;
}

export const PEER_LEAVE_GRACE_MS = 4500;
export const PEER_DISCONNECT_GRACE_MS = 8000;
export const MAX_PEER_RECONNECT_ATTEMPTS = 8;
