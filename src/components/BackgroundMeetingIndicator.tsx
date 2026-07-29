import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Lock, Wifi, WifiOff } from 'lucide-react';
import { usePageVisibility } from '@/hooks/usePageVisibility';

interface BackgroundMeetingIndicatorProps {
  isWakeLockActive?: boolean;
  connectionQuality?: 'good' | 'poor' | 'offline';
}

export const BackgroundMeetingIndicator = ({
  isWakeLockActive = false,
  connectionQuality = 'good'
}: BackgroundMeetingIndicatorProps) => {
  const { isVisible } = usePageVisibility();

  if (isVisible) return null;

  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2">
      {/* Background Status */}
      <Badge variant="secondary" className="bg-blue-600/90 text-white">
        Meeting Active in Background
      </Badge>
      
      {/* Wake Lock Status */}
      {isWakeLockActive && (
        <Badge variant="outline" className="bg-green-600/90 text-white border-green-500">
          <Lock className="w-3 h-3 mr-1" />
          Screen Lock Prevented
        </Badge>
      )}
      
      {/* Connection Quality */}
      <Badge 
        variant="outline" 
        className={`${
          connectionQuality === 'good' 
            ? 'bg-green-600/90 border-green-500' 
            : connectionQuality === 'poor'
            ? 'bg-yellow-600/90 border-yellow-500'
            : 'bg-red-600/90 border-red-500'
        } text-white`}
      >
        {connectionQuality === 'offline' ? (
          <WifiOff className="w-3 h-3 mr-1" />
        ) : (
          <Wifi className="w-3 h-3 mr-1" />
        )}
        Connection: {connectionQuality}
      </Badge>
    </div>
  );
};