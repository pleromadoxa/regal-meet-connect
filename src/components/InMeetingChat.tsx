
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

/**
 * Module-level caches so the local-only conversation and the half-typed draft
 * survive the panel being minimised (the component unmounts when it closes).
 * Keys are meeting-scoped; state is dropped on a full page reload.
 */
const localOnlyCache = new Map<string, MeetingChatMessage[]>();
const draftCache = new Map<string, string>();
const cacheKey = (meetingId?: string) => meetingId ?? '__local__';

export const InMeetingChat = ({
  userName,
  onClose,
  meetingId,
  onSendMessage,
  messages: externalMessages = [],
}: InMeetingChatProps) => {
  const isMobile = useIsMobile();
  const key = cacheKey(meetingId);
  const [currentMessage, setCurrentMessage] = useState(() => draftCache.get(key) ?? '');
  const [localOnlyMessages, setLocalOnlyMessages] = useState<MeetingChatMessage[]>(
    () => localOnlyCache.get(key) ?? externalMessages
  );

  const updateDraft = (value: string) => {
    draftCache.set(key, value);
    setCurrentMessage(value);
  };
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
      const next = [...(localOnlyCache.get(key) ?? []), newMessage];
      localOnlyCache.set(key, next);
      setLocalOnlyMessages(next);
      onSendMessage?.(currentMessage.trim());
    }

    updateDraft('');
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
        'fixed z-[60] flex flex-col border-white/20 bg-black/90 shadow-2xl backdrop-blur-xl',
        isMobile
          ? 'inset-x-0 bottom-[var(--meeting-dock-height)] top-auto h-[min(58dvh,440px)] w-full max-w-none rounded-t-3xl rounded-b-none border-b-0'
          : 'bottom-[calc(var(--meeting-stack-height)+0.5rem)] right-4 h-96 w-80 max-w-[calc(100vw-2rem)] sm:right-6'
      )}
    >
      {isMobile && (
        <div className="flex justify-center pt-2" aria-hidden>
          <span className="h-1 w-10 rounded-full bg-white/25" />
        </div>
      )}
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
          onChange={(e) => updateDraft(e.target.value)}
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
