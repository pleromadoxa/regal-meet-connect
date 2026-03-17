import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Copy, 
  Users, 
  Hand, 
  Maximize, 
  Settings, 
  LogOut,
  Video,
  Mic,
  Clock
} from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';

interface MeetingHeaderProps {
  meetingId: string;
  isCurrentUserHost: boolean;
  totalParticipantCount: number;
  handNotifications: any[];
  isFullscreen: boolean;
  showParticipants: boolean;
  isVideoMode: boolean;
  onCopyMeetingId: () => void;
  onToggleFullscreen: () => void;
  onToggleParticipants: () => void;
  onToggleVideoMode: () => void;
  onNavigateToSettings: () => void;
  onSignOut: () => void;
}

export const MeetingHeader = ({
  meetingId,
  isCurrentUserHost,
  totalParticipantCount,
  handNotifications,
  isFullscreen,
  showParticipants,
  isVideoMode,
  onCopyMeetingId,
  onToggleFullscreen,
  onToggleParticipants,
  onToggleVideoMode,
  onNavigateToSettings,
  onSignOut
}: MeetingHeaderProps) => {
  const isMobile = useIsMobile();
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setDuration(prev => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  if (isMobile) {
    return (
      <div className="bg-slate-900/95 backdrop-blur-md border-b border-slate-700/50 p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-orange-500 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-lg">R</span>
            </div>
            <div>
              <h1 className="text-white font-semibold text-lg">Regal Meetings</h1>
              <p className="text-slate-400 text-sm">ID: {meetingId}</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <Button
              onClick={onToggleVideoMode}
              size="sm"
              variant={isVideoMode ? "secondary" : "ghost"}
              className={isVideoMode ? "bg-blue-500/20 text-blue-300 border-blue-500/40" : "text-slate-300 hover:bg-slate-700/50"}
            >
              {isVideoMode ? <Video className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
            </Button>
            <Button
              onClick={onNavigateToSettings}
              size="sm"
              variant="ghost"
              className="text-white hover:bg-slate-700/50"
            >
              <Settings className="h-5 w-5" />
            </Button>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2 bg-slate-800/80 rounded-full px-3 py-1.5">
              <Clock className="h-3.5 w-3.5 text-green-400" />
              <span className="text-white text-sm font-medium">{formatDuration(duration)}</span>
            </div>
            
            <div className="flex items-center space-x-2 bg-slate-800/80 rounded-full px-3 py-1.5">
              <Users className="h-3.5 w-3.5 text-slate-300" />
              <span className="text-white text-sm font-medium">{totalParticipantCount}</span>
            </div>
          </div>

          <Button
            onClick={onCopyMeetingId}
            size="sm"
            variant="ghost"
            className="text-slate-300 hover:bg-slate-700/50 px-3 py-1.5 rounded-lg h-auto"
          >
            <Copy className="h-3.5 w-3.5 mr-2" />
            <span className="text-xs">Copy ID</span>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-900/95 backdrop-blur-md border-b border-slate-700/50 p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold">R</span>
            </div>
            <div>
              <h1 className="text-white font-semibold">Regal Meetings</h1>
              <p className="text-slate-400 text-sm">ID: {meetingId}</p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <Badge variant="secondary" className="bg-slate-800/80 text-slate-300 border-slate-600">
              <Clock className="h-3 w-3 mr-1 text-green-400" />
              {formatDuration(duration)}
            </Badge>

            <Badge variant="secondary" className="bg-slate-800/80 text-slate-300 border-slate-600">
              <Users className="h-3 w-3 mr-1" />
              {totalParticipantCount} participants
            </Badge>
            
            {handNotifications.length > 0 && (
              <Badge variant="secondary" className="bg-yellow-500/20 text-yellow-300 border-yellow-500/40 animate-pulse">
                <Hand className="h-3 w-3 mr-1" />
                {handNotifications.length} raised
              </Badge>
            )}
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <Button
            onClick={onCopyMeetingId}
            size="sm"
            variant="ghost"
            className="text-slate-300 hover:bg-slate-700/50"
          >
            <Copy className="h-4 w-4 mr-2" />
            Copy ID
          </Button>

          <Button
            onClick={onToggleVideoMode}
            size="sm"
            variant={isVideoMode ? "secondary" : "ghost"}
            className={isVideoMode ? "bg-blue-500/20 text-blue-300 border-blue-500/40" : "text-slate-300 hover:bg-slate-700/50"}
          >
            {isVideoMode ? <Video className="h-4 w-4 mr-2" /> : <Mic className="h-4 w-4 mr-2" />}
            {isVideoMode ? "Video" : "Audio"}
          </Button>

          <Button
            onClick={onToggleParticipants}
            size="sm"
            variant={showParticipants ? "secondary" : "ghost"}
            className={showParticipants ? "bg-orange-500/20 text-orange-300 border-orange-500/40" : "text-slate-300 hover:bg-slate-700/50"}
          >
            <Users className="h-4 w-4 mr-2" />
            Participants
          </Button>

          <Button
            onClick={onToggleFullscreen}
            size="sm"
            variant="ghost"
            className="text-slate-300 hover:bg-slate-700/50"
          >
            <Maximize className="h-4 w-4" />
          </Button>

          <Button
            onClick={onNavigateToSettings}
            size="sm"
            variant="ghost"
            className="text-slate-300 hover:bg-slate-700/50"
          >
            <Settings className="h-4 w-4" />
          </Button>

          <Button
            onClick={onSignOut}
            size="sm"
            variant="ghost"
            className="text-red-400 hover:bg-red-500/10"
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};
