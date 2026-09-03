import { useState, useEffect } from 'react';
import { addMonths, format } from 'date-fns';
import { CalendarPlus, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import type { CreateCalendarEventParams } from '@/hooks/useCalendarEvents';
import { useToast } from '@/hooks/use-toast';
import { RECURRENCE_OPTIONS, type RecurrencePattern } from '@/lib/calendarRecurrence';
import type { TeamCalendar } from '@/hooks/useTeamCalendars';

interface CreateEventDialogProps {
  selectedDate: Date;
  onCreate: (params: CreateCalendarEventParams) => Promise<unknown>;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  defaultStartTime?: string;
  defaultEndTime?: string;
  hideTrigger?: boolean;
  teamCalendars?: TeamCalendar[];
  defaultReminderMinutes?: number;
}

export const CreateEventDialog = ({
  selectedDate,
  onCreate,
  open: controlledOpen,
  onOpenChange,
  defaultStartTime = '09:00',
  defaultEndTime = '10:00',
  hideTrigger = false,
  teamCalendars = [],
  defaultReminderMinutes = 15,
}: CreateEventDialogProps) => {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlledOpen ?? internalOpen;
  const setOpen = onOpenChange ?? setInternalOpen;

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [startTime, setStartTime] = useState(defaultStartTime);
  const [endTime, setEndTime] = useState(defaultEndTime);
  const [color, setColor] = useState('orange');
  const [attendees, setAttendees] = useState('');
  const [location, setLocation] = useState('');
  const [isAllDay, setIsAllDay] = useState(false);
  const [recurrence, setRecurrence] = useState<'none' | RecurrencePattern>('none');
  const [teamCalendarId, setTeamCalendarId] = useState<string>('none');
  const [reminderMinutes, setReminderMinutes] = useState(String(defaultReminderMinutes));
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      setStartTime(defaultStartTime);
      setEndTime(defaultEndTime);
      setReminderMinutes(String(defaultReminderMinutes));
    }
  }, [open, defaultStartTime, defaultEndTime, defaultReminderMinutes]);

  const reset = () => {
    setTitle('');
    setDescription('');
    setStartTime(defaultStartTime);
    setEndTime(defaultEndTime);
    setColor('orange');
    setAttendees('');
    setLocation('');
    setIsAllDay(false);
    setRecurrence('none');
    setTeamCalendarId('none');
    setReminderMinutes(String(defaultReminderMinutes));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const dayCopy = new Date(selectedDate);
    const [sh, sm] = startTime.split(':').map(Number);
    const [eh, em] = endTime.split(':').map(Number);
    const eventStart = new Date(dayCopy);
    eventStart.setHours(sh, sm, 0, 0);
    const eventEnd = new Date(dayCopy);
    eventEnd.setHours(eh, em, 0, 0);

    if (!isAllDay && eventEnd <= eventStart) {
      toast({ title: 'Invalid time', description: 'End time must be after start time.', variant: 'destructive' });
      return;
    }

    const allDayStart = new Date(dayCopy);
    allDayStart.setHours(0, 0, 0, 0);
    const allDayEnd = new Date(dayCopy);
    allDayEnd.setHours(23, 59, 0, 0);

    setSaving(true);
    try {
      await onCreate({
        title: title.trim(),
        description: description.trim() || undefined,
        startTime: isAllDay ? allDayStart : eventStart,
        endTime: isAllDay ? allDayEnd : eventEnd,
        color,
        isAllDay,
        location: location.trim() || undefined,
        attendees: attendees.split(',').map((a) => a.trim()).filter(Boolean),
        recurrencePattern: recurrence === 'none' ? null : recurrence,
        recurrenceEndDate: recurrence !== 'none' ? addMonths(dayCopy, 3) : null,
        teamCalendarId: teamCalendarId === 'none' ? null : teamCalendarId,
        visibility: teamCalendarId !== 'none' ? 'team' : 'private',
        reminderMinutes: parseInt(reminderMinutes, 10),
      });
      toast({ title: 'Event created', description: `"${title.trim()}" added to your calendar.` });
      reset();
      setOpen(false);
    } catch (err) {
      console.error(err);
      toast({ title: 'Could not create event', description: 'Please try again.', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {!hideTrigger && (
        <DialogTrigger asChild>
          <Button variant="premium" size="sm" className="shadow-[0_0_20px_rgba(255,107,53,0.25)]">
            <CalendarPlus className="mr-1.5 h-4 w-4" />
            New event
          </Button>
        </DialogTrigger>
      )}
      <DialogContent className="border-white/10 bg-[#111111] text-white sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New calendar event</DialogTitle>
          <p className="text-sm text-white/45">{format(selectedDate, 'EEEE, MMMM d, yyyy')}</p>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="event-title">Title</Label>
            <Input id="event-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Team sync" className="border-white/10 bg-black/30 text-white" required />
          </div>
          <div className="flex items-center justify-between rounded-lg border border-white/10 bg-black/20 px-3 py-2">
            <Label htmlFor="all-day" className="text-sm">All day</Label>
            <Switch id="all-day" checked={isAllDay} onCheckedChange={setIsAllDay} />
          </div>
          {!isAllDay && (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="start-time">Start</Label>
                <Input id="start-time" type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} className="border-white/10 bg-black/30 text-white" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="end-time">End</Label>
                <Input id="end-time" type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} className="border-white/10 bg-black/30 text-white" />
              </div>
            </div>
          )}
          <div className="space-y-2">
            <Label>Calendar</Label>
            <Select value={color} onValueChange={setColor}>
              <SelectTrigger className="border-white/10 bg-black/30 text-white"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="orange">Work</SelectItem>
                <SelectItem value="blue">Personal</SelectItem>
                <SelectItem value="purple">Team</SelectItem>
                <SelectItem value="emerald">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Repeat</Label>
            <Select value={recurrence} onValueChange={(v) => setRecurrence(v as 'none' | RecurrencePattern)}>
              <SelectTrigger className="border-white/10 bg-black/30 text-white"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Does not repeat</SelectItem>
                {RECURRENCE_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {teamCalendars.length > 0 && (
            <div className="space-y-2">
              <Label>Team calendar</Label>
              <Select value={teamCalendarId} onValueChange={setTeamCalendarId}>
                <SelectTrigger className="border-white/10 bg-black/30 text-white"><SelectValue placeholder="Personal" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Personal only</SelectItem>
                  {teamCalendars.map((tc) => (
                    <SelectItem key={tc.id} value={tc.id}>{tc.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="space-y-2">
            <Label>Email reminder</Label>
            <Select value={reminderMinutes} onValueChange={setReminderMinutes}>
              <SelectTrigger className="border-white/10 bg-black/30 text-white"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="0">None</SelectItem>
                <SelectItem value="5">5 minutes before</SelectItem>
                <SelectItem value="15">15 minutes before</SelectItem>
                <SelectItem value="30">30 minutes before</SelectItem>
                <SelectItem value="60">1 hour before</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="attendees">Invite teammates</Label>
            <Input id="attendees" value={attendees} onChange={(e) => setAttendees(e.target.value)} placeholder="alex@company.com" className="border-white/10 bg-black/30 text-white" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="location">Location / link</Label>
            <Input id="location" value={location} onChange={(e) => setLocation(e.target.value)} className="border-white/10 bg-black/30 text-white" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} rows={2} className="border-white/10 bg-black/30 text-white" />
          </div>
          <Button type="submit" variant="premium" className="w-full" disabled={saving || !title.trim()}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Create event'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};
