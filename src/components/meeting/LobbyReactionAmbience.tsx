import { useEffect, useRef, useState } from 'react';
import {
  createLobbyAmbienceParticle,
  createReactionBurst,
  type ReactionParticle,
} from '@/lib/meetingReactions';
import type { MeetingReactionType } from '@/hooks/useMeetingReactionsChannel';
import { MeetingReactionOverlay } from './MeetingReactionOverlay';

interface LobbyReactionAmbienceProps {
  active: boolean;
  celebrate?: boolean;
}

export function LobbyReactionAmbience({ active, celebrate = false }: LobbyReactionAmbienceProps) {
  const [particles, setParticles] = useState<ReactionParticle[]>([]);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const celebratedRef = useRef(false);

  const pushParticles = (next: ReactionParticle[]) => {
    setParticles((prev) => [...prev, ...next]);
    next.forEach((particle) => {
      const timer = window.setTimeout(() => {
        setParticles((prev) => prev.filter((p) => p.id !== particle.id));
      }, (particle.duration + particle.delay) * 1000 + 200);
      timersRef.current.push(timer);
    });
  };

  useEffect(() => {
    if (!active) return;

    const interval = window.setInterval(() => {
      pushParticles([createLobbyAmbienceParticle()]);
    }, 2200);

    return () => clearInterval(interval);
  }, [active]);

  useEffect(() => {
    if (!celebrate || celebratedRef.current) return;
    celebratedRef.current = true;

    const types: MeetingReactionType[] = ['celebration', 'party', 'energy', 'like'];
    types.forEach((type, index) => {
      window.setTimeout(() => pushParticles(createReactionBurst(type)), index * 180);
    });
  }, [celebrate]);

  useEffect(() => {
    return () => {
      timersRef.current.forEach((timer) => clearTimeout(timer));
      timersRef.current = [];
    };
  }, []);

  return <MeetingReactionOverlay particles={particles} />;
}
