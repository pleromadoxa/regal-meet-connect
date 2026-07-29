
import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Heart, ThumbsUp, PartyPopper, Zap, Coffee, Clock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

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

    // Remove reaction after 5 seconds
    setTimeout(() => {
      setReactions(prev => prev.filter(r => r.id !== newReaction.id));
    }, 5000);
  };

  const sendReaction = (type: keyof typeof reactionEmojis) => {
    addReaction(type, 'local', 'You');
    onSendReaction?.(type);
    setShowReactionPanel(false);
  };

  // Listen for remote reactions via Supabase realtime
  useEffect(() => {
    const channel = supabase.channel('meeting-reactions');
    
    channel
      .on('broadcast', { event: 'reaction' }, (payload) => {
        const { type, participantId, participantName } = payload.payload;
        if (participantId !== 'local') {
          addReaction(type, participantId, participantName);
        }
      })
      .subscribe();

    // Also listen for local reactions
    const handleRemoteReaction = (event: CustomEvent) => {
      const { type, participantId, participantName } = event.detail;
      if (participantId !== 'local') {
        addReaction(type, participantId, participantName);
      }
    };

    window.addEventListener('remote-reaction', handleRemoteReaction as EventListener);
    
    return () => {
      supabase.removeChannel(channel);
      window.removeEventListener('remote-reaction', handleRemoteReaction as EventListener);
    };
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
            <div className="bg-black/90 backdrop-blur-sm px-4 py-2 rounded-full border border-white/30 shadow-2xl">
              <div className="flex items-center space-x-2">
                <span className="text-2xl">{reactionEmojis[reaction.type].emoji}</span>
                <span className="text-white text-sm font-medium">{reaction.participantName}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Recent Reactions Sidebar */}
      {reactions.length > 0 && (
        <Card className="fixed right-4 top-1/2 transform -translate-y-1/2 bg-black/90 backdrop-blur-xl border-white/20 p-4 max-w-56 z-40 shadow-2xl">
          <h3 className="text-white font-semibold text-sm mb-3">Recent Reactions</h3>
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {reactions.slice(-5).map((reaction) => (
              <div key={reaction.id} className="flex items-center space-x-2 text-sm bg-white/10 rounded-lg p-2">
                <span className="text-xl">{reactionEmojis[reaction.type].emoji}</span>
                <span className="text-white truncate font-medium">{reaction.participantName}</span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Reaction Panel */}
      {showReactionPanel && (
        <Card className="fixed bottom-32 left-1/2 transform -translate-x-1/2 bg-black/95 backdrop-blur-xl border-white/20 p-6 z-50 shadow-2xl">
          <div className="grid grid-cols-3 gap-4">
            {Object.entries(reactionEmojis).map(([type, config]) => (
              <Button
                key={type}
                onClick={() => sendReaction(type as keyof typeof reactionEmojis)}
                variant="outline"
                size="sm"
                className="bg-white/10 border-white/20 text-white hover:bg-white/20 hover:border-white/40 p-4 h-auto flex flex-col items-center transition-all duration-200 hover:scale-105"
              >
                <span className="text-3xl mb-2">{config.emoji}</span>
                <span className="text-xs capitalize font-medium">{type}</span>
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
        className="fixed bottom-20 right-4 bg-gradient-to-r from-orange-500/80 to-red-500/80 border-orange-400/40 text-white hover:from-orange-600/80 hover:to-red-600/80 hover:border-orange-300/60 backdrop-blur-sm rounded-full w-14 h-14 flex items-center justify-center z-40 shadow-2xl transition-all duration-300 hover:scale-110"
      >
        <span className="text-2xl">😊</span>
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
