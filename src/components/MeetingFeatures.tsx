
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Clock, Users, Wifi, WifiOff, Record, Square } from 'lucide-react';

interface MeetingFeaturesProps {
  participantCount: number;
  isHost?: boolean;
  meetingStartTime: Date;
  connectionQuality: 'good' | 'poor' | 'offline';
}

export const MeetingFeatures = ({ 
  participantCount, 
  isHost = false, 
  meetingStartTime,
  connectionQuality 
}: MeetingFeaturesProps) => {
  const [meetingDuration, setMeetingDuration] = useState('00:00');
  const [isRecording, setIsRecording] = useState(false);

  useEffect(() => {
    const updateDuration = () => {
      const now = new Date();
      const diff = now.getTime() - meetingStartTime.getTime();
      const minutes = Math.floor(diff / 60000);
      const seconds = Math.floor((diff % 60000) / 1000);
      setMeetingDuration(`${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`);
    };

    const interval = setInterval(updateDuration, 1000);
    updateDuration(); // Initial call

    return () => clearInterval(interval);
  }, [meetingStartTime]);

  const toggleRecording = () => {
    setIsRecording(!isRecording);
    // In a real implementation, this would start/stop actual recording
  };

  const getConnectionIcon = () => {
    switch (connectionQuality) {
      case 'good': return <Wifi className="h-4 w-4 text-green-400" />;
      case 'poor': return <Wifi className="h-4 w-4 text-yellow-400" />;
      case 'offline': return <WifiOff className="h-4 w-4 text-red-400" />;
    }
  };

  const getConnectionColor = () => {
    switch (connectionQuality) {
      case 'good': return 'text-green-400';
      case 'poor': return 'text-yellow-400'; 
      case 'offline': return 'text-red-400';
    }
  };

  return (
    <Card className="fixed top-4 right-4 bg-black/80 backdrop-blur-xl border-white/20 p-3 z-30">
      <div className="flex items-center space-x-4 text-sm">
        <div className="flex items-center space-x-1">
          <Clock className="h-4 w-4 text-blue-400" />
          <span className="text-white font-mono">{meetingDuration}</span>
        </div>
        
        <div className="flex items-center space-x-1">
          <Users className="h-4 w-4 text-blue-400" />
          <span className="text-white">{participantCount}</span>
        </div>
        
        <div className="flex items-center space-x-1">
          {getConnectionIcon()}
          <span className={`capitalize ${getConnectionColor()}`}>
            {connectionQuality}
          </span>
        </div>

        {isHost && (
          <Button
            onClick={toggleRecording}
            variant="outline"
            size="sm"
            className={`h-8 px-2 ${
              isRecording 
                ? 'bg-red-500/20 border-red-400 text-red-300 hover:bg-red-500/30' 
                : 'bg-white/20 border-white/30 text-white hover:bg-white/30'
            }`}
          >
            {isRecording ? (
              <>
                <Square className="h-3 w-3 mr-1" />
                Stop
              </>
            ) : (
              <>
                <Record className="h-3 w-3 mr-1" />
                Record
              </>
            )}
          </Button>
        )}
      </div>
    </Card>
  );
};
