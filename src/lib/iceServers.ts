/** Shared ICE/TURN configuration for mesh and SFU peer connections. */
export function getRegalIceServers(): RTCIceServer[] {
  return [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun.cloudflare.com:3478' },
    { urls: 'stun:global.stun.twilio.com:3478' },
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
