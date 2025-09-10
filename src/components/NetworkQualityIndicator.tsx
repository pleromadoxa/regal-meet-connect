import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { 
  Wifi, 
  WifiOff, 
  Signal, 
  SignalHigh, 
  SignalMedium, 
  SignalLow,
  Settings,
  Activity,
  Zap
} from 'lucide-react';

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

interface NetworkQualityIndicatorProps {
  connectionQuality: ConnectionQuality;
  isOptimizing: boolean;
  onQualityOverride: (quality: NetworkStats['qualityLevel']) => void;
  className?: string;
}

export const NetworkQualityIndicator = ({
  connectionQuality,
  isOptimizing,
  onQualityOverride,
  className = ''
}: NetworkQualityIndicatorProps) => {
  const getQualityIcon = () => {
    switch (connectionQuality.level) {
      case 'excellent':
        return <SignalHigh className="h-4 w-4 text-green-400" />;
      case 'good':
        return <Signal className="h-4 w-4 text-green-400" />;
      case 'fair':
        return <SignalMedium className="h-4 w-4 text-yellow-400" />;
      case 'poor':
        return <SignalLow className="h-4 w-4 text-red-400" />;
      case 'disconnected':
        return <WifiOff className="h-4 w-4 text-red-500" />;
      default:
        return <Wifi className="h-4 w-4 text-slate-400" />;
    }
  };

  const getQualityColor = () => {
    switch (connectionQuality.level) {
      case 'excellent':
      case 'good':
        return 'bg-green-500/20 border-green-500/40 text-green-400';
      case 'fair':
        return 'bg-yellow-500/20 border-yellow-500/40 text-yellow-400';
      case 'poor':
      case 'disconnected':
        return 'bg-red-500/20 border-red-500/40 text-red-400';
      default:
        return 'bg-slate-500/20 border-slate-500/40 text-slate-400';
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 KB';
    const k = 1024;
    const sizes = ['KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      {/* Optimization indicator */}
      {isOptimizing && (
        <div className="flex items-center space-x-1 px-2 py-1 bg-blue-500/20 border border-blue-500/40 rounded-full">
          <Zap className="h-3 w-3 text-blue-400 animate-pulse" />
          <span className="text-xs text-blue-400">Optimizing</span>
        </div>
      )}

      {/* Quality indicator with popover */}
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className={`h-8 px-3 ${getQualityColor()} hover:opacity-80`}
          >
            <div className="flex items-center space-x-1">
              {getQualityIcon()}
              <span className="text-xs font-medium capitalize">
                {connectionQuality.level}
              </span>
              {connectionQuality.metrics.rtt > 0 && (
                <span className="text-xs opacity-70">
                  {connectionQuality.metrics.rtt}ms
                </span>
              )}
            </div>
          </Button>
        </PopoverTrigger>
        
        <PopoverContent className="w-80 p-4 bg-slate-800/95 backdrop-blur-xl border-slate-700/60">
          <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center space-x-2">
              <Activity className="h-4 w-4 text-blue-400" />
              <h3 className="font-semibold text-white">Network Status</h3>
            </div>

            {/* Connection level */}
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-300">Connection Quality:</span>
              <Badge variant="outline" className={getQualityColor()}>
                {getQualityIcon()}
                <span className="ml-1 capitalize">{connectionQuality.level}</span>
              </Badge>
            </div>

            {/* Metrics */}
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-300">Round Trip Time:</span>
                <span className="text-white font-mono">
                  {connectionQuality.metrics.rtt}ms
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-300">Packet Loss:</span>
                <span className="text-white font-mono">
                  {connectionQuality.metrics.packetLoss.toFixed(2)}%
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-300">Bandwidth:</span>
                <span className="text-white font-mono">
                  {formatBytes(connectionQuality.metrics.bandwidth)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-300">Jitter:</span>
                <span className="text-white font-mono">
                  {connectionQuality.metrics.jitter}ms
                </span>
              </div>
            </div>

            {/* Current quality level */}
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-300">Video Quality:</span>
              <Badge variant="secondary" className="bg-blue-500/20 text-blue-400">
                {connectionQuality.metrics.qualityLevel.toUpperCase()}
              </Badge>
            </div>

            {/* Recommendation */}
            <div className="p-3 bg-slate-700/30 rounded-lg border border-slate-600/30">
              <p className="text-xs text-slate-300">
                <strong>Recommendation:</strong> {connectionQuality.recommendation}
              </p>
            </div>

            {/* Manual quality controls */}
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Settings className="h-4 w-4 text-slate-400" />
                <span className="text-sm text-slate-300">Manual Quality Override:</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  onClick={() => onQualityOverride('high')}
                  variant="outline"
                  size="sm"
                  className="text-xs bg-green-500/10 border-green-500/30 text-green-400 hover:bg-green-500/20"
                >
                  High (2Mbps)
                </Button>
                <Button
                  onClick={() => onQualityOverride('medium')}
                  variant="outline"
                  size="sm"
                  className="text-xs bg-yellow-500/10 border-yellow-500/30 text-yellow-400 hover:bg-yellow-500/20"
                >
                  Medium (800Kbps)
                </Button>
                <Button
                  onClick={() => onQualityOverride('low')}
                  variant="outline"
                  size="sm"
                  className="text-xs bg-orange-500/10 border-orange-500/30 text-orange-400 hover:bg-orange-500/20"
                >
                  Low (300Kbps)
                </Button>
                <Button
                  onClick={() => onQualityOverride('potato')}
                  variant="outline"
                  size="sm"
                  className="text-xs bg-red-500/10 border-red-500/30 text-red-400 hover:bg-red-500/20"
                >
                  Potato (100Kbps)
                </Button>
              </div>
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
};