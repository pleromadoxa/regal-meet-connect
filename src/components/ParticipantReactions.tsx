
import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Heart, ThumbsUp, PartyPopper, Zap, Coffee, Clock } from 'lucide-react';

interface Reaction {
  id: string;
  participantId: string;
  participantName: string;
  type: 'heart' | 'like' | 'party' | 'energy' | 'coffee' | 'slow';
  timestamp: number;
}

interface ParticipantReactionsProps {
  onSendReaction?: (type: string) => void;
  participants: Array<{ id: string; user_name: string }>;
}

const reactionEmojis = {
  heart: { icon: Heart, emoji: '❤️', color: 'text-red-400' },
  like: { icon: ThumbsUp, emoji: '👍', color: 'text-blue-400' },
  party: { icon: PartyPopper, emoji: '🎉', color: 'text-yellow-400' },
  energy: { icon: Zap, emoji: '⚡', color: 'text-purple-400' },
  coffee: { icon: Coffee, emoji: '☕', color: 'text-amber-400' },
  slow: { icon: Clock, emoji: '🐌', color: 'text-gray-400' }
};

export const ParticipantReactions = ({ onSendReaction, participants }: ParticipantReactionsProps) => {
  const [reactions, setReactions] = useState<Reaction[]>([]);
  const [showReactionPanel, setShowReactionPanel] = useState(false);

  const addReaction = (type: keyof typeof reactionEmojis, participantId: string, participantName: string) => {
    const newReaction: Reaction = {
      id: Math.random().toString(36).substring(7),
      participantId,
      participantName,
      type,
      timestamp: Date.now()
    };

    setReactions(prev => [...prev, newReaction]);
    onSendReaction?.(type);

    // Remove reaction after 5 seconds
    setTimeout(() => {
      setReactions(prev => prev.filter(r => r.id !== newReaction.id));
    }, 5000);
  };

  const sendReaction = (type: keyof typeof reactionEmojis) => {
    addReaction(type, 'local', 'You');
    setShowReactionPanel(false);
  };

  // Listen for remote reactions
  useEffect(() => {
    const handleRemoteReaction = (event: CustomEvent) => {
      const { type, participantId, participantName } = event.detail;
      if (participantId !== 'local') {
        addReaction(type, participantId, participantName);
      }
    };

    window.addEventListener('remote-reaction', handleRemoteReaction as EventListener);
    return () => window.removeEventListener('remote-reaction', handleRemoteReaction as EventListener);
  }, []);

  return (
    <>
      {/* Floating Reactions Display */}
      <div className="fixed inset-0 pointer-events-none z-50">
        {reactions.map((reaction) => (
          <div
            key={reaction.id}
            className="absolute animate-bounce"
            style={{
              left: `${Math.random() * 70 + 15}%`,
              top: `${Math.random() * 60 + 20}%`,
              animation: 'reaction-float 5s ease-out forwards',
            }}
          >
            <div className="bg-black/80 backdrop-blur-sm px-3 py-2 rounded-full border border-white/20">
              <div className="flex items-center space-x-2">
                <span className="text-lg">{reactionEmojis[reaction.type].emoji}</span>
                <span className="text-white text-sm font-medium">{reaction.participantName}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Recent Reactions Sidebar */}
      {reactions.length > 0 && (
        <Card className="fixed right-4 top-1/2 transform -translate-y-1/2 bg-black/80 backdrop-blur-xl border-white/20 p-3 max-w-48 z-40">
          <h3 className="text-white font-semibold text-sm mb-2">Recent Reactions</h3>
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {reactions.slice(-5).map((reaction) => (
              <div key={reaction.id} className="flex items-center space-x-2 text-sm">
                <span className="text-lg">{reactionEmojis[reaction.type].emoji}</span>
                <span className="text-white truncate">{reaction.participantName}</span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Reaction Panel */}
      {showReactionPanel && (
        <Card className="fixed bottom-32 left-1/2 transform -translate-x-1/2 bg-black/90 backdrop-blur-xl border-white/20 p-4 z-50">
          <div className="grid grid-cols-3 gap-3">
            {Object.entries(reactionEmojis).map(([type, config]) => (
              <Button
                key={type}
                onClick={() => sendReaction(type as keyof typeof reactionEmojis)}
                variant="outline"
                size="sm"
                className="bg-white/20 border-white/30 text-white hover:bg-white/30 p-3 h-auto flex flex-col items-center"
              >
                <span className="text-2xl mb-1">{config.emoji}</span>
                <span className="text-xs capitalize">{type}</span>
              </Button>
            ))}
          </div>
        </Card>
      )}

      {/* Toggle Button for Reactions */}
      <Button
        onClick={() => setShowReactionPanel(!showReactionPanel)}
        variant="outline"
        size="sm"
        className="fixed bottom-20 right-4 bg-white/20 border-white/30 text-white hover:bg-white/30 rounded-full w-12 h-12 flex items-center justify-center z-40"
      >
        <span className="text-lg">😊</span>
      </Button>

      {/* Animation styles */}
      <style>{`
        @keyframes reaction-float {
          0% {
            transform: translateY(0) scale(1);
            opacity: 1;
          }
          25% {
            transform: translateY(-30px) scale(1.1);
            opacity: 0.9;
          }
          75% {
            transform: translateY(-80px) scale(1);
            opacity: 0.5;
          }
          100% {
            transform: translateY(-120px) scale(0.8);
            opacity: 0;
          }
        }
      `}</style>
    </>
  );
};
