import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Clock, Video, Crown, Trash2, Users } from 'lucide-react';
import { useRecentMeetings, RecentMeeting } from '@/hooks/useRecentMeetings';
import { formatDistanceToNow } from 'date-fns';

interface RecentMeetingsCardProps {
  onJoinMeeting: (meetingId: string, isHost: boolean, title?: string) => void;
}

export const RecentMeetingsCard = ({ onJoinMeeting }: RecentMeetingsCardProps) => {
  const { recentMeetings, loading, removeRecentMeeting } = useRecentMeetings();

  const handleJoinMeeting = (meeting: RecentMeeting) => {
    onJoinMeeting(meeting.meeting_id, meeting.is_host, meeting.meeting_title || undefined);
  };

  const handleRemoveMeeting = (e: React.MouseEvent, meetingId: string) => {
    e.stopPropagation();
    removeRecentMeeting(meetingId);
  };

  if (loading) {
    return (
      <Card className="bg-white/10 backdrop-blur-xl border-white/20 text-white">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Clock className="h-5 w-5" />
            <span>Recent Meetings</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="w-6 h-6 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-white/10 backdrop-blur-xl border-white/20 text-white">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Clock className="h-5 w-5" />
          <span>Recent Meetings</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {recentMeetings.length === 0 ? (
          <div className="text-center py-8 text-white/60">
            <Users className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>No recent meetings</p>
            <p className="text-sm mt-1">Join or create a meeting to see it here</p>
          </div>
        ) : (
          <div className="space-y-3">
            {recentMeetings.map((meeting) => (
              <div
                key={meeting.id}
                className="group flex items-center justify-between p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors cursor-pointer"
                onClick={() => handleJoinMeeting(meeting)}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2 mb-1">
                    <h4 className="font-medium text-white truncate">
                      {meeting.meeting_title || `Meeting ${meeting.meeting_id}`}
                    </h4>
                    {meeting.is_host && (
                      <Badge variant="secondary" className="bg-yellow-500/20 text-yellow-300 text-xs">
                        <Crown className="h-3 w-3 mr-1" />
                        Host
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center space-x-4 text-xs text-white/60">
                    <span>ID: {meeting.meeting_id}</span>
                    <span>
                      {formatDistanceToNow(new Date(meeting.last_accessed), { addSuffix: true })}
                    </span>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleJoinMeeting(meeting);
                    }}
                    size="sm"
                    className="bg-orange-500/20 hover:bg-orange-500/30 text-orange-300 border-orange-500/40"
                  >
                    <Video className="h-3 w-3 mr-1" />
                    Join
                  </Button>
                  <Button
                    onClick={(e) => handleRemoveMeeting(e, meeting.meeting_id)}
                    size="sm"
                    variant="ghost"
                    className="opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8 p-0 hover:bg-red-500/20 text-red-400"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};