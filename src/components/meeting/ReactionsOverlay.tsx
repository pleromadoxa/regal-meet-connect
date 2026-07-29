
import React, { useEffect, useState } from 'react';
import { ReactionEvent } from '@/hooks/useMeetingState';

interface ReactionsOverlayProps {
  reactions: ReactionEvent[];
}

const reactionEmojis: Record<string, string> = {
  thumbsUp: '👍',
  heart: '❤️',
  laugh: '😂',
  clap: '👏',
  wave: '👋'
};

export const ReactionsOverlay = ({ reactions }: ReactionsOverlayProps) => {
  const [visibleReactions, setVisibleReactions] = useState<ReactionEvent[]>([]);

  useEffect(() => {
    setVisibleReactions(reactions.slice(-5)); // Show only last 5 reactions
  }, [reactions]);

  return (
    <div className="absolute top-4 right-4 flex flex-col space-y-2">
      {visibleReactions.map((reaction) => (
        <div
          key={reaction.timestamp}
          className="flex items-center space-x-2 bg-black/50 text-white px-3 py-1 rounded-full animate-bounce"
          style={{
            animation: 'slideInRight 0.3s ease-out, fadeOut 0.5s ease-in 2.5s forwards'
          }}
        >
          <span className="text-lg">{reactionEmojis[reaction.type] || '👍'}</span>
          <span className="text-sm">{reaction.participantName}</span>
        </div>
      ))}
    </div>
  );
};
