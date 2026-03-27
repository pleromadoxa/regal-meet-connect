import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog';
import { CalendarIcon, Clock, Users, Repeat, Loader2, Copy, CheckCircle2 } from 'lucide-react';
import { format } from 'date-fns';
import { useScheduledMeetings } from '@/hooks/useScheduledMeetings';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

export const ScheduleMeetingCard = () => {
  const [date, setDate] = useState<Date>();
  const [time, setTime] = useState('09:00');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [duration, setDuration] = useState('60');
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurrencePattern, setRecurrencePattern] = useState<'daily' | 'weekly' | 'monthly'>('weekly');
  const [invitees, setInvitees] = useState('');
  const [isScheduling, setIsScheduling] = useState(false);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [scheduledMeetingInfo, setScheduledMeetingInfo] = useState<{id: string, link: string} | null>(null);

  const { scheduleMeeting } = useScheduledMeetings();
  const { toast } = useToast();

  const handleCopyLink = () => {
    if (scheduledMeetingInfo?.link) {
      navigator.clipboard.writeText(scheduledMeetingInfo.link);
      toast({
        title: "Link Copied",
        description: "Meeting link copied to clipboard"
      });
    }
  };

  const handleScheduleMeeting = async () => {
    if (!date || !title.trim()) {
      toast({
        title: 'Missing Information',
        description: 'Please provide a date and title for the meeting',
        variant: 'destructive'
      });
      return;
    }

    setIsScheduling(true);
    try {
      const [hours, minutes] = time.split(':');
      const scheduledTime = new Date(date);
      scheduledTime.setHours(parseInt(hours), parseInt(minutes));

      const inviteeList = invitees
        .split(',')
        .map(email => email.trim())
        .filter(email => email.length > 0);

      const meeting = await scheduleMeeting({
        title,
        description,
        scheduledTime,
        durationMinutes: parseInt(duration),
        isRecurring,
        recurrencePattern: isRecurring ? recurrencePattern : null,
        invitees: inviteeList
      });

      if (meeting) {
        setScheduledMeetingInfo({
          id: meeting.meeting_id,
          link: meeting.meeting_link || `${window.location.origin}/meeting/${meeting.meeting_id}`
        });
        setShowSuccessDialog(true);
      }

      toast({
        title: 'Meeting Scheduled',
        description: 'Invitations will be sent to all participants'
      });

      // Reset form
      setTitle('');
      setDescription('');
      setDate(undefined);
      setTime('09:00');
      setDuration('60');
      setIsRecurring(false);
      setInvitees('');
    } catch (error) {
      console.error('Error scheduling meeting:', error);
      toast({
        title: 'Error',
        description: 'Failed to schedule meeting',
        variant: 'destructive'
      });
    } finally {
      setIsScheduling(false);
    }
  };

  return (
    <Card className="glass-morphism hover:glass-morphism-elevated transition-all duration-500 border-border/40 hover:border-primary/30 animate-fade-in">
      <CardHeader className="pb-3 md:pb-4">
        <CardTitle className="flex items-center text-foreground text-base md:text-lg">
          <CalendarIcon className="h-5 w-5 md:h-6 md:w-6 mr-2 text-primary animate-pulse" />
          Schedule Meeting
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="title" className="text-foreground text-sm">Meeting Title *</Label>
          <Input
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Team Standup"
            className="bg-background/50 border-border/50 text-foreground h-11"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="description" className="text-foreground text-sm">Description</Label>
          <Textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Discuss project updates..."
            className="bg-background/50 border-border/50 text-foreground min-h-[80px]"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label className="text-foreground text-sm flex items-center">
              <CalendarIcon className="h-4 w-4 mr-1" />
              Date *
            </Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !date && "text-muted-foreground"
                  )}
                >
                  {date ? format(date, "PPP") : "Pick a date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0 bg-card border-border">
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={setDate}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-2">
            <Label htmlFor="time" className="text-foreground text-sm flex items-center">
              <Clock className="h-4 w-4 mr-1" />
              Time *
            </Label>
            <Input
              id="time"
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className="bg-background/50 border-border/50 text-foreground h-11"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="duration" className="text-foreground text-sm">Duration</Label>
          <Select value={duration} onValueChange={setDuration}>
            <SelectTrigger className="bg-background/50 border-border/50 text-foreground h-11">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-card border-border">
              <SelectItem value="15">15 minutes</SelectItem>
              <SelectItem value="30">30 minutes</SelectItem>
              <SelectItem value="45">45 minutes</SelectItem>
              <SelectItem value="60">1 hour</SelectItem>
              <SelectItem value="90">1.5 hours</SelectItem>
              <SelectItem value="120">2 hours</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-3 p-3 bg-card/50 rounded-lg border border-border/30">
          <div className="flex items-center justify-between">
            <Label htmlFor="recurring" className="text-foreground text-sm flex items-center">
              <Repeat className="h-4 w-4 mr-2 text-primary" />
              Recurring Meeting
            </Label>
            <Switch
              id="recurring"
              checked={isRecurring}
              onCheckedChange={setIsRecurring}
            />
          </div>

          {isRecurring && (
            <Select value={recurrencePattern} onValueChange={(val: any) => setRecurrencePattern(val)}>
              <SelectTrigger className="bg-background/50 border-border/50 text-foreground h-10">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-card border-border">
                <SelectItem value="daily">Daily</SelectItem>
                <SelectItem value="weekly">Weekly</SelectItem>
                <SelectItem value="monthly">Monthly</SelectItem>
              </SelectContent>
            </Select>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="invitees" className="text-foreground text-sm flex items-center">
            <Users className="h-4 w-4 mr-1" />
            Invitees (comma separated emails)
          </Label>
          <Textarea
            id="invitees"
            value={invitees}
            onChange={(e) => setInvitees(e.target.value)}
            placeholder="john@example.com, jane@example.com"
            className="bg-background/50 border-border/50 text-foreground min-h-[70px]"
          />
        </div>

        <Button
          onClick={handleScheduleMeeting}
          disabled={!title.trim() || !date || isScheduling}
          className="w-full h-12 bg-gradient-primary hover:opacity-90 text-primary-foreground font-semibold transition-all duration-300"
        >
          {isScheduling ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Scheduling...
            </>
          ) : (
            <>
              <CalendarIcon className="w-4 h-4 mr-2" />
              Schedule Meeting
            </>
          )}
        </Button>
      </CardContent>

      <Dialog open={showSuccessDialog} onOpenChange={setShowSuccessDialog}>
        <DialogContent className="sm:max-w-md bg-card border-border">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-primary">
              <CheckCircle2 className="h-6 w-6" />
              Meeting Scheduled Successfully
            </DialogTitle>
            <DialogDescription className="text-muted-foreground pt-2">
              Your meeting "{title}" has been scheduled.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col space-y-4 py-4">
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground uppercase tracking-wider">Meeting ID</Label>
              <div className="p-3 bg-background/50 rounded-md border border-border/50 font-mono text-center text-lg tracking-widest text-foreground">
                {scheduledMeetingInfo?.id}
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground uppercase tracking-wider">Invite Link</Label>
              <div className="flex items-center gap-2 p-3 bg-background/50 rounded-md border border-border/50">
                <p className="text-sm truncate flex-1 text-muted-foreground">
                  {scheduledMeetingInfo?.link}
                </p>
                <Button size="icon" variant="ghost" onClick={handleCopyLink} className="h-8 w-8 text-primary shrink-0">
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
          <DialogFooter className="sm:justify-start">
            <Button
              type="button"
              variant="default"
              className="w-full bg-gradient-primary hover:opacity-90"
              onClick={() => setShowSuccessDialog(false)}
            >
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
};