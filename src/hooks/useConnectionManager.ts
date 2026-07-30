import { useCallback, useRef, useEffect } from 'react';
import { MAX_PEER_RECONNECT_ATTEMPTS } from '@/lib/webrtcSignaling';

interface ConnectionManagerOptions {
  enableHeartbeat?: boolean;
  heartbeatInterval?: number;
  reconnectDelay?: number;
  maxReconnectAttempts?: number;
}

export const useConnectionManager = (options: ConnectionManagerOptions = {}) => {
  const {
    enableHeartbeat = true,
    heartbeatInterval = 5000,
    reconnectDelay = 1000,
    maxReconnectAttempts = MAX_PEER_RECONNECT_ATTEMPTS,
  } = options;

  const heartbeatRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef<Map<string, number>>(new Map());

  const getOptimizedIceServers = useCallback(() => {
    return [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
      { urls: 'stun:stun2.l.google.com:19302' },
      { urls: 'stun:stun3.l.google.com:19302' },
      { urls: 'stun:stun4.l.google.com:19302' },
      { urls: 'stun:global.stun.twilio.com:3478' },
      { urls: 'stun:stun.cloudflare.com:3478' },
      { urls: 'turn:openrelay.metered.ca:80', username: 'openrelayproject', credential: 'openrelayproject' },
      { urls: 'turn:openrelay.metered.ca:443', username: 'openrelayproject', credential: 'openrelayproject' },
      { urls: 'turn:openrelay.metered.ca:443?transport=tcp', username: 'openrelayproject', credential: 'openrelayproject' },
    ];
  }, []);

  const getOptimizedRTCConfiguration = useCallback((): RTCConfiguration => {
    return {
      iceServers: getOptimizedIceServers(),
      iceCandidatePoolSize: 15,
      bundlePolicy: 'max-bundle',
      rtcpMuxPolicy: 'require',
      iceTransportPolicy: 'all',
    };
  }, [getOptimizedIceServers]);

  /** Passive health logging — recovery is handled in useWebRTC via restartPeerNegotiation. */
  const monitorConnectionHealth = useCallback((peerConnection: RTCPeerConnection, peerId: string) => {
    const checkInterval = setInterval(async () => {
      if (peerConnection.connectionState !== 'connected') return;
      try {
        const stats = await peerConnection.getStats();
        let healthy = false;
        stats.forEach((report) => {
          if (report.type === 'candidate-pair' && report.state === 'succeeded') {
            const rtt = report.currentRoundTripTime;
            const packetsReceived = report.packetsReceived;
            const packetsSent = report.packetsSent;
            if (typeof rtt === 'number' && rtt < 0.5 && packetsReceived > 0 && packetsSent > 0) {
              healthy = true;
            }
          }
        });
        if (!healthy) {
          console.warn(`Connection health deteriorating for peer: ${peerId}`);
        }
      } catch (error) {
        console.error('Error monitoring connection health:', error);
        clearInterval(checkInterval);
      }
    }, 15000);

    peerConnection.addEventListener('connectionstatechange', () => {
      if (['closed', 'failed', 'disconnected'].includes(peerConnection.connectionState)) {
        clearInterval(checkInterval);
      }
    });

    return () => clearInterval(checkInterval);
  }, []);

  /** Backoff reconnection — delegates ICE restart + re-offer to onReconnect callback. */
  const handleConnectionRecovery = useCallback((
    peerConnection: RTCPeerConnection,
    peerId: string,
    onReconnect?: () => void
  ) => {
    peerConnection.addEventListener('connectionstatechange', () => {
      const state = peerConnection.connectionState;

      if (state === 'failed' || state === 'disconnected') {
        const attempts = reconnectAttemptsRef.current.get(peerId) || 0;
        if (attempts < maxReconnectAttempts) {
          reconnectAttemptsRef.current.set(peerId, attempts + 1);
          const delay = Math.min(reconnectDelay * Math.pow(2, attempts), 15000);
          setTimeout(() => {
            if (peerConnection.connectionState === 'closed') return;
            onReconnect?.();
          }, delay);
        }
      } else if (state === 'connected') {
        reconnectAttemptsRef.current.delete(peerId);
      }
    });
  }, [maxReconnectAttempts, reconnectDelay]);

  const startHeartbeat = useCallback(() => {
    if (!enableHeartbeat) return;
    if (heartbeatRef.current) clearInterval(heartbeatRef.current);
    heartbeatRef.current = setInterval(() => {
      window.dispatchEvent(new CustomEvent('meeting-heartbeat'));
    }, heartbeatInterval);
  }, [enableHeartbeat, heartbeatInterval]);

  const stopHeartbeat = useCallback(() => {
    if (heartbeatRef.current) {
      clearInterval(heartbeatRef.current);
      heartbeatRef.current = null;
    }
  }, []);

  const getAdaptiveMediaConstraints = useCallback((quality: 'high' | 'medium' | 'low' = 'high') => {
    const constraints: MediaStreamConstraints = {
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
        sampleRate: 44100,
        channelCount: 1,
      },
      video: false,
    };

    switch (quality) {
      case 'high':
        constraints.video = {
          width: { ideal: 1280, max: 1920 },
          height: { ideal: 720, max: 1080 },
          frameRate: { ideal: 30, max: 30 },
        };
        break;
      case 'medium':
        constraints.video = {
          width: { ideal: 854, max: 1280 },
          height: { ideal: 480, max: 720 },
          frameRate: { ideal: 24, max: 30 },
        };
        break;
      case 'low':
        constraints.video = {
          width: { ideal: 640, max: 854 },
          height: { ideal: 360, max: 480 },
          frameRate: { ideal: 15, max: 24 },
        };
        break;
    }

    return constraints;
  }, []);

  useEffect(() => {
    startHeartbeat();
    return () => {
      stopHeartbeat();
      reconnectAttemptsRef.current.clear();
    };
  }, [startHeartbeat, stopHeartbeat]);

  return {
    getOptimizedRTCConfiguration,
    monitorConnectionHealth,
    handleConnectionRecovery,
    getAdaptiveMediaConstraints,
    startHeartbeat,
    stopHeartbeat,
  };
};
