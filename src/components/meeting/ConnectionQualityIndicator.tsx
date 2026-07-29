import React, { useState, useEffect } from 'react';
import { Wifi, WifiOff, AlertTriangle, Signal } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface ConnectionStats {
  rtt: number; // Round trip time in ms
  packetLoss: number; // Percentage
  bitrate: number; // In kbps
  jitter: number; // In ms
}

interface ConnectionQualityIndicatorProps {
  peerConnections: Map<string, RTCPeerConnection>;
  className?: string;
}

export const ConnectionQualityIndicator = ({ 
  peerConnections, 
  className = "" 
}: ConnectionQualityIndicatorProps) => {
  const [connectionQuality, setConnectionQuality] = useState<'excellent' | 'good' | 'fair' | 'poor' | 'offline'>('good');
  const [stats, setStats] = useState<ConnectionStats>({
    rtt: 0,
    packetLoss: 0,
    bitrate: 0,
    jitter: 0
  });
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  // Monitor network status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Collect WebRTC stats
  useEffect(() => {
    if (!isOnline) {
      setConnectionQuality('offline');
      return;
    }

    const collectStats = async () => {
      if (peerConnections.size === 0) {
        setConnectionQuality('good');
        return;
      }

      let totalRtt = 0;
      let totalPacketLoss = 0;
      let totalBitrate = 0;
      let totalJitter = 0;
      let connectionsAnalyzed = 0;

      for (const [peerId, pc] of peerConnections) {
        try {
          const stats = await pc.getStats();
          
          stats.forEach((report) => {
            if (report.type === 'candidate-pair' && report.state === 'succeeded') {
              if (report.currentRoundTripTime !== undefined) {
                totalRtt += report.currentRoundTripTime * 1000; // Convert to ms
              }
            }
            
            if (report.type === 'inbound-rtp' && report.mediaType === 'video') {
              if (report.packetsLost !== undefined && report.packetsReceived !== undefined) {
                const packetLoss = (report.packetsLost / (report.packetsLost + report.packetsReceived)) * 100;
                totalPacketLoss += packetLoss;
              }
              
              if (report.bytesReceived !== undefined && report.timestamp) {
                // This is a simplified bitrate calculation
                totalBitrate += (report.bytesReceived * 8) / 1000; // Convert to kbps
              }
              
              if (report.jitter !== undefined) {
                totalJitter += report.jitter * 1000; // Convert to ms
              }
              
              connectionsAnalyzed++;
            }
          });
        } catch (error) {
          console.warn(`Failed to get stats for peer ${peerId}:`, error);
        }
      }

      if (connectionsAnalyzed > 0) {
        const avgStats: ConnectionStats = {
          rtt: totalRtt / connectionsAnalyzed,
          packetLoss: totalPacketLoss / connectionsAnalyzed,
          bitrate: totalBitrate / connectionsAnalyzed,
          jitter: totalJitter / connectionsAnalyzed
        };

        setStats(avgStats);

        // Determine connection quality based on stats
        let quality: 'excellent' | 'good' | 'fair' | 'poor' | 'offline' = 'excellent';

        if (avgStats.rtt > 300 || avgStats.packetLoss > 5 || avgStats.jitter > 100) {
          quality = 'poor';
        } else if (avgStats.rtt > 200 || avgStats.packetLoss > 2 || avgStats.jitter > 50) {
          quality = 'fair';
        } else if (avgStats.rtt > 100 || avgStats.packetLoss > 1 || avgStats.jitter > 30) {
          quality = 'good';
        }

        setConnectionQuality(quality);
      }
    };

    // Collect stats every 3 seconds
    const interval = setInterval(collectStats, 3000);
    collectStats(); // Run immediately

    return () => clearInterval(interval);
  }, [peerConnections, isOnline]);

  const getQualityInfo = () => {
    switch (connectionQuality) {
      case 'excellent':
        return {
          icon: Signal,
          color: 'text-green-400',
          bgColor: 'bg-green-500/20',
          borderColor: 'border-green-500/30',
          label: 'Excellent',
          description: 'Connection is excellent'
        };
      case 'good':
        return {
          icon: Wifi,
          color: 'text-blue-400',
          bgColor: 'bg-blue-500/20',
          borderColor: 'border-blue-500/30',
          label: 'Good',
          description: 'Connection is good'
        };
      case 'fair':
        return {
          icon: Wifi,
          color: 'text-yellow-400',
          bgColor: 'bg-yellow-500/20',
          borderColor: 'border-yellow-500/30',
          label: 'Fair',
          description: 'Connection quality is fair'
        };
      case 'poor':
        return {
          icon: AlertTriangle,
          color: 'text-red-400',
          bgColor: 'bg-red-500/20',
          borderColor: 'border-red-500/30',
          label: 'Poor',
          description: 'Connection quality is poor'
        };
      case 'offline':
        return {
          icon: WifiOff,
          color: 'text-gray-400',
          bgColor: 'bg-gray-500/20',
          borderColor: 'border-gray-500/30',
          label: 'Offline',
          description: 'No internet connection'
        };
    }
  };

  const qualityInfo = getQualityInfo();
  const IconComponent = qualityInfo.icon;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className={`${className}`}>
            <Badge 
              variant="outline" 
              className={`
                ${qualityInfo.bgColor} ${qualityInfo.borderColor} ${qualityInfo.color}
                hover:opacity-80 transition-opacity cursor-help
              `}
            >
              <IconComponent className="w-3 h-3 mr-1" />
              <span className="text-xs">{qualityInfo.label}</span>
            </Badge>
          </div>
        </TooltipTrigger>
        <TooltipContent side="top" className="bg-slate-800 border-slate-600">
          <div className="space-y-1">
            <p className="font-medium">{qualityInfo.description}</p>
            {connectionQuality !== 'offline' && (
              <div className="text-xs space-y-1">
                <div className="flex justify-between">
                  <span>Latency:</span>
                  <span>{stats.rtt.toFixed(0)}ms</span>
                </div>
                <div className="flex justify-between">
                  <span>Packet Loss:</span>
                  <span>{stats.packetLoss.toFixed(1)}%</span>
                </div>
                <div className="flex justify-between">
                  <span>Jitter:</span>
                  <span>{stats.jitter.toFixed(0)}ms</span>
                </div>
                {stats.bitrate > 0 && (
                  <div className="flex justify-between">
                    <span>Bitrate:</span>
                    <span>{(stats.bitrate / 1000).toFixed(1)} Mbps</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};