
import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';

interface Reaction {
  id: string;
  participantId: string;
  participantName: string;
  type: 'heart' | 'thumbsup' | 'thumbsdown' | 'clap' | 'party' | 'laugh' | 'surprised' | 'raisedhand';
  timestamp: number;
}

interface ParticipantReactionsProps {
  onSendReaction?: (type: string) => void;
  participants: Array<{ id: string; user_name: string }>;
}

const reactionEmojis = {
  heart: { emoji: '💖' },
  thumbsup: { emoji: '👍' },
  party: { emoji: '🎉' },
  clap: { emoji: '👏' },
  laugh: { emoji: '😂' },
  surprised: { emoji: '😮' },
  thumbsdown: { emoji: '👎' },
  raisedhand: { emoji: '✋' }
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

      {/* Reaction Panel - Horizontal like Google Meet */}
      {showReactionPanel && (
        <Card className="fixed bottom-24 left-1/2 transform -translate-x-1/2 bg-[#202124] border-slate-700 p-2 z-50 shadow-2xl rounded-full">
          <div className="flex space-x-2">
            {Object.entries(reactionEmojis).map(([type, config]) => (
              <Button
                key={type}
                onClick={() => sendReaction(type as keyof typeof reactionEmojis)}
                variant="ghost"
                size="icon"
                className="hover:bg-slate-700/50 rounded-full w-12 h-12 flex items-center justify-center transition-transform hover:scale-110"
                title={type}
              >
                <span className="text-2xl">{config.emoji}</span>
              </Button>
            ))}
          </div>
        </Card>
      )}

      {/* Toggle Button for Reactions */}
      <Button
        onClick={() => setShowReactionPanel(!showReactionPanel)}
        variant="outline"
        size="icon"
        className={`fixed bottom-[88px] right-24 bg-[#3c4043] border-none text-white hover:bg-[#4a4d51] rounded-full w-12 h-12 flex items-center justify-center z-40 shadow-lg transition-colors ${showReactionPanel ? 'bg-blue-500/20 text-blue-400' : ''}`}
        title="Send a reaction"
      >
        <span className="text-xl">✨</span>
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
