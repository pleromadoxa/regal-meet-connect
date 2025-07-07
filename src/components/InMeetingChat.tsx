
import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MessageCircle, Send, X } from 'lucide-react';
import { format } from 'date-fns';

interface ChatMessage {
  id: string;
  userName: string;
  message: string;
  timestamp: Date;
}

interface InMeetingChatProps {
  userName: string;
  onSendMessage?: (message: string) => void;
  messages?: ChatMessage[];
  onClose: () => void;
}

export const InMeetingChat = ({ userName, onSendMessage, messages = [], onClose }: InMeetingChatProps) => {
  const [currentMessage, setCurrentMessage] = useState('');
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>(messages);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [chatMessages]);

  const handleSendMessage = () => {
    if (!currentMessage.trim()) return;

    const newMessage: ChatMessage = {
      id: Math.random().toString(36).substring(7),
      userName,
      message: currentMessage.trim(),
      timestamp: new Date()
    };

    setChatMessages(prev => [...prev, newMessage]);
    onSendMessage?.(currentMessage.trim());
    setCurrentMessage('');
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <Card className="fixed bottom-20 sm:bottom-24 right-4 w-80 h-96 bg-black/90 backdrop-blur-xl border-white/20 shadow-2xl z-50">
      <div className="flex items-center justify-between p-3 border-b border-white/20">
        <h3 className="text-white font-semibold">Meeting Chat</h3>
        <Button
          onClick={onClose}
          variant="ghost"
          size="sm"
          className="text-white hover:bg-white/10"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
      
      <ScrollArea className="flex-1 p-3 h-64" ref={scrollRef}>
        <div className="space-y-3">
          {chatMessages.map((msg) => (
            <div key={msg.id} className="text-sm">
              <div className="flex items-center space-x-2 mb-1">
                <span className="text-blue-300 font-medium">{msg.userName}</span>
                <span className="text-gray-400 text-xs">
                  {format(msg.timestamp, 'HH:mm')}
                </span>
              </div>
              <p className="text-white">{msg.message}</p>
            </div>
          ))}
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
