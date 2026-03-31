
import { useState, useCallback, useEffect } from 'react';

interface Reaction {
  id: string;
  type: 'heart' | 'thumbsup' | 'thumbsdown' | 'clap' | 'party' | 'laugh' | 'surprised' | 'raisedhand';
  x: number;
  y: number;
  timestamp: number;
}

interface VideoReactionsProps {
  onSendReaction?: (type: string) => void;
}

export const VideoReactions = ({ onSendReaction }: VideoReactionsProps) => {
  const [reactions, setReactions] = useState<Reaction[]>([]);

  const addReaction = useCallback((type: any) => {
    const newReaction: Reaction = {
      id: Math.random().toString(36).substring(7),
      type,
      x: Math.random() * 70 + 15,
      y: Math.random() * 60 + 20,
      timestamp: Date.now(),
    };

    setReactions(prev => [...prev, newReaction]);
    onSendReaction?.(type);

    setTimeout(() => {
      setReactions(prev => prev.filter(r => r.id !== newReaction.id));
    }, 3000);
  }, [onSendReaction]);

  useEffect(() => {
    const handleRemoteReaction = (event: CustomEvent) => {
      const { type } = event.detail;
      addReaction(type);
    };

    window.addEventListener('remote-reaction', handleRemoteReaction as EventListener);
    return () => window.removeEventListener('remote-reaction', handleRemoteReaction as EventListener);
  }, [addReaction]);

  // Expose the addReaction function globally so other components can trigger reactions
  useEffect(() => {
    (window as any).triggerReaction = addReaction;
    return () => {
      delete (window as any).triggerReaction;
    };
  }, [addReaction]);

  return (
    <>
      {/* Floating Reactions Display */}
      <div className="fixed inset-0 pointer-events-none z-50">
        {reactions.map((reaction) => (
          <div
            key={reaction.id}
            className="absolute text-2xl animate-bounce"
            style={{
              left: `${reaction.x}%`,
              top: `${reaction.y}%`,
              animation: 'reaction-float 3s ease-out forwards',
            }}
          >
            {reaction.type === 'heart' && '💖'}
            {reaction.type === 'thumbsup' && '👍'}
            {reaction.type === 'party' && '🎉'}
            {reaction.type === 'clap' && '👏'}
            {reaction.type === 'laugh' && '😂'}
            {reaction.type === 'surprised' && '😮'}
            {reaction.type === 'thumbsdown' && '👎'}
            {reaction.type === 'raisedhand' && '✋'}
          </div>
        ))}
      </div>

      {/* Animation styles */}
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
