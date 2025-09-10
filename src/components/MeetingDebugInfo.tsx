import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Eye, EyeOff } from 'lucide-react';

interface MeetingDebugInfoProps {
  meetingId: string;
  userName: string;
  isHost: boolean;
  currentUserId: string;
  participants: any[];
  dbParticipants: any[];
  currentMeeting: any;
  isVisible?: boolean;
  onToggle?: () => void;
}

export const MeetingDebugInfo = ({
  meetingId,
  userName,
  isHost,
  currentUserId,
  participants,
  dbParticipants,
  currentMeeting,
  isVisible = false,
  onToggle
}: MeetingDebugInfoProps) => {
  if (!isVisible) {
    return (
      <Button 
        onClick={onToggle}
        variant="ghost"
        size="sm"
        className="fixed bottom-4 left-4 z-50 bg-black/50 text-white hover:bg-black/70"
      >
        <Eye className="h-4 w-4 mr-1" />
        Debug
      </Button>
    );
  }

  return (
    <Card className="fixed bottom-4 left-4 z-50 w-80 max-h-96 overflow-y-auto bg-black/90 text-white border-white/20">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center justify-between">
          Meeting Debug Info
          <Button onClick={onToggle} variant="ghost" size="sm">
            <EyeOff className="h-4 w-4" />
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="text-xs space-y-2">
        <div>
          <strong>Meeting:</strong> {meetingId}
        </div>
        <div>
          <strong>User:</strong> {userName}
        </div>
        <div>
          <strong>User ID:</strong> {currentUserId}
        </div>
        <div>
          <strong>Is Host:</strong> 
          <Badge variant={isHost ? "default" : "secondary"} className="ml-1">
            {isHost ? "Yes" : "No"}
          </Badge>
        </div>
        
        <div className="border-t border-white/20 pt-2">
          <strong>Current Meeting Object:</strong>
          <div className="bg-black/50 p-2 rounded mt-1 text-xs">
            {currentMeeting ? (
              <div>
                <div>ID: {currentMeeting.id}</div>
                <div>Meeting ID: {currentMeeting.meeting_id}</div>
                <div>Host ID: {currentMeeting.host_id}</div>
                <div>Title: {currentMeeting.title}</div>
              </div>
            ) : (
              <div className="text-red-400">No meeting object</div>
            )}
          </div>
        </div>
        
        <div className="border-t border-white/20 pt-2">
          <strong>DB Participants ({dbParticipants.length}):</strong>
          <div className="bg-black/50 p-2 rounded mt-1 max-h-20 overflow-y-auto">
            {dbParticipants.length > 0 ? (
              dbParticipants.map((p, i) => (
                <div key={i} className="text-xs">
                  {p.user_name} ({p.is_host ? 'Host' : 'Participant'})
                </div>
              ))
            ) : (
              <div className="text-red-400">No DB participants</div>
            )}
          </div>
        </div>
        
        <div className="border-t border-white/20 pt-2">
          <strong>State Participants ({participants.length}):</strong>
          <div className="bg-black/50 p-2 rounded mt-1 max-h-20 overflow-y-auto">
            {participants.length > 0 ? (
              participants.map((p, i) => (
                <div key={i} className="text-xs">
                  {p.userName || p.user_name} ({(p.isHost || p.is_host) ? 'Host' : 'Participant'})
                </div>
              ))
            ) : (
              <div className="text-red-400">No state participants</div>
            )}
          </div>
        </div>
        
        <div className="border-t border-white/20 pt-2">
          <strong>URL Params:</strong>
          <div className="bg-black/50 p-2 rounded mt-1 text-xs">
            {window.location.search}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};