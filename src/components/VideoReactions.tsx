import { useCallback, useEffect, useRef, useState } from 'react';
import { Smile } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  useMeetingReactionsChannel,
  type MeetingReactionType,
} from '@/hooks/useMeetingReactionsChannel';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';

interface FloatingReaction {
  id: string;
  type: MeetingReactionType;
  x: number;
  y: number;
  timestamp: number;
}

interface VideoReactionsProps {
  meetingId?: string;
  userId?: string;
  userName?: string;
}

const REACTION_EMOJI: Record<MeetingReactionType, string> = {
  heart: '❤️',
  like: '😊',
  celebration: '👏',
  party: '😂',
  energy: '😁',
  coffee: '☕',
  slow: '🐌',
};

/** Mock order: clap, smile, laugh, grin */
const QUICK_REACTIONS: MeetingReactionType[] = ['celebration', 'like', 'party', 'energy'];

export const VideoReactions = ({ meetingId, userId = '', userName = '' }: VideoReactionsProps) => {
  const isMobile = useIsMobile();
  const [open, setOpen] = useState(!isMobile);
  const [localReactions, setLocalReactions] = useState<FloatingReaction[]>([]);
  const { reactions: remoteReactions, sendReaction } = useMeetingReactionsChannel(
    meetingId,
    userId,
    userName
  );

  const spawnFloating = useCallback((type: MeetingReactionType) => {
    const floating: FloatingReaction = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      type,
      x: Math.random() * 70 + 15,
      y: Math.random() * 60 + 20,
      timestamp: Date.now(),
    };

    setLocalReactions((prev) => [...prev, floating]);
    window.setTimeout(() => {
      setLocalReactions((prev) => prev.filter((r) => r.id !== floating.id));
    }, 3000);
  }, []);

  const seenTimestampsRef = useRef<Set<number>>(new Set());

  useEffect(() => {
    remoteReactions.forEach((reaction) => {
      if (seenTimestampsRef.current.has(reaction.timestamp)) return;
      seenTimestampsRef.current.add(reaction.timestamp);
      spawnFloating(reaction.type);
    });
  }, [remoteReactions, spawnFloating]);

  const handleReaction = async (type: MeetingReactionType) => {
    if (meetingId && userId) {
      const sent = await sendReaction(type);
      if (!sent) spawnFloating(type);
      return;
    }
    spawnFloating(type);
  };

  return (
    <>
      <div className="flex flex-col items-center gap-2.5 pointer-events-auto">
        <div
          className={cn(
            'flex flex-col items-center gap-2 transition-all duration-300',
            open ? 'opacity-100 translate-y-0' : 'pointer-events-none opacity-0 translate-y-3'
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
              onClick={() => void handleReaction(type)}
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

      <div className="pointer-events-none fixed inset-0 z-50">
        {localReactions.map((reaction) => (
          <div
            key={reaction.id}
            className="absolute text-2xl"
            style={{
              left: `${reaction.x}%`,
              top: `${reaction.y}%`,
              animation: 'reaction-float 3s ease-out forwards',
            }}
          >
            {REACTION_EMOJI[reaction.type]}
          </div>
        ))}
      </div>

      <style>{`
        @keyframes reaction-float {
          0% {
            transform: translateY(0) scale(1);
            opacity: 1;
          }
          50% {
            transform: translateY(-50px) scale(1.2);
            opacity: 0.8;
          }
          100% {
            transform: translateY(-100px) scale(0.8);
            opacity: 0;
          }
        }
      `}</style>
    </>
  );
};
