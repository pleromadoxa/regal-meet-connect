import { useState } from 'react';
import { Smile } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useMeetingReactions } from '@/contexts/MeetingReactionsContext';
import type { MeetingReactionType } from '@/hooks/useMeetingReactionsChannel';
import { QUICK_REACTIONS, REACTION_EMOJI } from '@/lib/meetingReactions';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';

export const VideoReactions = () => {
  const isMobile = useIsMobile();
  const [open, setOpen] = useState(!isMobile);
  const { sendReaction } = useMeetingReactions();

  const handleReaction = (type: MeetingReactionType) => {
    void sendReaction(type);
  };

  return (
    <div className="pointer-events-auto flex flex-col items-center gap-2.5">
      <div
        className={cn(
          'flex flex-col items-center gap-2 transition-all duration-300',
          open ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-3 opacity-0'
        )}
      >
        {QUICK_REACTIONS.map((type) => (
          <button
            key={type}
            type="button"
            aria-label={`Send ${type} reaction`}
            className={cn(
              'flex h-11 w-11 items-center justify-center rounded-full text-xl',
              'border border-white/20 bg-black/45 shadow-lg backdrop-blur-xl',
              'transition hover:scale-110 hover:bg-black/60 active:scale-95'
            )}
            onClick={() => handleReaction(type)}
          >
            {REACTION_EMOJI[type]}
          </button>
        ))}
      </div>

      <Button
        type="button"
        variant="outline"
        size="icon"
        aria-label={open ? 'Hide reactions' : 'Show reactions'}
        aria-expanded={open}
        className={cn(
          'h-12 w-12 rounded-full border-white/30 bg-white text-neutral-900 shadow-xl',
          'hover:bg-white/90 hover:text-neutral-900'
        )}
        onClick={() => setOpen((v) => !v)}
      >
        <Smile className="h-5 w-5" />
      </Button>
    </div>
  );
};
