import { useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CalendarIcon, Clock, Users, ExternalLink, Trash2, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { useScheduledMeetings } from '@/hooks/useScheduledMeetings';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';

export const ScheduledMeetingsList = () => {
  const { scheduledMeetings, loading, refetch, cancelScheduledMeeting } = useScheduledMeetings();
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    refetch();
  }, [refetch]);

  const handleJoinMeeting = (meetingId: string) => {
    navigate(`/meeting/${meetingId}`);
  };

  const handleCancelMeeting = async (meetingId: string, title: string) => {
    try {
      await cancelScheduledMeeting(meetingId);
      toast({
        title: 'Meeting Cancelled',
        description: `"${title}" has been cancelled successfully`
      });
    } catch (error) {
      console.error('Error cancelling meeting:', error);
      toast({
        title: 'Error',
        description: 'Failed to cancel meeting',
        variant: 'destructive'
      });
    }
  };

  const getStatusColor = (status: string, scheduledTime: string) => {
    const meetingTime = new Date(scheduledTime);
    const now = new Date();
    
    if (status === 'cancelled') return 'bg-destructive/20 text-destructive';
    if (status === 'completed') return 'bg-muted text-muted-foreground';
    if (meetingTime < now) return 'bg-yellow-500/20 text-yellow-500';
    return 'bg-primary/20 text-primary';
  };

  if (loading) {
    return (
      <Card className="glass-morphism border-border/40">
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="glass-morphism hover:glass-morphism-elevated transition-all duration-500 border-border/40 hover:border-primary/30">
      <CardHeader className="pb-3 md:pb-4">
        <CardTitle className="flex items-center text-foreground text-base md:text-lg">
          <CalendarIcon className="h-5 w-5 md:h-6 md:w-6 mr-2 text-primary animate-pulse" />
          Scheduled Meetings ({scheduledMeetings.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {scheduledMeetings.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <CalendarIcon className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p className="text-sm">No scheduled meetings yet</p>
            <p className="text-xs mt-1">Schedule your first meeting above</p>
          </div>
        ) : (
          scheduledMeetings.map((meeting) => {
            const meetingTime = new Date(meeting.scheduled_time);
            const isPast = meetingTime < new Date();
            
            return (
              <div
                key={meeting.id}
                className="p-4 rounded-lg bg-background/50 border border-border/50 hover:border-primary/50 transition-all duration-300 group"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-foreground text-sm md:text-base mb-2 truncate">
                      {meeting.title}
                    </h3>
                    
                    {meeting.description && (
                      <p className="text-xs text-muted-foreground mb-3 line-clamp-2">
                        {meeting.description}
                      </p>
                    )}
                    
                    <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <CalendarIcon className="h-3 w-3" />
                        <span>{format(meetingTime, 'MMM dd, yyyy')}</span>
                      </div>
                      
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        <span>{format(meetingTime, 'hh:mm a')}</span>
                      </div>
                      
                      <div className="flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        <span>{meeting.duration_minutes} min</span>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2 mt-3">
                      <Badge 
                        variant="secondary" 
                        className={getStatusColor(meeting.status, meeting.scheduled_time)}
                      >
                        {meeting.status}
                      </Badge>
                      
                      {meeting.is_recurring && (
                        <Badge variant="outline" className="text-xs">
                          <Clock className="h-3 w-3 mr-1" />
                          Recurring
                        </Badge>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex flex-col gap-2">
                    {meeting.status === 'scheduled' && (
                      <>
                        <Button
                          size="sm"
                          variant="default"
                          onClick={() => handleJoinMeeting(meeting.meeting_id)}
                          className="text-xs h-8"
                        >
                          <ExternalLink className="h-3 w-3 mr-1" />
                          Join
                        </Button>
                        
                        {!isPast && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleCancelMeeting(meeting.id, meeting.title)}
                            className="text-xs h-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
};
