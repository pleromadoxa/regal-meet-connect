/** Shared ICE/TURN configuration for mesh and SFU peer connections. */

function envTurnServers(): RTCIceServer[] {
  const urlsRaw =
    (import.meta.env.VITE_TURN_URLS as string | undefined)?.trim() ||
    (import.meta.env.VITE_TURN_URL as string | undefined)?.trim();
  const username = (import.meta.env.VITE_TURN_USERNAME as string | undefined)?.trim();
  const credential = (import.meta.env.VITE_TURN_CREDENTIAL as string | undefined)?.trim();

  if (!urlsRaw || !username || !credential) return [];

  return urlsRaw.split(',').map((url) => ({
    urls: url.trim(),
    username,
    credential,
  })).filter((s) => Boolean(s.urls));
}

export function getRegalIceServers(): RTCIceServer[] {
  const configuredTurn = envTurnServers();

  return [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun.cloudflare.com:3478' },
    { urls: 'stun:global.stun.twilio.com:3478' },
    // Prefer project-configured TURN for reliable NAT traversal under bad networks
    ...configuredTurn,
    // Public fallback TURN (best-effort — override with VITE_TURN_* in production)
    ...(configuredTurn.length > 0
      ? []
      : [
          {
            urls: 'turn:openrelay.metered.ca:80',
            username: 'openrelayproject',
            credential: 'openrelayproject',
          },
          {
            urls: 'turn:openrelay.metered.ca:443',
            username: 'openrelayproject',
            credential: 'openrelayproject',
          },
          {
            urls: 'turn:openrelay.metered.ca:443?transport=tcp',
            username: 'openrelayproject',
            credential: 'openrelayproject',
          },
        ]),
  ];
}

export function getRegalRtcConfiguration(): RTCConfiguration {
  return {
    iceServers: getRegalIceServers(),
    iceCandidatePoolSize: 15,
    bundlePolicy: 'max-bundle',
    rtcpMuxPolicy: 'require',
    iceTransportPolicy: 'all',
  };
}

export function getSfuRtcConfiguration(): RTCConfiguration {
  return {
    iceServers: getRegalIceServers(),
    bundlePolicy: 'max-bundle',
    rtcpMuxPolicy: 'require',
  };
}
