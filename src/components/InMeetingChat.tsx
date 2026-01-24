
import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MessageCircle, Send, X } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { useMeetingChat } from '@/hooks/useMeetingChat';
import { useAuth } from '@/hooks/useAuth';

interface InMeetingChatProps {
  userName: string;
  onClose: () => void;
  className?: string;
}

export const InMeetingChat = ({ userName, onClose, className }: InMeetingChatProps) => {
  const [currentMessage, setCurrentMessage] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();

  // Extract meeting ID from URL
  const meetingId = window.location.pathname.split('/meeting/')[1]?.split('?')[0] || '';

  const { messages, sendMessage, isLoading } = useMeetingChat(meetingId, user?.id || '', userName);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSendMessage = async () => {
    if (!currentMessage.trim()) return;

    try {
      await sendMessage(currentMessage);
      setCurrentMessage('');
    } catch (error) {
      // Error handled by hook
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <Card className={cn("flex flex-col h-full w-full bg-slate-900 border-l border-white/10 shadow-none rounded-none", className)}>
      <div className="flex items-center justify-between p-4 border-b border-white/10">
        <h3 className="text-white font-semibold">In-call messages</h3>
        <Button
          onClick={onClose}
          variant="ghost"
          size="sm"
          className="text-white hover:bg-white/10"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
      
      <ScrollArea className="flex-1 p-4" ref={scrollRef}>
        <div className="space-y-3">
          {isLoading ? (
             <div className="flex justify-center p-4">
                <div className="animate-spin h-6 w-6 border-2 border-blue-500 rounded-full border-t-transparent"></div>
             </div>
          ) : messages.length === 0 ? (
             <div className="text-center text-gray-500 mt-4 text-sm">
                No messages yet
             </div>
          ) : (
            messages.map((msg) => (
              <div key={msg.id} className="text-sm">
                <div className="flex items-center space-x-2 mb-1">
                  <span className="text-blue-300 font-medium">{msg.user_name}</span>
                  <span className="text-gray-400 text-xs">
                    {format(new Date(msg.created_at), 'HH:mm')}
                  </span>
                </div>
                <p className="text-white break-words">{msg.message}</p>
              </div>
            ))
          )}
        </div>
      </ScrollArea>

      <div className="p-3 border-t border-white/20">
        <div className="flex space-x-2">
          <Input
            value={currentMessage}
            onChange={(e) => setCurrentMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Type a message..."
            className="bg-white/10 border-white/20 text-white placeholder-gray-400"
          />
          <Button
            onClick={handleSendMessage}
            size="sm"
            className="bg-blue-500/80 hover:bg-blue-600/80"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </Card>
  );
};
