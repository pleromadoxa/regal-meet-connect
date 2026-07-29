import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Clock, Video, Crown, Calendar, Trash2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { useRecentMeetings, RecentMeeting } from '@/hooks/useRecentMeetings';

interface RecentMeetingsCardProps {
  onJoinMeeting: (meetingId: string, title: string, isHost: boolean) => void;
}

export const RecentMeetingsCard = ({ onJoinMeeting }: RecentMeetingsCardProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { recentMeetings, loading, addRecentMeeting, removeRecentMeeting } = useRecentMeetings();

  const handleJoinRecentMeeting = async (meeting: RecentMeeting) => {
    try {
      // Update recent meeting and join
      await addRecentMeeting(meeting.meeting_id, meeting.meeting_title || 'Recent Meeting', meeting.is_host);
      onJoinMeeting(meeting.meeting_id, meeting.meeting_title || 'Recent Meeting', meeting.is_host);
    } catch (error) {
      console.error('Error joining recent meeting:', error);
      toast({
        title: "Error",
        description: "Failed to join recent meeting",
        variant: "destructive"
      });
    }
  };

  const handleDeleteRecentMeeting = async (meeting: RecentMeeting, e: React.MouseEvent) => {
    e.stopPropagation();
    
    try {
      await removeRecentMeeting(meeting.meeting_id);
      toast({
        title: "Success",
        description: "Meeting removed from recent meetings"
      });
    } catch (error) {
      console.error('Error deleting recent meeting:', error);
      toast({
        title: "Error",
        description: "Failed to remove meeting from recent meetings",
        variant: "destructive"
      });
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 1) {
      return 'Just now';
    } else if (diffInHours < 24) {
      return `${Math.floor(diffInHours)} hour${Math.floor(diffInHours) !== 1 ? 's' : ''} ago`;
    } else if (diffInHours < 168) {
      return `${Math.floor(diffInHours / 24)} day${Math.floor(diffInHours / 24) !== 1 ? 's' : ''} ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  if (loading) {
    return (
      <Card className="h-full bg-white/5 border-white/10 backdrop-blur-lg">
        <CardHeader className="pb-3">
          <CardTitle className="text-white flex items-center space-x-2">
            <Clock className="h-5 w-5 text-blue-400" />
            <span>Recent Meetings</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="h-4 bg-white/10 rounded mb-2"></div>
                <div className="h-3 bg-white/5 rounded w-2/3"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="glass-morphism hover:glass-morphism-elevated transition-all duration-500 border-border/40 hover:border-secondary/30">
      <CardHeader className="pb-3">
        <CardTitle className="text-foreground flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Clock className="h-5 w-5 text-secondary animate-pulse" />
            <span>Recent Meetings</span>
          </div>
          <Badge variant="secondary" className="bg-gradient-secondary text-secondary-foreground shadow-glow-secondary">
            {recentMeetings.length}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {recentMeetings.length === 0 ? (
          <div className="text-center py-8">
            <Video className="h-12 w-12 text-slate-400 mx-auto mb-3" />
            <p className="text-slate-400 text-sm">No recent meetings</p>
            <p className="text-slate-500 text-xs mt-1">
              Join or create meetings to see them here
            </p>
          </div>
        ) : (
          recentMeetings.map((meeting) => (
            <div
              key={meeting.id}
              className="p-3 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition-all duration-200"
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2 mb-1">
                    <h4 className="text-white font-medium text-sm truncate">
                      {meeting.meeting_title || `Meeting ${meeting.meeting_id.slice(0, 8)}`}
                    </h4>
                    {meeting.is_host && (
                      <Crown className="h-3 w-3 text-yellow-400 flex-shrink-0" />
                    )}
                  </div>
                  <div className="flex items-center space-x-2 text-xs text-slate-400">
                    <Calendar className="h-3 w-3" />
                    <span>{formatDate(meeting.last_accessed)}</span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1 font-mono">
                    ID: {meeting.meeting_id}
                  </p>
                </div>
                <Button
                  onClick={(e) => handleDeleteRecentMeeting(meeting, e)}
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 text-slate-400 hover:text-red-400 hover:bg-red-500/10 flex-shrink-0"
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
              <Button
                onClick={() => handleJoinRecentMeeting(meeting)}
                size="sm"
                className="w-full bg-blue-600 hover:bg-blue-700 text-white text-xs"
              >
                <Video className="h-3 w-3 mr-1" />
                Join {meeting.is_host ? 'as Host' : 'Meeting'}
              </Button>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
};