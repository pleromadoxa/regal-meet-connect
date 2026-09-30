import type { CSSProperties } from 'react';
import type { ReactionParticle } from '@/lib/meetingReactions';
import { cn } from '@/lib/utils';

interface MeetingReactionOverlayProps {
  particles: ReactionParticle[];
  className?: string;
}

export function MeetingReactionOverlay({ particles, className }: MeetingReactionOverlayProps) {
  if (particles.length === 0) return null;

  return (
    <div
      className={cn(
        'pointer-events-none fixed inset-0 z-[200] overflow-hidden',
        className
      )}
      aria-hidden
    >
      {particles.map((particle) => (
        <span
          key={particle.id}
          className="meeting-reaction-particle absolute select-none will-change-transform"
          style={
            {
              left: `${particle.left}%`,
              top: `${particle.top}%`,
              fontSize: `${particle.size}rem`,
              animationDuration: `${particle.duration}s`,
              animationDelay: `${particle.delay}s`,
              '--reaction-drift-x': `${particle.driftX}vw`,
              '--reaction-drift-y': `${particle.driftY}vh`,
            } as CSSProperties
          }
        >
          {particle.emoji}
        </span>
      ))}
    </div>
  );
}
