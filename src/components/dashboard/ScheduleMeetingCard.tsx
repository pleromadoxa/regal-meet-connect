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
import { CalendarIcon, Clock, Users, Repeat, Loader2, Copy, CheckCircle2 } from 'lucide-react';
import { format } from 'date-fns';
import { useScheduledMeetings } from '@/hooks/useScheduledMeetings';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

export const ScheduleMeetingCard = () => {
  const [date, setDate] = useState<Date>();
  const [time, setTime] = useState('09:00');
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [scheduledMeetingLink, setScheduledMeetingLink] = useState('');
  const [scheduledMeetingTitle, setScheduledMeetingTitle] = useState('');
  const [scheduledMeetingDate, setScheduledMeetingDate] = useState<Date | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [duration, setDuration] = useState('60');
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurrencePattern, setRecurrencePattern] = useState<'daily' | 'weekly' | 'monthly'>('weekly');
  const [invitees, setInvitees] = useState('');
  const [isScheduling, setIsScheduling] = useState(false);

  const { scheduleMeeting } = useScheduledMeetings();
  const { toast } = useToast();

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

      setScheduledMeetingTitle(title);
      setScheduledMeetingDate(scheduledTime);
      setScheduledMeetingLink(meeting.meeting_link || '');
      setShowSuccessDialog(true);

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

  const copyToClipboard = () => {
    navigator.clipboard.writeText(scheduledMeetingLink);
    toast({
      title: 'Link Copied',
      description: 'Meeting link copied to clipboard'
    });
  };

  return (
    <>
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
    </Card>

    <Dialog open={showSuccessDialog} onOpenChange={setShowSuccessDialog}>
      <DialogContent className="sm:max-w-md bg-zinc-900 border-zinc-800 text-white">
        <DialogHeader>
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-500/20 mb-4">
            <CheckCircle2 className="h-6 w-6 text-green-500" />
          </div>
          <DialogTitle className="text-center text-xl">Meeting Scheduled!</DialogTitle>
          <DialogDescription className="text-center text-zinc-400">
            "{scheduledMeetingTitle}" has been successfully scheduled for {scheduledMeetingDate && format(scheduledMeetingDate, "PPp")}.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col space-y-4 py-4">
          <div className="space-y-2">
            <Label className="text-zinc-300">Invite Link</Label>
            <div className="flex space-x-2">
              <Input
                readOnly
                value={scheduledMeetingLink}
                className="bg-zinc-800 border-zinc-700 text-white font-mono text-sm"
              />
              <Button
                variant="outline"
                size="icon"
                onClick={copyToClipboard}
                className="shrink-0 bg-zinc-800 border-zinc-700 hover:bg-zinc-700 text-white"
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <p className="text-xs text-zinc-500 text-center">
            You can share this link with participants. Invitations have also been emailed to your invitees.
          </p>
        </div>

        <DialogFooter className="sm:justify-center">
          <Button
            type="button"
            variant="default"
            onClick={() => setShowSuccessDialog(false)}
            className="w-full sm:w-auto bg-primary text-white hover:bg-primary/90"
          >
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </>
  );
};