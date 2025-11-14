
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, Users, Trash2, Play, CalendarDays } from 'lucide-react';
import { format } from 'date-fns';

interface Meeting {
  id: string;
  meeting_id: string;
  title: string;
  description?: string;
  is_active: boolean;
  created_at: string;
}

interface MeetingListProps {
  meetings: Meeting[];
  onJoinAsHost: (meetingId: string, title: string) => void;
  onDeleteMeeting: (meetingId: string) => void;
  loading: boolean;
}

export const MeetingList = ({ meetings, onJoinAsHost, onDeleteMeeting, loading }: MeetingListProps) => {
  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <Card key={i} className="bg-white/10 backdrop-blur-lg border-white/20">
            <CardContent className="p-6">
              <div className="animate-pulse space-y-4">
                <div className="h-4 bg-white/20 rounded w-3/4"></div>
                <div className="h-3 bg-white/20 rounded w-1/2"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (meetings.length === 0) {
    return (
      <Card className="bg-white/10 backdrop-blur-lg border-white/20">
        <CardContent className="p-8 text-center">
          <Users className="h-12 w-12 text-white/50 mx-auto mb-4" />
          <h3 className="text-white text-lg font-semibold mb-2">No meetings yet</h3>
          <p className="text-white/70">Create your first meeting to get started</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="glass-morphism hover:glass-morphism-elevated transition-all duration-500 border-border/40 hover:border-primary/20 shadow-card hover:shadow-elevated">
      <CardHeader className="pb-3">
        <CardTitle className="text-foreground flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <CalendarDays className="h-5 w-5 text-primary animate-pulse" />
            <span>Your Meetings</span>
          </div>
          <Badge variant="secondary" className="bg-gradient-primary text-primary-foreground shadow-glow">
            {meetings.length}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {meetings.map((meeting) => (
          <Card key={meeting.id} className="glass-morphism border-border/30 hover:border-primary/30 transition-all duration-300">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <CardTitle className="text-foreground text-lg">{meeting.title}</CardTitle>
                  <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                    <div className="flex items-center space-x-1">
                      <Calendar className="h-4 w-4" />
                      <span>{format(new Date(meeting.created_at), 'MMM d, yyyy')}</span>
                    </div>
                    <Badge 
                      variant={meeting.is_active ? "default" : "secondary"}
                      className={meeting.is_active ? "bg-gradient-primary text-primary-foreground" : "bg-muted text-muted-foreground"}
                    >
                      {meeting.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Button
                    onClick={() => onJoinAsHost(meeting.meeting_id, meeting.title)}
                    size="sm"
                    className="bg-gradient-primary hover:opacity-90 text-primary-foreground shadow-glow"
                  >
                    <Play className="h-4 w-4 mr-1" />
                    Join as Host
                  </Button>
                  <Button
                    onClick={() => onDeleteMeeting(meeting.id)}
                    size="sm"
                    variant="outline"
                    className="border-destructive/40 text-destructive hover:bg-destructive/20"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-2">
                <p className="text-sm text-foreground">
                  <strong>Meeting ID:</strong> {meeting.meeting_id}
                </p>
                {meeting.description && (
                  <p className="text-sm text-muted-foreground">{meeting.description}</p>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </CardContent>
    </Card>
  );
};
