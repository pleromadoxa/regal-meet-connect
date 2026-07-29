
import React from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Clock, Users, Wifi, WifiOff, Signal, User } from 'lucide-react';
import { useMeetingRecording } from '@/hooks/useMeetingRecording';
import { ParticipationReportButton } from '@/components/ParticipationReportButton';

interface MeetingFeaturesProps {
  participantCount: number;
  isHost?: boolean;
  meetingStartTime: Date;
  connectionQuality: 'good' | 'poor' | 'offline';
  meetingId: string;
}

export const MeetingFeatures = ({ 
  participantCount, 
  isHost = false, 
  meetingStartTime,
  connectionQuality,
  meetingId
}: MeetingFeaturesProps) => {
  const [meetingDuration, setMeetingDuration] = React.useState('00:00');
  const { isRecording, startRecording, stopRecording } = useMeetingRecording(meetingId, isHost || false);

  React.useEffect(() => {
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

  const toggleRecording = async () => {
    if (isRecording) {
      await stopRecording();
    } else {
      await startRecording();
    }
  };

  return (
    <Card className="fixed top-4 left-1/2 transform -translate-x-1/2 bg-black/80 backdrop-blur-xl border-white/20 p-3 z-30 rounded-xl">
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
          {connectionQuality === 'good' && <Wifi className="h-4 w-4 text-green-400" />}
          {connectionQuality === 'poor' && <Wifi className="h-4 w-4 text-yellow-400" />}
          {connectionQuality === 'offline' && <WifiOff className="h-4 w-4 text-red-400" />}
          <Badge variant="outline" className={`text-xs ${
            connectionQuality === 'good' ? 'text-green-400 border-green-400/40' :
            connectionQuality === 'poor' ? 'text-yellow-400 border-yellow-400/40' :
            'text-red-400 border-red-400/40'
          }`}>
            <Signal className="h-3 w-3 mr-1" />
            {connectionQuality === 'good' ? 'Good' :
             connectionQuality === 'poor' ? 'Poor' : 'Offline'}
          </Badge>
        </div>

        {/* Recording indicator and Report Download */}
        <div className="flex items-center space-x-2">
          {isRecording && (
            <div className="flex items-center space-x-1">
              <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
              <span className="text-xs text-red-400 font-medium">REC</span>
            </div>
          )}
          
          {/* Only show report button if user is host */}
          {isHost && (
            <ParticipationReportButton 
              meetingId={meetingId} 
              meetingTitle={`Meeting ${meetingId}`}
              variant="ghost"
              size="sm"
            />
          )}
        </div>
      </div>
    </Card>
  );
};
