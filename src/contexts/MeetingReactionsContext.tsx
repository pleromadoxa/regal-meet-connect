import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import {
  useMeetingReactionsChannel,
  type MeetingReactionType,
} from '@/hooks/useMeetingReactionsChannel';
import {
  createReactionBurst,
  type ReactionParticle,
} from '@/lib/meetingReactions';

interface MeetingReactionsContextValue {
  sendReaction: (type: MeetingReactionType) => Promise<boolean>;
  spawnBurst: (type: MeetingReactionType) => void;
  particles: ReactionParticle[];
}

const MeetingReactionsContext = createContext<MeetingReactionsContextValue | null>(null);

interface MeetingReactionsProviderProps {
  meetingId?: string;
  userId?: string;
  userName?: string;
  children: ReactNode;
}

export function MeetingReactionsProvider({
  meetingId,
  userId = '',
  userName = '',
  children,
}: MeetingReactionsProviderProps) {
  const [particles, setParticles] = useState<ReactionParticle[]>([]);
  const { reactions, sendReaction: channelSend } = useMeetingReactionsChannel(
    meetingId,
    userId,
    userName
  );

  const seenTimestampsRef = useRef<Set<number>>(new Set());
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  const spawnBurst = useCallback((type: MeetingReactionType) => {
    const burst = createReactionBurst(type);
    setParticles((prev) => [...prev, ...burst]);

    burst.forEach((particle) => {
      const timer = window.setTimeout(() => {
        setParticles((prev) => prev.filter((p) => p.id !== particle.id));
      }, (particle.duration + particle.delay) * 1000 + 200);
      timersRef.current.push(timer);
    });
  }, []);

  useEffect(() => {
    reactions.forEach((reaction) => {
      if (seenTimestampsRef.current.has(reaction.timestamp)) return;
      seenTimestampsRef.current.add(reaction.timestamp);
      spawnBurst(reaction.type);
    });
  }, [reactions, spawnBurst]);

  useEffect(() => {
    return () => {
      timersRef.current.forEach((timer) => clearTimeout(timer));
      timersRef.current = [];
    };
  }, []);

  const sendReaction = useCallback(
    async (type: MeetingReactionType) => {
      if (meetingId && userId) {
        const sent = await channelSend(type);
        if (!sent) spawnBurst(type);
        return sent;
      }
      spawnBurst(type);
      return true;
    },
    [channelSend, meetingId, spawnBurst, userId]
  );

  const value = useMemo(
    () => ({ sendReaction, spawnBurst, particles }),
    [particles, sendReaction, spawnBurst]
  );

  return (
    <MeetingReactionsContext.Provider value={value}>
      {children}
    </MeetingReactionsContext.Provider>
  );
}

export function useMeetingReactions() {
  const ctx = useContext(MeetingReactionsContext);
  if (!ctx) {
    throw new Error('useMeetingReactions must be used within MeetingReactionsProvider');
  }
  return ctx;
}

/** Optional hook for lobby/demo bursts without a live meeting channel. */
export function useOptionalMeetingReactions() {
  return useContext(MeetingReactionsContext);
}
