import { useState, useEffect, useRef, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';

interface NetworkStats {
  bandwidth: number;
  packetLoss: number;
  rtt: number;
  jitter: number;
  qualityLevel: 'high' | 'medium' | 'low' | 'potato';
}

interface ConnectionQuality {
  level: 'excellent' | 'good' | 'fair' | 'poor' | 'disconnected';
  metrics: NetworkStats;
  recommendation: string;
}

export const useNetworkOptimization = () => {
  const [connectionQuality, setConnectionQuality] = useState<ConnectionQuality>({
    level: 'good',
    metrics: {
      bandwidth: 1000,
      packetLoss: 0,
      rtt: 50,
      jitter: 0,
      qualityLevel: 'high'
    },
    recommendation: 'Connection stable'
  });

  const [isOptimizing, setIsOptimizing] = useState(false);
  const statsIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const { toast } = useToast();

  // Monitor network statistics
  const monitorNetworkStats = useCallback(async (peerConnection: RTCPeerConnection) => {
    try {
      const stats = await peerConnection.getStats();
      let bandwidth = 0;
      let packetLoss = 0;
      let rtt = 0;
      let jitter = 0;

      stats.forEach((report) => {
        if (report.type === 'inbound-rtp' && report.mediaType === 'video') {
          bandwidth = report.bytesReceived || 0;
          packetLoss = report.packetsLost || 0;
          jitter = report.jitter || 0;
        }
        if (report.type === 'candidate-pair' && report.state === 'succeeded') {
          rtt = report.currentRoundTripTime ? report.currentRoundTripTime * 1000 : 0;
        }
      });

      // Calculate quality level based on metrics
      let qualityLevel: NetworkStats['qualityLevel'] = 'high';
      let level: ConnectionQuality['level'] = 'excellent';
      let recommendation = 'Connection excellent';

      if (rtt > 300 || packetLoss > 5) {
        qualityLevel = 'potato';
        level = 'poor';
        recommendation = 'Very poor connection - switching to audio only mode';
      } else if (rtt > 200 || packetLoss > 3) {
        qualityLevel = 'low';
        level = 'poor';
        recommendation = 'Poor connection - reducing video quality';
      } else if (rtt > 100 || packetLoss > 1) {
        qualityLevel = 'medium';
        level = 'fair';
        recommendation = 'Fair connection - optimizing quality';
      } else if (rtt > 50) {
        qualityLevel = 'medium';
        level = 'good';
        recommendation = 'Good connection';
      }

      const newStats: NetworkStats = {
        bandwidth: Math.round(bandwidth / 1024), // Convert to KB
        packetLoss: Math.round(packetLoss * 100) / 100,
        rtt: Math.round(rtt),
        jitter: Math.round(jitter * 1000),
        qualityLevel
      };

      setConnectionQuality({
        level,
        metrics: newStats,
        recommendation
      });

      return newStats;
    } catch (error) {
      console.error('Error monitoring network stats:', error);
      return null;
    }
  }, []);

  // Apply adaptive bitrate based on connection quality
  const applyAdaptiveBitrate = useCallback(async (
    peerConnection: RTCPeerConnection,
    qualityLevel: NetworkStats['qualityLevel']
  ) => {
    try {
      setIsOptimizing(true);
      
      const senders = peerConnection.getSenders();
      const videoSender = senders.find(sender => 
        sender.track && sender.track.kind === 'video'
      );

      if (!videoSender || !videoSender.track) {
        setIsOptimizing(false);
        return;
      }

      const params = videoSender.getParameters();
      if (!params.encodings || params.encodings.length === 0) {
        setIsOptimizing(false);
        return;
      }

      // Set bitrate based on quality level
      let maxBitrate: number;
      let maxFramerate: number;

      switch (qualityLevel) {
        case 'potato':
          maxBitrate = 100000; // 100 Kbps
          maxFramerate = 10;
          break;
        case 'low':
          maxBitrate = 300000; // 300 Kbps
          maxFramerate = 15;
          break;
        case 'medium':
          maxBitrate = 800000; // 800 Kbps
          maxFramerate = 24;
          break;
        case 'high':
        default:
          maxBitrate = 2000000; // 2 Mbps
          maxFramerate = 30;
          break;
      }

      params.encodings[0].maxBitrate = maxBitrate;
      params.encodings[0].maxFramerate = maxFramerate;

      await videoSender.setParameters(params);
      
      console.log(`Applied adaptive bitrate: ${maxBitrate / 1000} Kbps, ${maxFramerate} fps for ${qualityLevel} quality`);
      
    } catch (error) {
      console.error('Error applying adaptive bitrate:', error);
    } finally {
      setIsOptimizing(false);
    }
  }, []);

  // Enable connection recovery mechanisms
  const enableConnectionRecovery = useCallback((peerConnection: RTCPeerConnection) => {
    let reconnectAttempts = 0;
    const maxReconnectAttempts = 5;

    peerConnection.addEventListener('connectionstatechange', () => {
      const state = peerConnection.connectionState;
      console.log('Connection state changed:', state);

      if (state === 'disconnected' || state === 'failed') {
        setConnectionQuality(prev => ({
          ...prev,
          level: 'disconnected',
          recommendation: 'Connection lost - attempting to reconnect...'
        }));

        if (reconnectAttempts < maxReconnectAttempts) {
          reconnectAttempts++;
          console.log(`Attempting to reconnect (${reconnectAttempts}/${maxReconnectAttempts})`);
          
          setTimeout(() => {
            if (peerConnection.connectionState === 'failed') {
              peerConnection.restartIce();
            }
          }, 1000 * reconnectAttempts);
        } else {
          toast({
            title: "Connection Failed",
            description: "Unable to restore connection. Please refresh the page.",
            variant: "destructive"
          });
        }
      } else if (state === 'connected') {
        reconnectAttempts = 0;
        toast({
          title: "Connection Restored",
          description: "Video connection has been restored.",
          variant: "default"
        });
      }
    });
  }, [toast]);

  // Start monitoring for a peer connection
  const startMonitoring = useCallback((peerConnection: RTCPeerConnection) => {
    peerConnectionRef.current = peerConnection;
    enableConnectionRecovery(peerConnection);

    if (statsIntervalRef.current) {
      clearInterval(statsIntervalRef.current);
    }

    statsIntervalRef.current = setInterval(async () => {
      const stats = await monitorNetworkStats(peerConnection);
      if (stats && stats.qualityLevel !== connectionQuality.metrics.qualityLevel) {
        await applyAdaptiveBitrate(peerConnection, stats.qualityLevel);
      }
    }, 1000); // Check every second for faster optimization

  }, [monitorNetworkStats, applyAdaptiveBitrate, connectionQuality.metrics.qualityLevel]);

  // Stop monitoring
  const stopMonitoring = useCallback(() => {
    if (statsIntervalRef.current) {
      clearInterval(statsIntervalRef.current);
      statsIntervalRef.current = null;
    }
    peerConnectionRef.current = null;
  }, []);

  // Manual quality override
  const setQualityOverride = useCallback(async (qualityLevel: NetworkStats['qualityLevel']) => {
    if (peerConnectionRef.current) {
      await applyAdaptiveBitrate(peerConnectionRef.current, qualityLevel);
      setConnectionQuality(prev => ({
        ...prev,
        metrics: { ...prev.metrics, qualityLevel },
        recommendation: `Quality manually set to ${qualityLevel}`
      }));
    }
  }, [applyAdaptiveBitrate]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopMonitoring();
    };
  }, [stopMonitoring]);

  return {
    connectionQuality,
    isOptimizing,
    startMonitoring,
    stopMonitoring,
    setQualityOverride,
    monitorNetworkStats
  };
};