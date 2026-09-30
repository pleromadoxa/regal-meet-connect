import { format } from 'date-fns';
import { CalendarPlus, Sparkles, Video, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

export type RegalSlotAction = 'meet-now' | 'schedule-meet' | 'calendar-event';

interface RegalSlotDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  slotDate: Date;
  startTime: string;
  endTime: string;
  onAction: (action: RegalSlotAction) => void;
}

/**
 * Regal Mesh — unique cross-product slot picker.
 * Only Regal Calendar + Meeting offers instant meet, scheduled meet, or plain event from one slot.
 */
export const RegalSlotDialog = ({
  open,
  onOpenChange,
  slotDate,
  startTime,
  endTime,
  onAction,
}: RegalSlotDialogProps) => {
  const pick = (action: RegalSlotAction) => {
    onAction(action);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border-white/10 bg-[#111111] text-white sm:max-w-md">
        <DialogHeader>
          <div className="mb-1 inline-flex items-center gap-1.5 rounded-full border border-orange-500/25 bg-orange-500/10 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-widest text-orange-300">
            <Sparkles className="h-3 w-3" />
            Regal Mesh
          </div>
          <DialogTitle>What would you like to do?</DialogTitle>
          <p className="text-sm text-white/45">
            {format(slotDate, 'EEEE, MMMM d')} · {startTime} – {endTime}
          </p>
        </DialogHeader>

        <div className="space-y-2 pt-1">
          <button
            type="button"
            onClick={() => pick('meet-now')}
            className="group flex w-full items-start gap-3 rounded-xl border border-orange-500/30 bg-gradient-to-r from-orange-500/15 to-purple-500/10 p-4 text-left transition-colors hover:border-orange-500/50 hover:from-orange-500/25"
          >
            <div className="rounded-lg bg-orange-500/20 p-2 text-orange-400 group-hover:bg-orange-500/30">
              <Zap className="h-5 w-5" />
            </div>
            <div>
              <p className="font-semibold text-white">Meet now</p>
              <p className="mt-0.5 text-xs text-white/45">
                Start a Regal Meeting instantly and block this time on your calendar.
              </p>
            </div>
          </button>

          <button
            type="button"
            onClick={() => pick('schedule-meet')}
            className="group flex w-full items-start gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-4 text-left transition-colors hover:border-orange-500/30 hover:bg-orange-500/5"
          >
            <div className="rounded-lg bg-white/5 p-2 text-orange-400 group-hover:bg-orange-500/15">
              <Video className="h-5 w-5" />
            </div>
            <div>
              <p className="font-semibold text-white">Schedule Regal Meeting</p>
              <p className="mt-0.5 text-xs text-white/45">
                Send invites, get a join link, and sync to your calendar automatically.
              </p>
            </div>
          </button>

          <button
            type="button"
            onClick={() => pick('calendar-event')}
            className="group flex w-full items-start gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-4 text-left transition-colors hover:bg-white/[0.06]"
          >
            <div className="rounded-lg bg-white/5 p-2 text-white/60 group-hover:text-white/80">
              <CalendarPlus className="h-5 w-5" />
            </div>
            <div>
              <p className="font-semibold text-white">Calendar event only</p>
              <p className="mt-0.5 text-xs text-white/45">
                A standard event — reminders, team calendar, recurrence.
              </p>
            </div>
          </button>
        </div>

        <Button variant="ghost" className="w-full text-white/40" onClick={() => onOpenChange(false)}>
          Cancel
        </Button>
      </DialogContent>
    </Dialog>
  );
};
