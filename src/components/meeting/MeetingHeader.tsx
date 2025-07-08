
import React from 'react';
import { Button } from '@/components/ui/button';
import { Crown, Copy, Users, LogOut, Menu, X, Settings, Maximize, Hand } from 'lucide-react';

interface MeetingHeaderProps {
  meetingId: string;
  isCurrentUserHost: boolean;
  totalParticipantCount: number;
  handNotifications: {[key: string]: boolean};
  isFullscreen: boolean;
  showParticipants: boolean;
  onCopyMeetingId: () => void;
  onToggleFullscreen: () => void;
  onToggleParticipants: () => void;
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
  onCopyMeetingId,
  onToggleFullscreen,
  onToggleParticipants,
  onNavigateToSettings,
  onSignOut
}: MeetingHeaderProps) => {
  const raisedHandsCount = Object.entries(handNotifications).filter(([_, raised]) => raised).length;

  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 sm:p-6 bg-black/20 backdrop-blur-xl border-b border-white/10">
      <div className="flex items-center space-x-3 mb-4 sm:mb-0">
        <div className="p-2 bg-gradient-to-r from-orange-400 to-orange-600 rounded-xl shadow-lg">
          <Crown className="h-6 w-6 text-white" />
        </div>
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white drop-shadow-lg">
            Regal Meetings
            {isCurrentUserHost && (
              <span className="inline-flex items-center ml-2 px-2 py-1 bg-yellow-500/20 border border-yellow-400/40 rounded-full text-yellow-300 text-xs font-medium">
                <Crown className="h-3 w-3 mr-1" />
                HOST
              </span>
            )}
          </h1>
          <p className="text-blue-200 font-medium text-sm">ID: {meetingId}</p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 sm:gap-3">
        <Button
          onClick={onCopyMeetingId}
          variant="outline"
          size="sm"
          className="bg-white/10 border-white/30 text-white hover:bg-white/20 hover:border-white/50 backdrop-blur-sm"
        >
          <Copy className="h-4 w-4 mr-2" />
          Copy ID
        </Button>
        
        <div className="flex items-center space-x-2 bg-white/10 px-3 py-2 rounded-lg backdrop-blur-sm border border-white/20">
          <Users className="h-4 w-4 text-white" />
          <span className="text-white font-medium">{totalParticipantCount}</span>
        </div>

        {raisedHandsCount > 0 && (
          <div className="flex items-center space-x-2 bg-yellow-500/20 px-3 py-2 rounded-lg backdrop-blur-sm border border-yellow-400/40">
            <Hand className="h-4 w-4 text-yellow-300 animate-bounce" />
            <span className="text-yellow-300 font-medium text-sm">
              {raisedHandsCount} hand(s) raised
            </span>
          </div>
        )}

        <Button
          onClick={onToggleFullscreen}
          variant="outline"
          size="sm"
          className="bg-white/10 border-white/30 text-white hover:bg-white/20 hover:border-white/50 backdrop-blur-sm"
        >
          <Maximize className="h-4 w-4 mr-2" />
          <span className="hidden sm:inline">Fullscreen</span>
        </Button>

        <Button
          onClick={onToggleParticipants}
          variant="outline"
          size="sm"
          className="lg:hidden bg-white/10 border-white/30 text-white hover:bg-white/20 hover:border-white/50 backdrop-blur-sm"
        >
          {showParticipants ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
        </Button>

        <Button
          onClick={onNavigateToSettings}
          variant="outline"
          size="sm"
          className="bg-white/10 border-white/30 text-white hover:bg-white/20 hover:border-white/50 backdrop-blur-sm"
        >
          <Settings className="h-4 w-4 mr-2" />
          <span className="hidden sm:inline">Settings</span>
        </Button>

        <Button
          onClick={onSignOut}
          variant="outline"
          size="sm"
          className="bg-red-500/20 border-red-400/40 text-white hover:bg-red-500/30 hover:border-red-400/60 backdrop-blur-sm"
        >
          <LogOut className="h-4 w-4 mr-2" />
          <span className="hidden sm:inline">Sign Out</span>
        </Button>
      </div>
    </div>
  );
};
