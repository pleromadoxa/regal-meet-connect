import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { format } from 'date-fns';
import { Calendar, Clock, Loader2, Video } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Footer } from '@/components/Footer';
import { LandingBackground } from '@/components/landing/LandingBackground';
import { RegalAppHeader } from '@/components/layout/RegalAppHeader';
import { fetchPublicSchedulingLink, type SchedulingLink } from '@/hooks/useSchedulingLinks';
import { useToast } from '@/hooks/use-toast';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { CALENDAR_PRODUCT_NAME } from '@/constants/site';
import { findOpenSlots } from '@/lib/calendarAvailability';
import { DEFAULT_WORK_HOURS } from '@/lib/calendarAvailability';
import {
  bookSchedulingSlot,
  fetchSchedulingBusyTimes,
  fetchSchedulingWorkHours,
} from '@/lib/calendarBooking';
import type { CalendarEvent } from '@/hooks/useCalendarEvents';
import { supabase } from '@/integrations/supabase/client';

const CalendarBookPage = () => {
  const { slug } = useParams<{ slug: string }>();
  const [link, setLink] = useState<SchedulingLink | null>(null);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [selectedSlot, setSelectedSlot] = useState<{ start: Date; end: Date } | null>(null);
  const [slots, setSlots] = useState<{ start: Date; end: Date; label: string }[]>([]);
  const [booking, setBooking] = useState(false);
  const { toast } = useToast();

  useDocumentTitle(link ? `Book · ${link.title}` : CALENDAR_PRODUCT_NAME);

  useEffect(() => {
    if (!slug) return;
    fetchPublicSchedulingLink(slug).then((l) => {
      setLink(l);
      setLoading(false);
    });
  }, [slug]);

  useEffect(() => {
    if (!link || !slug) return;
    (async () => {
      try {
        const [busy, workHours] = await Promise.all([
          fetchSchedulingBusyTimes(slug),
          fetchSchedulingWorkHours(slug),
        ]);
        const events = busy.map(
          (b, i): CalendarEvent => ({
            id: `busy-${i}`,
            user_id: link.user_id,
            title: 'Busy',
            description: null,
            start_time: b.start_time,
            end_time: b.end_time,
            color: 'gray',
            is_all_day: false,
            location: null,
            attendees: [],
            created_at: b.start_time,
            updated_at: b.start_time,
          })
        );
        const open = findOpenSlots(new Date(), events, workHours ?? DEFAULT_WORK_HOURS, 12, 14);
        setSlots(
          open.map((s) => ({
            start: s.start,
            end: s.end,
            label: `${format(s.start, 'EEE MMM d')} · ${format(s.start, 'h:mm a')}`,
          }))
        );
      } catch {
        setSlots([]);
      }
    })();
  }, [link, slug]);

  const handleBook = async () => {
    if (!link || !slug || !selectedSlot || !email.trim() || !name.trim()) return;
    setBooking(true);
    try {
      await bookSchedulingSlot(slug, name, email, selectedSlot.start);

      if (link.create_meeting) {
        await supabase.functions.invoke('send-meeting-invitation', {
          body: {
            meeting: {
              title: link.title,
              scheduledTime: selectedSlot.start.toISOString(),
              duration: link.duration_minutes,
            },
            invitees: [email.trim()],
            hostEmail: null,
          },
        }).catch(() => {/* optional */});
      }

      toast({ title: 'Booked!', description: 'Your meeting has been scheduled.' });
      setSelectedSlot(null);
      setName('');
      setEmail('');
    } catch {
      toast({ title: 'Booking failed', variant: 'destructive' });
    } finally {
      setBooking(false);
    }
  };

  if (loading) {
    return (
      <div className="relative flex min-h-screen items-center justify-center bg-[#0a0a0a]">
        <LandingBackground />
        <Loader2 className="relative z-10 h-8 w-8 animate-spin text-orange-400" />
      </div>
    );
  }

  if (!link) {
    return (
      <div className="relative flex min-h-screen flex-col bg-[#0a0a0a] text-white">
        <LandingBackground />
        <RegalAppHeader activeProduct="calendar" showSettingsLink={false} />
        <div className="relative z-10 flex flex-1 flex-col items-center justify-center px-4">
          <Calendar className="mb-4 h-12 w-12 text-white/30" />
          <p className="text-white/50">This scheduling link is unavailable.</p>
        </div>
        <Footer className="relative z-10 border-white/10 bg-transparent" />
      </div>
    );
  }

  return (
    <div className="relative flex min-h-screen flex-col bg-[#0a0a0a] text-white">
      <LandingBackground />
      <RegalAppHeader
        title={CALENDAR_PRODUCT_NAME}
        activeProduct="calendar"
        showSettingsLink={false}
      />
      <div className="relative z-10 mx-auto w-full max-w-md flex-1 px-4 py-12">
        <div className="mb-8 text-center">
          <div className="mb-3 inline-flex rounded-full border border-orange-500/25 bg-orange-500/10 px-3 py-1 text-xs text-orange-300">
            Regal Calendar
          </div>
          <h1 className="text-2xl font-bold">{link.title}</h1>
          {link.description && <p className="mt-2 text-sm text-white/50">{link.description}</p>}
          <p className="mt-2 flex items-center justify-center gap-1.5 text-xs text-white/40">
            <Clock className="h-3.5 w-3.5" />
            {link.duration_minutes} minutes
            {link.create_meeting && (
              <>
                <span className="mx-1">·</span>
                <Video className="h-3.5 w-3.5" />
                Regal Meeting
              </>
            )}
          </p>
        </div>

        <div className="space-y-4 rounded-2xl border border-white/10 bg-white/[0.03] p-5">
          <div className="space-y-2">
            <Label>Pick a time</Label>
            <div className="max-h-48 space-y-1 overflow-y-auto">
              {slots.length === 0 ? (
                <p className="text-xs text-white/40">No open slots in the next two weeks.</p>
              ) : (
                slots.map((slot) => (
                  <button
                    key={slot.start.toISOString()}
                    type="button"
                    onClick={() => setSelectedSlot({ start: slot.start, end: slot.end })}
                    className={`block w-full rounded-lg border px-3 py-2 text-left text-sm transition-colors ${
                      selectedSlot?.start.getTime() === slot.start.getTime()
                        ? 'border-orange-500/50 bg-orange-500/15 text-orange-200'
                        : 'border-white/10 text-white/70 hover:bg-white/5'
                    }`}
                  >
                    {slot.label}
                  </button>
                ))
              )}
            </div>
          </div>

          {selectedSlot && (
            <>
              <div className="space-y-2">
                <Label htmlFor="book-name">Your name</Label>
                <Input id="book-name" value={name} onChange={(e) => setName(e.target.value)} className="border-white/10 bg-black/30 text-white" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="book-email">Email</Label>
                <Input id="book-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="border-white/10 bg-black/30 text-white" />
              </div>
              <Button variant="premium" className="w-full" onClick={handleBook} disabled={booking || !name.trim() || !email.trim()}>
                {booking ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Confirm booking'}
              </Button>
            </>
          )}
        </div>
      </div>
      <Footer className="relative z-10 border-white/10 bg-transparent" />
    </div>
  );
};

export default CalendarBookPage;
