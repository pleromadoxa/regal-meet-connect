import { useCallback, useEffect, useState } from 'react';
import { format } from 'date-fns';
import { Copy, ExternalLink, Film, Loader2, NotebookPen, Radio, Save, Users, Video } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import type { CalendarEvent } from '@/hooks/useCalendarEvents';
import { buildMeetingLink } from '@/lib/meeting';
import { useToast } from '@/hooks/use-toast';
import { useRegalBrief } from '@/hooks/useRegalBrief';
import {
  fetchRecordingsForMeetingCode,
  formatRecordingDuration,
  getRecordingSignedUrl,
  meetingCodeFromEvent,
  type MeetingRecordingRow,
} from '@/lib/calendarRecordings';

interface RegalBriefSheetProps {
  event: CalendarEvent | null;
  isLive?: boolean;
  onClose: () => void;
  onJoin: (event: CalendarEvent) => void;
}

/**
 * Regal Brief — pre-meet intelligence drawer unique to Regal Calendar + Meeting.
 */
export const RegalBriefSheet = ({ event, isLive, onClose, onJoin }: RegalBriefSheetProps) => {
  const [recordings, setRecordings] = useState<MeetingRecordingRow[]>([]);
  const [loadingRecordings, setLoadingRecordings] = useState(false);
  const [agendaDraft, setAgendaDraft] = useState('');
  const { toast } = useToast();

  const scheduledMeetingId = event?.id.startsWith('meeting-')
    ? event.id.replace(/^meeting-/, '')
    : null;
  const meetingCode = meetingCodeFromEvent(event?.location, event?.meeting_id);

  const {
    data: brief,
    loading: loadingBrief,
    canEditAgenda,
    savingAgenda,
    saveAgenda,
  } = useRegalBrief({
    meetingCode,
    scheduledMeetingId,
    enabled: Boolean(event && event.source === 'meeting'),
  });

  useEffect(() => {
    setAgendaDraft(brief?.agenda ?? event?.brief_agenda ?? '');
  }, [brief?.agenda, event?.brief_agenda]);

  useEffect(() => {
    const code = meetingCodeFromEvent(event?.location, event?.meeting_id);
    if (!code) {
      setRecordings([]);
      return;
    }
    setLoadingRecordings(true);
    fetchRecordingsForMeetingCode(code)
      .then(setRecordings)
      .catch(() => setRecordings([]))
      .finally(() => setLoadingRecordings(false));
  }, [event?.location, event?.meeting_id]);

  const copyText = useCallback(
    async (text: string, label: string) => {
      try {
        await navigator.clipboard.writeText(text);
        toast({ title: `${label} copied` });
      } catch {
        toast({ title: 'Copy failed', variant: 'destructive' });
      }
    },
    [toast]
  );

  const handleSaveAgenda = async () => {
    const ok = await saveAgenda(agendaDraft);
    toast({
      title: ok ? 'Agenda saved' : 'Could not save agenda',
      variant: ok ? 'default' : 'destructive',
    });
  };

  const openRecording = async (filePath: string) => {
    const url = await getRecordingSignedUrl(filePath);
    if (url) window.open(url, '_blank');
    else toast({ title: 'Recording unavailable', variant: 'destructive' });
  };

  if (!event || event.source !== 'meeting') return null;

  const joinLink =
    brief?.joinLink ||
    event.location ||
    (event.meeting_id ? buildMeetingLink(event.meeting_id) : '');
  const startsIn = new Date(event.start_time).getTime() - Date.now();
  const startingSoon = startsIn > 0 && startsIn < 15 * 60_000;
  const invitees = brief?.invitees ?? [];
  const wrapNotes = brief?.wrapNotes ?? event.wrap_notes;
  const isFollowUp = Boolean(brief?.isFollowUp || event.follow_up_of_meeting_id);

  return (
    <Sheet open={Boolean(event)} onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="right" className="w-full border-white/10 bg-[#0a0a0a] text-white sm:max-w-md">
        <SheetHeader className="border-b border-white/10 pb-4">
          <div className="mb-2 inline-flex items-center gap-1.5 rounded-full border border-orange-500/25 bg-orange-500/10 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-widest text-orange-300">
            Regal Brief
          </div>
          <SheetTitle className="text-left text-lg">{event.title}</SheetTitle>
          <p className="text-left text-sm text-white/45">
            {format(new Date(event.start_time), 'EEEE, MMM d · h:mm a')} –{' '}
            {format(new Date(event.end_time), 'h:mm a')}
          </p>
          <div className="flex flex-wrap gap-2 pt-1">
            {isLive && (
              <Badge className="animate-pulse border-0 bg-red-500/20 text-red-300">
                <Radio className="mr-1 h-3 w-3" />
                Live now
              </Badge>
            )}
            {startingSoon && !isLive && (
              <Badge variant="outline" className="border-orange-500/40 text-orange-300">
                Starting soon
              </Badge>
            )}
            {isFollowUp && (
              <Badge variant="outline" className="border-sky-500/40 text-sky-300">
                Follow-up
              </Badge>
            )}
            {event.is_invited && (
              <Badge variant="outline" className="border-white/20 text-white/60">
                You&apos;re invited
              </Badge>
            )}
          </div>
        </SheetHeader>

        <div className="mt-4 max-h-[calc(100vh-8rem)] space-y-5 overflow-y-auto pb-8">
          <div className="space-y-2">
            <p className="text-xs font-bold uppercase tracking-widest text-white/35">Meeting agenda</p>
            {loadingBrief ? (
              <div className="flex justify-center py-4">
                <Loader2 className="h-5 w-5 animate-spin text-orange-400" />
              </div>
            ) : canEditAgenda ? (
              <>
                <Textarea
                  value={agendaDraft}
                  onChange={(e) => setAgendaDraft(e.target.value)}
                  placeholder="Goals, talking points, prep notes for your team…"
                  rows={4}
                  className="border-white/10 bg-black/30 text-sm text-white"
                />
                <Button
                  variant="outline"
                  size="sm"
                  className="border-white/15 text-white/70"
                  onClick={handleSaveAgenda}
                  disabled={savingAgenda}
                >
                  {savingAgenda ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <Save className="mr-1.5 h-4 w-4" />
                      Save agenda
                    </>
                  )}
                </Button>
              </>
            ) : agendaDraft ? (
              <p className="whitespace-pre-wrap rounded-lg border border-white/10 bg-white/[0.03] p-3 text-sm text-white/60">
                {agendaDraft}
              </p>
            ) : (
              <p className="text-sm text-white/35">No agenda notes yet.</p>
            )}
          </div>

          {wrapNotes && (
            <div className="space-y-2">
              <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-white/35">
                <NotebookPen className="h-3.5 w-3.5" />
                Wrap notes
              </p>
              <p className="whitespace-pre-wrap rounded-lg border border-orange-500/20 bg-orange-500/[0.06] p-3 text-sm text-white/70">
                {wrapNotes}
              </p>
            </div>
          )}

          {event.description && (
            <p className="rounded-lg border border-white/10 bg-white/[0.03] p-3 text-sm text-white/60">
              {event.description}
            </p>
          )}

          {event.meeting_id && (
            <div className="space-y-2">
              <p className="text-xs font-bold uppercase tracking-widest text-white/35">Meeting ID</p>
              <div className="flex items-center gap-2">
                <code className="flex-1 rounded-lg border border-white/10 bg-black/40 px-3 py-2 font-mono text-sm text-orange-300">
                  {event.meeting_id}
                </code>
                <Button
                  variant="outline"
                  size="icon"
                  className="shrink-0 border-white/15"
                  onClick={() => copyText(event.meeting_id!, 'Meeting ID')}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {joinLink && (
            <div className="space-y-2">
              <p className="text-xs font-bold uppercase tracking-widest text-white/35">Join link</p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 border-white/15 text-white/70"
                  onClick={() => copyText(joinLink, 'Join link')}
                >
                  <Copy className="mr-1.5 h-4 w-4" />
                  Copy link
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="border-white/15"
                  onClick={() => window.open(joinLink, '_blank')}
                >
                  <ExternalLink className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-white/35">
              <Film className="h-3.5 w-3.5" />
              Recordings
            </p>
            {loadingRecordings ? (
              <div className="flex justify-center py-3">
                <Loader2 className="h-5 w-5 animate-spin text-orange-400" />
              </div>
            ) : recordings.length === 0 ? (
              <p className="text-sm text-white/40">No completed recordings yet.</p>
            ) : (
              <ul className="space-y-1.5">
                {recordings.map((rec) => (
                  <li key={rec.id}>
                    <button
                      type="button"
                      onClick={() => openRecording(rec.file_path)}
                      className="flex w-full items-center justify-between rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-left text-sm transition-colors hover:bg-white/[0.06]"
                    >
                      <span className="text-white/75">
                        {format(new Date(rec.started_at), 'MMM d · h:mm a')}
                      </span>
                      <span className="text-xs text-white/40">
                        {formatRecordingDuration(rec.duration_seconds)}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="space-y-2">
            <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-white/35">
              <Users className="h-3.5 w-3.5" />
              Invitees
            </p>
            {loadingBrief ? (
              <div className="flex justify-center py-4">
                <Loader2 className="h-5 w-5 animate-spin text-orange-400" />
              </div>
            ) : invitees.length === 0 ? (
              <p className="text-sm text-white/40">No invitees yet.</p>
            ) : (
              <ul className="space-y-1.5">
                {invitees.map((inv) => (
                  <li
                    key={inv.invitee_email}
                    className="flex items-center justify-between rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-sm"
                  >
                    <span className="text-white/80">{inv.invitee_name || inv.invitee_email}</span>
                    <Badge
                      variant="outline"
                      className={
                        inv.status === 'accepted'
                          ? 'border-emerald-500/40 text-emerald-300'
                          : 'border-white/20 text-white/50'
                      }
                    >
                      {inv.status}
                    </Badge>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {event.meeting_id && (
            <Button variant="premium" className="w-full shadow-[0_0_20px_rgba(255,107,53,0.3)]" onClick={() => onJoin(event)}>
              <Video className="mr-2 h-4 w-4" />
              {isLive ? 'Join live meeting' : 'Join Regal Meeting'}
            </Button>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
};
