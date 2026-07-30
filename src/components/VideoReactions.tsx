
import { useCallback, useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  useMeetingReactionsChannel,
  type MeetingReactionType,
} from '@/hooks/useMeetingReactionsChannel';

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
  like: '👍',
  celebration: '🎉',
  party: '🥳',
  energy: '⚡',
  coffee: '☕',
  slow: '🐌',
};

const QUICK_REACTIONS: MeetingReactionType[] = ['heart', 'like', 'celebration', 'party'];

export const VideoReactions = ({ meetingId, userId = '', userName = '' }: VideoReactionsProps) => {
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
      <div className="flex flex-col gap-2 pointer-events-auto">
        {QUICK_REACTIONS.map((type) => (
          <Button
            key={type}
            type="button"
            variant="outline"
            size="icon"
            aria-label={`Send ${type} reaction`}
            className="h-11 w-11 rounded-full border-white/15 bg-black/60 text-xl hover:bg-black/80 backdrop-blur-md"
            onClick={() => void handleReaction(type)}
          >
            {REACTION_EMOJI[type]}
          </Button>
        ))}
      </div>

      <div className="fixed inset-0 pointer-events-none z-50">
        {localReactions.map((reaction) => (
          <div
            key={reaction.id}
            className="absolute text-2xl animate-bounce"
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
