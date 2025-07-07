
import { useState, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Heart, ThumbsUp, Sparkles } from 'lucide-react';

interface Reaction {
  id: string;
  type: 'heart' | 'like' | 'celebration';
  x: number;
  y: number;
  timestamp: number;
}

interface VideoReactionsProps {
  onSendReaction?: (type: 'heart' | 'like' | 'celebration') => void;
}

export const VideoReactions = ({ onSendReaction }: VideoReactionsProps) => {
  const [reactions, setReactions] = useState<Reaction[]>([]);

  const addReaction = useCallback((type: 'heart' | 'like' | 'celebration') => {
    const newReaction: Reaction = {
      id: Math.random().toString(36).substring(7),
      type,
      x: Math.random() * 80 + 10, // Random position between 10% and 90%
      y: Math.random() * 60 + 20, // Random position between 20% and 80%
      timestamp: Date.now(),
    };

    setReactions(prev => [...prev, newReaction]);
    onSendReaction?.(type);

    // Remove reaction after animation
    setTimeout(() => {
      setReactions(prev => prev.filter(r => r.id !== newReaction.id));
    }, 3000);
  }, [onSendReaction]);

  const handleReaction = (type: 'heart' | 'like' | 'celebration') => {
    addReaction(type);
  };

  // Listen for reactions from other users
  useEffect(() => {
    const handleRemoteReaction = (event: CustomEvent) => {
      const { type } = event.detail;
      addReaction(type);
    };

    window.addEventListener('remote-reaction', handleRemoteReaction as EventListener);
    return () => window.removeEventListener('remote-reaction', handleRemoteReaction as EventListener);
  }, [addReaction]);

  return (
    <>
      {/* Reaction Controls */}
      <div className="flex items-center space-x-2">
        <Button
          onClick={() => handleReaction('heart')}
          variant="outline"
          size="sm"
          className="bg-red-500/20 border-red-400/40 text-red-300 hover:bg-red-500/30 hover:border-red-400/60 shadow-lg backdrop-blur-sm transition-all duration-200"
        >
          <Heart className="h-4 w-4" />
        </Button>
        <Button
          onClick={() => handleReaction('like')}
          variant="outline"
          size="sm"
          className="bg-blue-500/20 border-blue-400/40 text-blue-300 hover:bg-blue-500/30 hover:border-blue-400/60 shadow-lg backdrop-blur-sm transition-all duration-200"
        >
          <ThumbsUp className="h-4 w-4" />
        </Button>
        <Button
          onClick={() => handleReaction('celebration')}
          variant="outline"
          size="sm"
          className="bg-purple-500/20 border-purple-400/40 text-purple-300 hover:bg-purple-500/30 hover:border-purple-400/60 shadow-lg backdrop-blur-sm transition-all duration-200"
        >
          <Sparkles className="h-4 w-4" />
        </Button>
      </div>

      {/* Animated Reactions Overlay */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {reactions.map((reaction) => (
          <div
            key={reaction.id}
            className="absolute animate-bounce"
            style={{
              left: `${reaction.x}%`,
              top: `${reaction.y}%`,
              animation: 'reaction-float 3s ease-out forwards',
            }}
          >
            {reaction.type === 'heart' && (
              <Heart className="h-8 w-8 text-red-400 drop-shadow-lg animate-pulse" fill="currentColor" />
            )}
            {reaction.type === 'like' && (
              <ThumbsUp className="h-8 w-8 text-blue-400 drop-shadow-lg animate-pulse" fill="currentColor" />
            )}
            {reaction.type === 'celebration' && (
              <Sparkles className="h-8 w-8 text-purple-400 drop-shadow-lg animate-pulse" fill="currentColor" />
            )}
          </div>
        ))}
      </div>

      <style jsx>{`
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
