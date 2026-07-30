import { useState, useEffect, useRef, useCallback } from 'react';
import {
  aggregatePeerMetrics,
  qualityLevelFromMetrics,
  type InboundRtpSnapshot,
} from '@/lib/webrtcStats';

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
      bandwidth: 0,
      packetLoss: 0,
      rtt: 50,
      jitter: 0,
      qualityLevel: 'high',
    },
    recommendation: 'Connection stable',
  });

  const [isOptimizing, setIsOptimizing] = useState(false);
  const statsIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const monitoredPeersRef = useRef<Set<RTCPeerConnection>>(new Set());
  const inboundSnapshotsRef = useRef<Map<RTCPeerConnection, InboundRtpSnapshot>>(new Map());

  const applyAdaptiveBitrate = useCallback(async (
    peerConnection: RTCPeerConnection,
    qualityLevel: NetworkStats['qualityLevel']
  ) => {
    try {
      setIsOptimizing(true);

      const senders = peerConnection.getSenders();
      const videoSender = senders.find((sender) => sender.track?.kind === 'video');

      if (!videoSender?.track) {
        return;
      }

      const params = videoSender.getParameters();
      if (!params.encodings?.length) return;

      let maxBitrate: number;
      let maxFramerate: number;

      switch (qualityLevel) {
        case 'potato':
          maxBitrate = 100_000;
          maxFramerate = 10;
          videoSender.track.enabled = false;
          break;
        case 'low':
          maxBitrate = 300_000;
          maxFramerate = 15;
          videoSender.track.enabled = true;
          break;
        case 'medium':
          maxBitrate = 800_000;
          maxFramerate = 24;
          videoSender.track.enabled = true;
          break;
        case 'high':
        default:
          maxBitrate = 2_000_000;
          maxFramerate = 30;
          videoSender.track.enabled = true;
          break;
      }

      params.encodings[0].maxBitrate = maxBitrate;
      params.encodings[0].maxFramerate = maxFramerate;
      await videoSender.setParameters(params);
    } catch (error) {
      console.error('Error applying adaptive bitrate:', error);
    } finally {
      setIsOptimizing(false);
    }
  }, []);

  const refreshAggregatedStats = useCallback(async () => {
    const peers = [...monitoredPeersRef.current].filter((pc) => pc.connectionState !== 'closed');
    if (peers.length === 0) return;

    const aggregated = await aggregatePeerMetrics(peers, inboundSnapshotsRef.current);
    if (!aggregated) return;

    const qualityLevel = qualityLevelFromMetrics(aggregated.rttMs, aggregated.packetLossPct);

    let level: ConnectionQuality['level'] = 'excellent';
    let recommendation = 'Connection excellent';

    if (qualityLevel === 'potato') {
      level = 'poor';
      recommendation = 'Very poor connection — audio-only mode active';
    } else if (qualityLevel === 'low') {
      level = 'poor';
      recommendation = 'Poor connection — reducing video quality';
    } else if (qualityLevel === 'medium') {
      level = 'fair';
      recommendation = 'Fair connection — optimizing quality';
    } else if (aggregated.rttMs > 50) {
      level = 'good';
      recommendation = 'Good connection';
    }

    setConnectionQuality((prev) => {
      const next: ConnectionQuality = {
        level,
        metrics: {
          bandwidth: Math.round(aggregated.inboundKbps),
          packetLoss: Math.round(aggregated.packetLossPct * 100) / 100,
          rtt: Math.round(aggregated.rttMs),
          jitter: Math.round(aggregated.jitterMs),
          qualityLevel,
        },
        recommendation,
      };

      if (prev.metrics.qualityLevel !== qualityLevel) {
        peers.forEach((pc) => {
          void applyAdaptiveBitrate(pc, qualityLevel);
        });
      }

      return next;
    });
  }, [applyAdaptiveBitrate]);

  const startMonitoring = useCallback((peerConnection: RTCPeerConnection) => {
    monitoredPeersRef.current.add(peerConnection);

    if (statsIntervalRef.current) return;

    statsIntervalRef.current = setInterval(() => {
      void refreshAggregatedStats();
    }, 2000);
  }, [refreshAggregatedStats]);

  const stopMonitoring = useCallback(() => {
    if (statsIntervalRef.current) {
      clearInterval(statsIntervalRef.current);
      statsIntervalRef.current = null;
    }
    monitoredPeersRef.current.clear();
    inboundSnapshotsRef.current.clear();
  }, []);

  const setQualityOverride = useCallback(async (qualityLevel: NetworkStats['qualityLevel']) => {
    const peers = [...monitoredPeersRef.current];
    await Promise.all(peers.map((pc) => applyAdaptiveBitrate(pc, qualityLevel)));
    setConnectionQuality((prev) => ({
      ...prev,
      metrics: { ...prev.metrics, qualityLevel },
      recommendation: `Quality manually set to ${qualityLevel}`,
    }));
  }, [applyAdaptiveBitrate]);

  useEffect(() => () => stopMonitoring(), [stopMonitoring]);

  return {
    connectionQuality,
    isOptimizing,
    startMonitoring,
    stopMonitoring,
    setQualityOverride,
  };
};
