import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Clock, Video, Crown, User, Calendar } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

interface RecentMeeting {
  id: string;
  meeting_id: string;
  meeting_title: string | null;
  joined_at: string;
  last_accessed: string;
  is_host: boolean;
}

interface RecentMeetingsCardProps {
  onJoinMeeting: (meetingId: string, title: string, isHost: boolean) => void;
}

export const RecentMeetingsCard = ({ onJoinMeeting }: RecentMeetingsCardProps) => {
  const [recentMeetings, setRecentMeetings] = useState<RecentMeeting[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (user) {
      fetchRecentMeetings();
    }
  }, [user]);

  const fetchRecentMeetings = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('user_recent_meetings')
        .select('*')
        .eq('user_id', user.id)
        .order('last_accessed', { ascending: false })
        .limit(5);

      if (error) {
        console.error('Error fetching recent meetings:', error);
        return;
      }

      setRecentMeetings(data || []);
    } catch (error) {
      console.error('Error in fetchRecentMeetings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleJoinRecentMeeting = async (meeting: RecentMeeting) => {
    try {
      // Update last accessed time
      await supabase
        .from('user_recent_meetings')
        .update({ last_accessed: new Date().toISOString() })
        .eq('id', meeting.id);

      // Join the meeting
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
    <Card className="h-full bg-white/5 border-white/10 backdrop-blur-lg">
      <CardHeader className="pb-3">
        <CardTitle className="text-white flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Clock className="h-5 w-5 text-blue-400" />
            <span>Recent Meetings</span>
          </div>
          <Badge variant="secondary" className="bg-blue-500/20 text-blue-300">
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