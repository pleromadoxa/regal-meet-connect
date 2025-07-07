
import { useEffect, useRef } from 'react';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { format } from 'date-fns';

interface Caption {
  id: string;
  meeting_id: string;
  participant_id: string;
  content: string;
  timestamp: string;
}

interface CaptionsDisplayProps {
  captions: Caption[];
  participants: Array<{ id: string; user_name: string }>;
  isVisible: boolean;
}

export const CaptionsDisplay = ({ captions, participants, isVisible }: CaptionsDisplayProps) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [captions]);

  if (!isVisible || captions.length === 0) return null;

  const getParticipantName = (participantId: string) => {
    const participant = participants.find(p => p.id === participantId);
    return participant?.user_name || 'Unknown';
  };

  return (
    <Card className="absolute bottom-20 left-4 right-4 sm:left-6 sm:right-6 max-w-2xl mx-auto bg-black/80 backdrop-blur-xl border-white/20 max-h-40">
      <ScrollArea className="h-full p-4" ref={scrollRef}>
        <div className="space-y-2">
          {captions.slice(-10).map((caption) => (
            <div key={caption.id} className="text-sm">
              <div className="flex items-center space-x-2 mb-1">
                <span className="text-blue-300 font-medium">
                  {getParticipantName(caption.participant_id)}
                </span>
                <span className="text-gray-400 text-xs">
                  {format(new Date(caption.timestamp), 'HH:mm:ss')}
                </span>
              </div>
              <p className="text-white leading-relaxed">{caption.content}</p>
            </div>
          ))}
        </div>
      </ScrollArea>
    </Card>
  );
};
