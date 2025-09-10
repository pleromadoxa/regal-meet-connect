import React from 'react';
import { Mic, MicOff, Volume2 } from 'lucide-react';

interface AudioVisualizerProps {
  volume: number;
  isActive: boolean;
  avgVolume: number;
  hasAudio: boolean;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export const AudioVisualizer = ({
  volume,
  isActive,
  avgVolume,
  hasAudio,
  className = '',
  size = 'md'
}: AudioVisualizerProps) => {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8'
  };

  const iconSize = {
    sm: 12,
    md: 16,
    lg: 20
  };

  // Create audio bars based on volume
  const getAudioBars = () => {
    const barCount = size === 'sm' ? 3 : size === 'md' ? 4 : 5;
    const bars = [];
    
    for (let i = 0; i < barCount; i++) {
      const threshold = ((i + 1) / barCount) * 100;
      const isBarActive = hasAudio && isActive && volume > threshold;
      
      bars.push(
        <div
          key={i}
          className={`w-0.5 rounded-full transition-all duration-100 ${
            isBarActive
              ? 'bg-green-400 shadow-sm shadow-green-400/50'
              : 'bg-slate-600'
          } ${
            size === 'sm' ? 'h-2' : size === 'md' ? 'h-3' : 'h-4'
          }`}
          style={{
            height: isBarActive 
              ? `${Math.max(20, (volume / 100) * (size === 'sm' ? 12 : size === 'md' ? 16 : 20))}px`
              : undefined
          }}
        />
      );
    }
    
    return bars;
  };

  if (!hasAudio) {
    return (
      <div className={`${sizeClasses[size]} ${className} flex items-center justify-center bg-red-500/20 rounded-full border border-red-500/40`}>
        <MicOff size={iconSize[size]} className="text-red-400" />
      </div>
    );
  }

  return (
    <div className={`${className} flex items-center space-x-1`}>
      {/* Microphone icon */}
      <div className={`${sizeClasses[size]} flex items-center justify-center ${
        isActive 
          ? 'bg-green-500/20 border border-green-500/40 rounded-full' 
          : 'bg-slate-500/20 border border-slate-500/40 rounded-full'
      }`}>
        {isActive ? (
          <Mic size={iconSize[size]} className="text-green-400" />
        ) : (
          <Mic size={iconSize[size]} className="text-slate-400" />
        )}
      </div>

      {/* Audio visualizer bars */}
      <div className="flex items-end space-x-0.5 px-1">
        {getAudioBars()}
      </div>

      {/* Volume indicator for active audio */}
      {isActive && (
        <div className="text-xs text-green-400 font-mono min-w-[2rem]">
          {avgVolume}%
        </div>
      )}
    </div>
  );
};