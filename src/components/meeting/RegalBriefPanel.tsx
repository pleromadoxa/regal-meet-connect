import { useEffect, useState } from 'react';
import { Copy, ListTodo, Loader2, Radio, Save, Users, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { useIsMobile } from '@/hooks/use-mobile';
import { useRegalBrief } from '@/hooks/useRegalBrief';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface RegalBriefPanelProps {
  meetingCode: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isLive?: boolean;
  /** Host of the live room can edit if they own the scheduled meet */
  isMeetingHost?: boolean;
}

function BriefBody({
  meetingCode,
  isLive,
}: {
  meetingCode: string;
  isLive?: boolean;
}) {
  const { toast } = useToast();
  const { data, loading, canEditAgenda, savingAgenda, saveAgenda } = useRegalBrief({
    meetingCode,
    enabled: Boolean(meetingCode),
  });
  const [agendaDraft, setAgendaDraft] = useState('');

  useEffect(() => {
    setAgendaDraft(data?.agenda ?? '');
  }, [data?.agenda]);

  const handleSave = async () => {
    const ok = await saveAgenda(agendaDraft);
    toast({
      title: ok ? 'Agenda saved' : 'Could not save agenda',
      variant: ok ? 'default' : 'destructive',
    });
  };

  const copyLink = async () => {
    if (!data?.joinLink) return;
    try {
      await navigator.clipboard.writeText(data.joinLink);
      toast({ title: 'Join link copied' });
    } catch {
      toast({ title: 'Copy failed', variant: 'destructive' });
    }
  };

  if (loading && !data) {
    return (
      <div className="flex justify-center py-10">
        <Loader2 className="h-6 w-6 animate-spin text-orange-400" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2">
        {isLive && (
          <Badge className="animate-pulse border-0 bg-red-500/20 text-red-300">
            <Radio className="mr-1 h-3 w-3" />
            Live
          </Badge>
        )}
        {data?.isFollowUp && (
          <Badge variant="outline" className="border-sky-500/40 text-sky-300">
            Follow-up
          </Badge>
        )}
        <span className="font-mono text-xs text-orange-300/80">{meetingCode}</span>
      </div>

      <div className="space-y-2">
        <p className="text-[10px] font-bold uppercase tracking-widest text-white/35">Agenda</p>
        {canEditAgenda ? (
          <>
            <Textarea
              value={agendaDraft}
              onChange={(e) => setAgendaDraft(e.target.value)}
              placeholder="Talking points for this call…"
              rows={5}
              className="border-white/10 bg-black/40 text-sm text-white"
            />
            <Button
              variant="outline"
              size="sm"
              className="border-white/15 text-white/70"
              onClick={handleSave}
              disabled={savingAgenda}
            >
              {savingAgenda ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <Save className="mr-1.5 h-4 w-4" />
                  Save
                </>
              )}
            </Button>
          </>
        ) : agendaDraft ? (
          <p className="whitespace-pre-wrap rounded-xl border border-white/10 bg-white/[0.03] p-3 text-sm text-white/65">
            {agendaDraft}
          </p>
        ) : (
          <p className="text-sm text-white/40">
            No calendar agenda yet. Hosts can add notes from Regal Calendar Brief.
          </p>
        )}
      </div>

      {data?.invitees && data.invitees.length > 0 && (
        <div className="space-y-2">
          <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-white/35">
            <Users className="h-3 w-3" />
            Invitees
          </p>
          <ul className="space-y-1">
            {data.invitees.slice(0, 8).map((inv) => (
              <li
                key={inv.invitee_email}
                className="flex items-center justify-between rounded-lg border border-white/10 bg-white/[0.03] px-2.5 py-1.5 text-xs"
              >
                <span className="truncate text-white/75">{inv.invitee_name || inv.invitee_email}</span>
                <span className="shrink-0 text-white/40">{inv.status}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {data?.joinLink && (
        <Button variant="outline" size="sm" className="w-full border-white/15 text-white/70" onClick={copyLink}>
          <Copy className="mr-1.5 h-4 w-4" />
          Copy join link
        </Button>
      )}
    </div>
  );
}

/**
 * In-meeting Regal Brief — bottom sheet on mobile, glass side panel on desktop.
 */
export const RegalBriefPanel = ({
  meetingCode,
  open,
  onOpenChange,
  isLive = true,
}: RegalBriefPanelProps) => {
  const isMobile = useIsMobile();

  if (!open) return null;

  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent
          side="bottom"
          className="flex h-[min(88dvh,36rem)] max-h-[88dvh] flex-col gap-0 overflow-hidden rounded-t-2xl border-white/10 bg-[#0c0c10] p-0 text-white"
        >
          <SheetHeader className="shrink-0 border-b border-white/10 px-4 py-3 pr-12 text-left">
            <div className="mb-1 inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-orange-300">
              <ListTodo className="h-3 w-3" />
              Regal Brief
            </div>
            <SheetTitle className="text-white">Meeting agenda</SheetTitle>
          </SheetHeader>
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
            <BriefBody meetingCode={meetingCode} isLive={isLive} />
          </div>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <aside
      className={cn(
        'pointer-events-auto absolute bottom-24 right-4 top-16 z-40 flex w-[min(22rem,calc(100vw-2rem))] flex-col overflow-hidden',
        'rounded-2xl border border-white/10 bg-[#0c0c10]/92 shadow-2xl backdrop-blur-xl',
        'animate-in fade-in slide-in-from-right-4 duration-300'
      )}
    >
      <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-orange-300">Regal Brief</p>
          <p className="text-sm font-semibold text-white">Meeting agenda</p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-white/50 hover:text-white"
          onClick={() => onOpenChange(false)}
          aria-label="Close Brief"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        <BriefBody meetingCode={meetingCode} isLive={isLive} />
      </div>
    </aside>
  );
};

/** Compact lobby strip when a scheduled agenda exists for this room. */
export const RegalBriefLobbyStrip = ({ meetingCode }: { meetingCode: string }) => {
  const { data, loading } = useRegalBrief({ meetingCode, enabled: Boolean(meetingCode) });

  if (loading || !data?.agenda) return null;

  const preview = data.agenda.split('\n').filter(Boolean).slice(0, 2).join(' · ');

  return (
    <div className="mx-auto w-full max-w-md rounded-xl border border-orange-500/20 bg-orange-500/[0.07] px-4 py-3 text-left animate-in fade-in duration-500">
      <p className="text-[10px] font-bold uppercase tracking-widest text-orange-300">Regal Brief</p>
      <p className="mt-1 line-clamp-2 text-sm text-white/70">{preview}</p>
      <p className="mt-1 text-[11px] text-white/40">
        {data.invitees.length > 0
          ? `${data.invitees.length} invitee${data.invitees.length === 1 ? '' : 's'} · calendar notes ready`
          : 'Your calendar notes will follow you into the call'}
      </p>
    </div>
  );
};
