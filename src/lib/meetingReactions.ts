import type { MeetingReactionType } from '@/hooks/useMeetingReactionsChannel';

export const REACTION_EMOJI: Record<MeetingReactionType, string> = {
  heart: '❤️',
  like: '😊',
  celebration: '👏',
  party: '😂',
  energy: '😁',
  coffee: '☕',
  slow: '🐌',
};

export const QUICK_REACTIONS: MeetingReactionType[] = [
  'heart',
  'celebration',
  'like',
  'party',
  'energy',
];

export interface ReactionParticle {
  id: string;
  emoji: string;
  left: number;
  top: number;
  driftX: number;
  driftY: number;
  duration: number;
  delay: number;
  size: number;
}

const PARTICLES_PER_BURST = 10;

/** Spawn emoji particles that drift across the full viewport. */
export function createReactionBurst(type: MeetingReactionType): ReactionParticle[] {
  const emoji = REACTION_EMOJI[type];
  const now = Date.now();

  return Array.from({ length: PARTICLES_PER_BURST }, (_, index) => {
    const fromLeft = Math.random() > 0.5;
    const left = fromLeft
      ? Math.random() * 18 + 2
      : Math.random() * 18 + 80;
    const top = Math.random() * 55 + 25;

    const driftX = fromLeft
      ? Math.random() * 55 + 35
      : -(Math.random() * 55 + 35);
    const driftY = -(Math.random() * 45 + 25);

    return {
      id: `${now}-${index}-${Math.random().toString(36).slice(2, 7)}`,
      emoji,
      left,
      top,
      driftX,
      driftY,
      duration: Math.random() * 1.8 + 2.6,
      delay: Math.random() * 0.35,
      size: Math.random() * 1.1 + 1.8,
    };
  });
}

/** Gentle ambient lobby emojis (decorative). */
export function createLobbyAmbienceParticle(): ReactionParticle {
  const emojis = ['👋', '✨', '🎉', '👏', '😊'];
  const fromLeft = Math.random() > 0.45;

  return {
    id: `lobby-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    emoji: emojis[Math.floor(Math.random() * emojis.length)]!,
    left: fromLeft ? Math.random() * 12 : Math.random() * 12 + 88,
    top: Math.random() * 30 + 65,
    driftX: fromLeft ? Math.random() * 40 + 25 : -(Math.random() * 40 + 25),
    driftY: -(Math.random() * 35 + 20),
    duration: Math.random() * 2 + 3.5,
    delay: Math.random() * 0.5,
    size: Math.random() * 0.6 + 1.2,
  };
}
