import { useState } from 'react';
import { format } from 'date-fns';
import { Loader2, Video } from 'lucide-react';
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
import { useScheduledMeetings } from '@/hooks/useScheduledMeetings';
import { useToast } from '@/hooks/use-toast';

interface QuickMeetDialogProps {
  selectedDate: Date;
  defaultTime?: string;
  onScheduled?: () => void;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  trigger?: React.ReactNode;
}

export const QuickMeetDialog = ({
  selectedDate,
  defaultTime = '09:00',
  onScheduled,
  open: controlledOpen,
  onOpenChange,
  trigger,
}: QuickMeetDialogProps) => {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlledOpen ?? internalOpen;
  const setOpen = onOpenChange ?? setInternalOpen;

  const [title, setTitle] = useState('');
  const [time, setTime] = useState(defaultTime);
  const [duration, setDuration] = useState('60');
  const [invitees, setInvitees] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);

  const { scheduleMeeting } = useScheduledMeetings();
  const { toast } = useToast();

  const reset = () => {
    setTitle('');
    setTime(defaultTime);
    setDuration('60');
    setInvitees('');
    setDescription('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const [h, m] = time.split(':').map(Number);
    const scheduledTime = new Date(selectedDate);
    scheduledTime.setHours(h, m, 0, 0);

    setSaving(true);
    try {
      await scheduleMeeting({
        title: title.trim(),
        description: description.trim() || undefined,
        scheduledTime,
        durationMinutes: parseInt(duration, 10),
        isRecurring: false,
        invitees: invitees.split(',').map((e) => e.trim()).filter(Boolean),
      });
      toast({
        title: 'Meeting scheduled',
        description: 'Added to your calendar. Invites will be sent.',
      });
      reset();
      setOpen(false);
      onScheduled?.();
    } catch (err) {
      console.error(err);
      toast({ title: 'Could not schedule', description: 'Please try again.', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent className="border-white/10 bg-[#111111] text-white sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Video className="h-5 w-5 text-orange-400" />
            Schedule Regal Meeting
          </DialogTitle>
          <p className="text-sm text-white/45">{format(selectedDate, 'EEEE, MMMM d, yyyy')}</p>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="meet-title">Meeting title</Label>
            <Input
              id="meet-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Team standup"
              className="border-white/10 bg-black/30 text-white"
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="meet-time">Time</Label>
              <Input id="meet-time" type="time" value={time} onChange={(e) => setTime(e.target.value)} className="border-white/10 bg-black/30 text-white" />
            </div>
            <div className="space-y-2">
              <Label>Duration</Label>
              <Select value={duration} onValueChange={setDuration}>
                <SelectTrigger className="border-white/10 bg-black/30 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="30">30 min</SelectItem>
                  <SelectItem value="45">45 min</SelectItem>
                  <SelectItem value="60">1 hour</SelectItem>
                  <SelectItem value="90">1.5 hours</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="meet-invitees">Invite by email</Label>
            <Input
              id="meet-invitees"
              value={invitees}
              onChange={(e) => setInvitees(e.target.value)}
              placeholder="teammate@company.com"
              className="border-white/10 bg-black/30 text-white"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="meet-desc">Notes</Label>
            <Textarea id="meet-desc" value={description} onChange={(e) => setDescription(e.target.value)} rows={2} className="border-white/10 bg-black/30 text-white" />
          </div>
          <Button type="submit" variant="premium" className="w-full" disabled={saving || !title.trim()}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Schedule & add to calendar'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};
