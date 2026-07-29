import { supabase } from '@/integrations/supabase/client';

export interface SfuSessionDescription {
  type: RTCSdpType;
  sdp: string;
}

export interface SfuTrackLocator {
  location: 'local' | 'remote';
  mid?: string;
  trackName: string;
  sessionId?: string;
  kind?: 'audio' | 'video';
}

export interface SfuTracksResponse {
  sessionDescription?: SfuSessionDescription;
  tracks?: Array<{ mid?: string; trackName: string; errorCode?: string }>;
  requiresImmediateRenegotiation?: boolean;
  errorCode?: string;
  errorDescription?: string;
}

type SfuAction =
  | 'status'
  | 'create-session'
  | 'tracks-new'
  | 'renegotiate'
  | 'tracks-close';

async function sfuInvoke<T>(body: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke('meeting-sfu', { body });
  if (error) throw error;
  if (data && typeof data === 'object' && 'error' in data && data.error) {
    throw new Error(String(data.error));
  }
  return data as T;
}

let sfuStatusCache: { ok: boolean; checkedAt: number } | null = null;

export async function checkSfuAvailability(): Promise<boolean> {
  const now = Date.now();
  if (sfuStatusCache && now - sfuStatusCache.checkedAt < 60_000) {
    return sfuStatusCache.ok;
  }
  try {
    const result = await sfuInvoke<{ configured: boolean }>({ action: 'status' as SfuAction });
    const ok = Boolean(result?.configured);
    sfuStatusCache = { ok, checkedAt: now };
    return ok;
  } catch {
    sfuStatusCache = { ok: false, checkedAt: now };
    return false;
  }
}

export async function createSfuSession(meetingId: string): Promise<string> {
  const result = await sfuInvoke<{ sessionId: string }>({
    action: 'create-session',
    meetingId,
  });
  return result.sessionId;
}

export async function sfuTracksNew(
  meetingId: string,
  sessionId: string,
  body: {
    sessionDescription?: SfuSessionDescription;
    tracks?: SfuTrackLocator[];
    autoDiscover?: boolean;
  }
): Promise<SfuTracksResponse> {
  return sfuInvoke<SfuTracksResponse>({
    action: 'tracks-new',
    meetingId,
    sessionId,
    ...body,
  });
}

export async function sfuRenegotiate(
  meetingId: string,
  sessionId: string,
  sessionDescription: SfuSessionDescription
): Promise<SfuTracksResponse> {
  return sfuInvoke<SfuTracksResponse>({
    action: 'renegotiate',
    meetingId,
    sessionId,
    sessionDescription,
  });
}

export async function sfuTracksClose(
  meetingId: string,
  sessionId: string,
  tracks: SfuTrackLocator[]
): Promise<void> {
  await sfuInvoke({
    action: 'tracks-close',
    meetingId,
    sessionId,
    tracks,
  });
}

export function createSfuPeerConnection(): RTCPeerConnection {
  return new RTCPeerConnection({
    iceServers: [{ urls: 'stun:stun.cloudflare.com:3478' }],
    bundlePolicy: 'max-bundle',
  });
}

export async function waitForIceConnected(pc: RTCPeerConnection, timeoutMs = 12_000): Promise<void> {
  if (pc.iceConnectionState === 'connected' || pc.iceConnectionState === 'completed') return;

  await new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('SFU ICE connection timeout')), timeoutMs);
    const handler = () => {
      if (pc.iceConnectionState === 'connected' || pc.iceConnectionState === 'completed') {
        clearTimeout(timer);
        pc.removeEventListener('iceconnectionstatechange', handler);
        resolve();
      }
      if (pc.iceConnectionState === 'failed' || pc.iceConnectionState === 'closed') {
        clearTimeout(timer);
        pc.removeEventListener('iceconnectionstatechange', handler);
        reject(new Error(`SFU ICE failed: ${pc.iceConnectionState}`));
      }
    };
    pc.addEventListener('iceconnectionstatechange', handler);
  });
}
