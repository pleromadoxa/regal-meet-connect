import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { ExternalLink, Link2, Loader2, Pencil, Repeat, Trash2, Video } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
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
import type { CalendarEvent, UpdateCalendarEventParams } from '@/hooks/useCalendarEvents';
import { useToast } from '@/hooks/use-toast';

interface EventDetailDialogProps {
  event: CalendarEvent | null;
  onClose: () => void;
  onUpdate: (params: UpdateCalendarEventParams) => Promise<unknown>;
  onDelete: (id: string) => Promise<void>;
  onJoinMeeting?: (event: CalendarEvent) => void;
}

export const EventDetailDialog = ({
  event,
  onClose,
  onUpdate,
  onDelete,
  onJoinMeeting,
}: EventDetailDialogProps) => {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('10:00');
  const [color, setColor] = useState('orange');
  const [location, setLocation] = useState('');
  const [attendees, setAttendees] = useState('');
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (!event) {
      setEditing(false);
      return;
    }
    setTitle(event.title);
    setDescription(event.description ?? '');
    setStartTime(format(new Date(event.start_time), 'HH:mm'));
    setEndTime(format(new Date(event.end_time), 'HH:mm'));
    setColor(event.color);
    setLocation(event.location ?? '');
    setAttendees(event.attendees.join(', '));
    setEditing(false);
  }, [event]);

  if (!event) return null;

  const isMeeting = event.source === 'meeting';
  const canEdit = !isMeeting;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const day = new Date(event.start_time);
    const [sh, sm] = startTime.split(':').map(Number);
    const [eh, em] = endTime.split(':').map(Number);
    const start = new Date(day);
    start.setHours(sh, sm, 0, 0);
    const end = new Date(day);
    end.setHours(eh, em, 0, 0);

    if (end <= start) {
      toast({ title: 'Invalid time', variant: 'destructive' });
      return;
    }

    setSaving(true);
    try {
      await onUpdate({
        id: event.id,
        title: title.trim(),
        description: description.trim() || undefined,
        startTime: start,
        endTime: end,
        color,
        location: location.trim() || undefined,
        attendees: attendees.split(',').map((a) => a.trim()).filter(Boolean),
      });
      toast({ title: 'Event updated' });
      setEditing(false);
    } catch {
      toast({ title: 'Update failed', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={Boolean(event)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="border-white/10 bg-[#111111] text-white sm:max-w-md">
        {editing && canEdit ? (
          <>
            <DialogHeader>
              <DialogTitle>Edit event</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSave} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="edit-title">Title</Label>
                <Input id="edit-title" value={title} onChange={(e) => setTitle(e.target.value)} className="border-white/10 bg-black/30 text-white" required />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Start</Label>
                  <Input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} className="border-white/10 bg-black/30 text-white" />
                </div>
                <div className="space-y-2">
                  <Label>End</Label>
                  <Input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} className="border-white/10 bg-black/30 text-white" />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Color</Label>
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
                <Label>Attendees</Label>
                <Input value={attendees} onChange={(e) => setAttendees(e.target.value)} className="border-white/10 bg-black/30 text-white" />
              </div>
              <div className="space-y-2">
                <Label>Location</Label>
                <Input value={location} onChange={(e) => setLocation(e.target.value)} className="border-white/10 bg-black/30 text-white" />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} className="border-white/10 bg-black/30 text-white" />
              </div>
              <div className="flex gap-2">
                <Button type="submit" variant="premium" disabled={saving}>{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save'}</Button>
                <Button type="button" variant="ghost" onClick={() => setEditing(false)}>Cancel</Button>
              </div>
            </form>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>{event.title}</DialogTitle>
              <p className="text-sm text-white/45">
                {format(new Date(event.start_time), 'EEEE, MMM d · h:mm a')} – {format(new Date(event.end_time), 'h:mm a')}
              </p>
              {isMeeting && (
                <p className="text-xs text-orange-400/80">
                  {event.is_invited ? 'Invited · Regal Meeting' : 'Regal Meeting'}
                </p>
              )}
              {event.recurrence_pattern && (
                <p className="flex items-center gap-1 text-xs text-purple-300/80">
                  <Repeat className="h-3 w-3" />
                  Repeats {event.recurrence_pattern}
                  {event.is_recurrence_instance && ' · This occurrence'}
                </p>
              )}
            </DialogHeader>
            {event.description && <p className="text-sm text-white/60">{event.description}</p>}
            {event.location && (
              <p className="flex items-center gap-2 text-sm text-white/50">
                <Link2 className="h-4 w-4 shrink-0 text-orange-400" />
                <span className="truncate">{event.location}</span>
              </p>
            )}
            {event.attendees.length > 0 && (
              <p className="text-xs text-white/40">{event.attendees.length} invitee(s): {event.attendees.join(', ')}</p>
            )}
            <div className="flex flex-wrap gap-2 pt-2">
              {isMeeting && event.meeting_id && onJoinMeeting && (
                <Button variant="premium" size="sm" onClick={() => onJoinMeeting(event)}>
                  <Video className="mr-1.5 h-4 w-4" />
                  Join meeting
                </Button>
              )}
              {canEdit && (
                <Button variant="outline" size="sm" className="border-white/15 text-white/70" onClick={() => setEditing(true)}>
                  <Pencil className="mr-1.5 h-4 w-4" />
                  Edit
                </Button>
              )}
              {canEdit && (
                <Button
                  variant="outline"
                  size="sm"
                  className="border-red-500/30 text-red-400 hover:bg-red-500/10"
                  onClick={async () => {
                    await onDelete(event.id);
                    onClose();
                  }}
                >
                  <Trash2 className="mr-1.5 h-4 w-4" />
                  Delete
                </Button>
              )}
              {isMeeting && event.location && (
                <Button variant="outline" size="sm" className="border-white/15 text-white/70" onClick={() => window.open(event.location!, '_blank')}>
                  <ExternalLink className="mr-1.5 h-4 w-4" />
                  Open link
                </Button>
              )}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};
