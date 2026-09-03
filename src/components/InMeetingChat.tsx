
import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Send, X } from 'lucide-react';
import { format } from 'date-fns';
import { useMeetingChatChannel, type MeetingChatMessage } from '@/hooks/useMeetingChatChannel';
import { useToast } from '@/hooks/use-toast';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';

interface InMeetingChatProps {
  userName: string;
  onClose: () => void;
  meetingId?: string;
  onSendMessage?: (message: string) => void;
  messages?: MeetingChatMessage[];
}

export const InMeetingChat = ({
  userName,
  onClose,
  meetingId,
  onSendMessage,
  messages: externalMessages = [],
}: InMeetingChatProps) => {
  const isMobile = useIsMobile();
  const [currentMessage, setCurrentMessage] = useState('');
  const [localOnlyMessages, setLocalOnlyMessages] = useState<MeetingChatMessage[]>(externalMessages);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const { messages: syncedMessages, sendMessage, isConnected } = useMeetingChatChannel(meetingId, userName);

  const chatMessages = meetingId ? syncedMessages : localOnlyMessages;

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [chatMessages]);

  const handleSendMessage = async () => {
    if (!currentMessage.trim()) return;

    if (meetingId) {
      const sent = await sendMessage(currentMessage);
      if (!sent) {
        toast({
          title: 'Message not sent',
          description: 'Could not reach the meeting chat. Check your connection and try again.',
          variant: 'destructive',
        });
        return;
      }
    } else {
      const newMessage: MeetingChatMessage = {
        id: Math.random().toString(36).substring(7),
        userName,
        message: currentMessage.trim(),
        timestamp: new Date(),
      };
      setLocalOnlyMessages((prev) => [...prev, newMessage]);
      onSendMessage?.(currentMessage.trim());
    }

    setCurrentMessage('');
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void handleSendMessage();
    }
  };

  return (
    <Card
      className={cn(
        'fixed z-50 flex flex-col border-white/20 bg-black/90 shadow-2xl backdrop-blur-xl',
        isMobile
          ? 'inset-x-0 bottom-0 top-auto h-[min(70dvh,520px)] w-full max-w-none rounded-t-2xl rounded-b-none safe-area-inset-bottom'
          : 'bottom-[calc(var(--meeting-stack-height)+0.5rem)] right-4 h-96 w-80 max-w-[calc(100vw-2rem)] sm:right-6'
      )}
    >
      <div className="flex items-center justify-between p-3 border-b border-white/20">
        <h3 className="text-white font-semibold">Meeting Chat</h3>
        <Button
          onClick={onClose}
          variant="ghost"
          size="sm"
          className="text-white hover:bg-white/10"
          aria-label="Close chat"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      <ScrollArea className="flex-1 p-3 min-h-0" ref={scrollRef}>
        <div className="space-y-3">
          {meetingId && !isConnected && (
            <p className="text-xs text-amber-300/80 text-center py-2">Connecting to chat…</p>
          )}
          {chatMessages.length === 0 && (
            <p className="text-sm text-white/40 text-center py-8">
              {meetingId ? 'Send a message to everyone in the meeting.' : 'Chat is local only without a meeting ID.'}
            </p>
          )}
          {chatMessages.map((msg) => (
            <div key={msg.id} className="text-sm">
              <div className="flex items-center space-x-2 mb-1">
                <span className={`font-medium ${msg.userName === userName ? 'text-purple-300' : 'text-blue-300'}`}>
                  {msg.userName === userName ? 'You' : msg.userName}
                </span>
                <span className="text-gray-400 text-xs">
                  {format(msg.timestamp, 'HH:mm')}
                </span>
              </div>
              <p className="text-white/90 break-words">{msg.message}</p>
            </div>
          ))}
        </div>
      </ScrollArea>

      <div className="p-3 border-t border-white/20 flex gap-2">
        <Input
          value={currentMessage}
          onChange={(e) => setCurrentMessage(e.target.value)}
          onKeyDown={handleKeyPress}
          placeholder="Type a message…"
          className="bg-white/10 border-white/20 text-white placeholder:text-white/40"
          maxLength={2000}
        />
        <Button
          onClick={() => void handleSendMessage()}
          size="icon"
          className="shrink-0 bg-purple-600 hover:bg-purple-700"
          disabled={!currentMessage.trim()}
          aria-label="Send message"
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </Card>
  );
};
