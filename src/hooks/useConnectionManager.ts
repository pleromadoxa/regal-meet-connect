import { useCallback, useRef, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';

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
    maxReconnectAttempts = 3
  } = options;

  const heartbeatRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef<Map<string, number>>(new Map());
  const { toast } = useToast();

  // Enhanced ICE configuration with multiple fallbacks
  const getOptimizedIceServers = useCallback(() => {
    return [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
      { urls: 'stun:stun2.l.google.com:19302' },
      { urls: 'stun:stun3.l.google.com:19302' },
      { urls: 'stun:stun4.l.google.com:19302' },
      { urls: 'stun:global.stun.twilio.com:3478' },
      { urls: 'stun:stun.cloudflare.com:3478' },
      { urls: 'stun:relay.metered.ca:80' },
      { urls: 'stun:openrelay.metered.ca:80' }
    ];
  }, []);

  // Optimized RTCPeerConnection configuration
  const getOptimizedRTCConfiguration = useCallback((): RTCConfiguration => {
    return {
      iceServers: getOptimizedIceServers(),
      iceCandidatePoolSize: 15, // Increased for better connectivity
      bundlePolicy: 'max-bundle',
      rtcpMuxPolicy: 'require',
      iceTransportPolicy: 'all'
    };
  }, [getOptimizedIceServers]);

  // Proactive connection health monitoring
  const monitorConnectionHealth = useCallback((
    peerConnection: RTCPeerConnection,
    peerId: string
  ) => {
    const checkInterval = setInterval(async () => {
      try {
        const stats = await peerConnection.getStats();
        let connectionHealthy = false;
        
        stats.forEach((report) => {
          if (report.type === 'candidate-pair' && report.state === 'succeeded') {
            const rtt = report.currentRoundTripTime;
            const packetsReceived = report.packetsReceived;
            const packetsSent = report.packetsSent;
            
            // Connection is healthy if RTT < 500ms and packets are flowing
            if (rtt < 0.5 && packetsReceived > 0 && packetsSent > 0) {
              connectionHealthy = true;
            }
          }
        });

        if (!connectionHealthy && peerConnection.connectionState === 'connected') {
          console.warn(`Connection health deteriorating for peer: ${peerId}`);
          // Proactively restart ICE before failure
          if (peerConnection.connectionState === 'connected') {
            peerConnection.restartIce();
          }
        }
      } catch (error) {
        console.error('Error monitoring connection health:', error);
        clearInterval(checkInterval);
      }
    }, 10000); // Check every 10 seconds

    // Clean up interval when connection closes
    peerConnection.addEventListener('connectionstatechange', () => {
      if (['closed', 'failed', 'disconnected'].includes(peerConnection.connectionState)) {
        clearInterval(checkInterval);
      }
    });

    return () => clearInterval(checkInterval);
  }, []);

  // Enhanced connection recovery with exponential backoff
  const handleConnectionRecovery = useCallback((
    peerConnection: RTCPeerConnection,
    peerId: string,
    onReconnect?: () => void
  ) => {
    peerConnection.addEventListener('connectionstatechange', async () => {
      const state = peerConnection.connectionState;
      console.log(`Connection state changed for ${peerId}:`, state);

      if (state === 'failed' || state === 'disconnected') {
        const attempts = reconnectAttemptsRef.current.get(peerId) || 0;
        
        if (attempts < maxReconnectAttempts) {
          reconnectAttemptsRef.current.set(peerId, attempts + 1);
          const delay = Math.min(reconnectDelay * Math.pow(2, attempts), 10000); // Max 10s
          
          console.log(`Attempting reconnection ${attempts + 1}/${maxReconnectAttempts} for ${peerId} in ${delay}ms`);
          
          setTimeout(async () => {
            try {
              if (state === 'failed') {
                peerConnection.restartIce();
              }
              onReconnect?.();
            } catch (error) {
              console.error('Reconnection failed:', error);
            }
          }, delay);
        } else {
          console.error(`Max reconnection attempts reached for ${peerId}`);
          toast({
            title: "Connection Failed",
            description: "Unable to restore connection after multiple attempts.",
            variant: "destructive"
          });
        }
      } else if (state === 'connected') {
        // Reset attempts on successful connection
        const attempts = reconnectAttemptsRef.current.get(peerId) || 0;
        reconnectAttemptsRef.current.delete(peerId);
        if (attempts > 0) {
          toast({
            title: "Connection Restored",
            description: "Video connection has been successfully restored.",
          });
        }
      }
    });
  }, [maxReconnectAttempts, reconnectDelay, toast]);

  // Background heartbeat to maintain connections
  const startHeartbeat = useCallback(() => {
    if (!enableHeartbeat) return;

    if (heartbeatRef.current) {
      clearInterval(heartbeatRef.current);
    }

    heartbeatRef.current = setInterval(() => {
      // Dispatch heartbeat event for background processing
      window.dispatchEvent(new CustomEvent('meeting-heartbeat'));
    }, heartbeatInterval);
  }, [enableHeartbeat, heartbeatInterval]);

  const stopHeartbeat = useCallback(() => {
    if (heartbeatRef.current) {
      clearInterval(heartbeatRef.current);
      heartbeatRef.current = null;
    }
  }, []);

  // Bandwidth-aware media constraints
  const getAdaptiveMediaConstraints = useCallback((quality: 'high' | 'medium' | 'low' = 'high') => {
    const constraints: MediaStreamConstraints = {
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
        sampleRate: 44100,
        channelCount: 1
      },
      video: false
    };

    switch (quality) {
      case 'high':
        constraints.video = {
          width: { ideal: 1280, max: 1920 },
          height: { ideal: 720, max: 1080 },
          frameRate: { ideal: 30, max: 30 }
        };
        break;
      case 'medium':
        constraints.video = {
          width: { ideal: 854, max: 1280 },
          height: { ideal: 480, max: 720 },
          frameRate: { ideal: 24, max: 30 }
        };
        break;
      case 'low':
        constraints.video = {
          width: { ideal: 640, max: 854 },
          height: { ideal: 360, max: 480 },
          frameRate: { ideal: 15, max: 24 }
        };
        break;
    }

    return constraints;
  }, []);

  // Cleanup on unmount
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
    stopHeartbeat
  };
};