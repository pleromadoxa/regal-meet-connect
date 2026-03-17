import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Send, X, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { useMeetingChat } from '@/hooks/useMeetingChat';

interface InMeetingChatProps {
  meetingId: string;
  userId: string;
  userName: string;
  onClose: () => void;
}

export const InMeetingChat = ({ meetingId, userId, userName, onClose }: InMeetingChatProps) => {
  const [currentMessage, setCurrentMessage] = useState('');
  const { messages, isLoading, sendMessage } = useMeetingChat(meetingId, userId, userName);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      const scrollContainer = scrollRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
      }
    }
  }, [messages]);

  const handleSendMessage = async () => {
    if (!currentMessage.trim()) return;
    const msg = currentMessage.trim();
    setCurrentMessage('');
    await sendMessage(msg);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <Card className="fixed bottom-24 right-4 w-80 h-[450px] bg-black/90 backdrop-blur-xl border-white/20 shadow-2xl z-50 flex flex-col">
      <div className="flex items-center justify-between p-3 border-b border-white/20">
        <h3 className="text-white font-semibold">Meeting Chat</h3>
        <Button
          onClick={onClose}
          variant="ghost"
          size="sm"
          className="text-white hover:bg-white/10 h-8 w-8 p-0"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
      
      <ScrollArea className="flex-1 p-3" ref={scrollRef}>
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="h-6 w-6 text-blue-400 animate-spin" />
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((msg) => (
              <div key={msg.id} className={`flex flex-col ${msg.user_id === userId ? 'items-end' : 'items-start'}`}>
                <div className="flex items-center space-x-2 mb-1">
                  <span className="text-blue-300 text-xs font-medium">
                    {msg.user_id === userId ? 'You' : msg.user_name}
                  </span>
                  <span className="text-gray-500 text-[10px]">
                    {format(new Date(msg.created_at), 'HH:mm')}
                  </span>
                </div>
                <div className={`px-3 py-2 rounded-lg text-sm max-w-[90%] break-words ${
                  msg.user_id === userId
                    ? 'bg-blue-600 text-white rounded-tr-none'
                    : 'bg-white/10 text-white rounded-tl-none'
                }`}>
                  {msg.message}
                </div>
              </div>
            ))}
            {messages.length === 0 && (
              <div className="text-center text-gray-500 text-sm mt-10">
                No messages yet. Say hello!
              </div>
            )}
          </div>
        )}
      </ScrollArea>

      <div className="p-3 border-t border-white/20">
        <div className="flex space-x-2">
          <Input
            value={currentMessage}
            onChange={(e) => setCurrentMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Type a message..."
            className="bg-white/10 border-white/20 text-white placeholder-gray-400 h-9"
          />
          <Button
            onClick={handleSendMessage}
            size="sm"
            className="bg-blue-600 hover:bg-blue-700 h-9"
            disabled={!currentMessage.trim()}
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </Card>
  );
};
