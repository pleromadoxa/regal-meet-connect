import { useMemo, useState } from 'react';
import { format } from 'date-fns';
import { CalendarPlus, Check, Loader2, NotebookPen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useMeetingWrap, defaultFollowUpTime } from '@/hooks/useMeetingWrap';
import { useRegalBrief } from '@/hooks/useRegalBrief';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { LandingBackground } from '@/components/landing/LandingBackground';

interface RegalWrapSheetProps {
  meetingCode: string;
  meetingTitle?: string;
  startedAt?: Date | null;
  onDone: () => void;
}

function splitAgendaLines(agenda: string): string[] {
  return agenda
    .split('\n')
    .map((l) => l.replace(/^[-*•]\s*/, '').trim())
    .filter(Boolean);
}

/**
 * Post-meeting wrap-up — notes + optional calendar follow-up.
 */
export const RegalWrapSheet = ({
  meetingCode,
  meetingTitle,
  startedAt,
  onDone,
}: RegalWrapSheetProps) => {
  const { toast } = useToast();
  const { data: brief } = useRegalBrief({ meetingCode, enabled: true });
  const { saveWrap, saving } = useMeetingWrap();

  const agendaLines = useMemo(
    () => splitAgendaLines(brief?.agenda ?? ''),
    [brief?.agenda]
  );
  const [checked, setChecked] = useState<Record<number, boolean>>({});
  const [notes, setNotes] = useState('');
  const [showFollowUp, setShowFollowUp] = useState(false);
  const [followUpLocal, setFollowUpLocal] = useState(() => {
    const d = defaultFollowUpTime();
    return format(d, "yyyy-MM-dd'T'HH:mm");
  });

  const title = meetingTitle || brief?.title || 'Regal Meeting';
  const durationLabel = startedAt
    ? `${Math.max(1, Math.round((Date.now() - startedAt.getTime()) / 60_000))} min`
    : null;

  const toggleLine = (i: number) => {
    setChecked((prev) => ({ ...prev, [i]: !prev[i] }));
  };

  const checkedLines = agendaLines.filter((_, i) => checked[i]);

  const finish = async (withFollowUp: boolean) => {
    const followUpTime = withFollowUp ? new Date(followUpLocal) : null;
    if (withFollowUp && (!followUpTime || Number.isNaN(followUpTime.getTime()))) {
      toast({ title: 'Pick a valid follow-up time', variant: 'destructive' });
      return;
    }

    const result = await saveWrap({
      meetingCode,
      notes,
      agendaCheckedLines: checkedLines,
      scheduleFollowUp:
        withFollowUp && followUpTime
          ? {
              title: `Follow-up · ${title.replace(/^Follow-up ·\s*/i, '')}`,
              scheduledTime: followUpTime,
              durationMinutes: 30,
            }
          : undefined,
    });

    if (!result.ok) {
      toast({
        title: 'Could not save wrap',
        description: result.error,
        variant: 'destructive',
      });
      return;
    }

    toast({
      title: withFollowUp ? 'Follow-up scheduled' : 'Wrap saved',
      description: withFollowUp
        ? 'It will show up on Regal Calendar.'
        : 'Notes are available in Regal Brief.',
    });
    onDone();
  };

  return (
    <div className="relative flex min-h-screen-safe flex-col overflow-hidden bg-[#0a0a0a] text-white">
      <LandingBackground />
      <div className="relative z-10 mx-auto flex w-full max-w-lg flex-1 flex-col px-4 py-8 safe-area-inset-top safe-area-inset-bottom sm:py-12">
        <div className="mb-6">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-orange-400">Regal Wrap</p>
          <h1 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">{title}</h1>
          <p className="mt-1 text-sm text-white/45">
            {meetingCode}
            {durationLabel ? ` · ${durationLabel}` : ''}
          </p>
        </div>

        <div className="min-h-0 flex-1 space-y-6 overflow-y-auto pb-4">
          {agendaLines.length > 0 && (
            <section className="space-y-2">
              <p className="text-[10px] font-bold uppercase tracking-widest text-white/35">
                Agenda check-in
              </p>
              <ul className="space-y-1.5">
                {agendaLines.map((line, i) => (
                  <li key={`${line}-${i}`}>
                    <button
                      type="button"
                      onClick={() => toggleLine(i)}
                      className={cn(
                        'flex w-full items-start gap-3 rounded-xl border px-3 py-2.5 text-left text-sm transition-colors',
                        checked[i]
                          ? 'border-emerald-500/30 bg-emerald-500/10 text-white/80'
                          : 'border-white/10 bg-white/[0.03] text-white/65 hover:bg-white/[0.06]'
                      )}
                    >
                      <span
                        className={cn(
                          'mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border',
                          checked[i]
                            ? 'border-emerald-400/50 bg-emerald-500/30 text-emerald-200'
                            : 'border-white/20'
                        )}
                      >
                        {checked[i] && <Check className="h-3 w-3" />}
                      </span>
                      <span className={cn(checked[i] && 'line-through opacity-70')}>{line}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section className="space-y-2">
            <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-white/35">
              <NotebookPen className="h-3 w-3" />
              Notes
            </p>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Decisions, owners, open questions…"
              rows={4}
              className="border-white/10 bg-black/40 text-sm text-white"
            />
          </section>

          {showFollowUp && (
            <section className="space-y-2 rounded-xl border border-orange-500/20 bg-orange-500/[0.06] p-3 animate-in fade-in duration-200">
              <Label htmlFor="follow-up-time" className="text-xs text-white/60">
                Follow-up time
              </Label>
              <Input
                id="follow-up-time"
                type="datetime-local"
                value={followUpLocal}
                onChange={(e) => setFollowUpLocal(e.target.value)}
                className="border-white/10 bg-black/40 text-white"
              />
              <p className="text-[11px] text-white/40">
                Creates a Regal Meeting on your calendar titled “Follow-up · …”
              </p>
            </section>
          )}
        </div>

        <div className="mt-auto flex flex-col gap-2 pt-4">
          {!showFollowUp ? (
            <>
              <Button
                variant="premium"
                className="w-full shadow-[0_0_20px_rgba(255,107,53,0.3)]"
                disabled={saving}
                onClick={() => setShowFollowUp(true)}
              >
                <CalendarPlus className="mr-2 h-4 w-4" />
                Schedule follow-up
              </Button>
              <Button
                variant="outline"
                className="w-full border-white/15 bg-white/5 text-white/75"
                disabled={saving}
                onClick={() => void finish(false)}
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save & go to dashboard'}
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="premium"
                className="w-full shadow-[0_0_20px_rgba(255,107,53,0.3)]"
                disabled={saving}
                onClick={() => void finish(true)}
              >
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <CalendarPlus className="mr-2 h-4 w-4" />
                    Confirm follow-up
                  </>
                )}
              </Button>
              <Button
                variant="ghost"
                className="w-full text-white/50"
                disabled={saving}
                onClick={() => void finish(false)}
              >
                Skip follow-up
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
