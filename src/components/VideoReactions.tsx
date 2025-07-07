
import { useState, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Heart, ThumbsUp, Settings } from 'lucide-react';

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
      x: Math.random() * 70 + 15, // Keep reactions within main video area
      y: Math.random() * 60 + 20, // Keep reactions within main video area
      timestamp: Date.now(),
    };

    setReactions(prev => [...prev, newReaction]);
    onSendReaction?.(type);

    setTimeout(() => {
      setReactions(prev => prev.filter(r => r.id !== newReaction.id));
    }, 3000);
  }, [onSendReaction]);

  const handleReaction = (type: 'heart' | 'like' | 'celebration') => {
    addReaction(type);
  };

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
      {/* Reaction Controls - positioned on the side */}
      <div className="fixed top-1/2 right-4 transform -translate-y-1/2 z-[60]">
        <div className="flex flex-col items-center space-y-1 sm:space-y-2">
          <Button
            onClick={() => handleReaction('heart')}
            variant="outline"
            size="sm"
            className="bg-red-500/20 border-red-400/40 text-red-300 hover:bg-red-500/30 hover:border-red-400/60 shadow-lg backdrop-blur-sm transition-all duration-200 px-2 sm:px-3"
          >
            <Heart className="h-3 w-3 sm:h-4 sm:w-4" />
          </Button>
          <Button
            onClick={() => handleReaction('like')}
            variant="outline"
            size="sm"
            className="bg-blue-500/20 border-blue-400/40 text-blue-300 hover:bg-blue-500/30 hover:border-blue-400/60 shadow-lg backdrop-blur-sm transition-all duration-200 px-2 sm:px-3"
          >
            <ThumbsUp className="h-3 w-3 sm:h-4 sm:w-4" />
          </Button>
          <Button
            onClick={() => handleReaction('celebration')}
            variant="outline"
            size="sm"
            className="bg-purple-500/20 border-purple-400/40 text-purple-300 hover:bg-purple-500/30 hover:border-purple-400/60 shadow-lg backdrop-blur-sm transition-all duration-200 px-2 sm:px-3"
          >
            <Settings className="h-3 w-3 sm:h-4 sm:w-4" />
          </Button>
        </div>
      </div>

      {/* Reactions Overlay - positioned over the MAIN VIDEO AREA */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-[55]">
        {reactions.map((reaction) => (
          <div
            key={reaction.id}
            className="absolute"
            style={{
              left: `${reaction.x}%`,
              top: `${reaction.y}%`,
              animation: 'reaction-float 3s ease-out forwards',
            }}
          >
            {reaction.type === 'heart' && (
              <Heart className="h-6 w-6 sm:h-8 sm:w-8 text-red-400 drop-shadow-lg animate-pulse" fill="currentColor" />
            )}
            {reaction.type === 'like' && (
              <ThumbsUp className="h-6 w-6 sm:h-8 sm:w-8 text-blue-400 drop-shadow-lg animate-pulse" fill="currentColor" />
            )}
            {reaction.type === 'celebration' && (
              <Settings className="h-6 w-6 sm:h-8 sm:w-8 text-purple-400 drop-shadow-lg animate-pulse" fill="currentColor" />
            )}
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
