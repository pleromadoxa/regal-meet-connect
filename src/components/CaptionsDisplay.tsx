
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
  currentTranscript?: string;
}

export const CaptionsDisplay = ({ captions, participants, isVisible, currentTranscript }: CaptionsDisplayProps) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [captions, currentTranscript]);

  if (!isVisible) return null;

  const getParticipantName = (participantId: string) => {
    const participant = participants.find(p => p.id === participantId);
    return participant?.user_name || 'Unknown User';
  };

  return (
    <Card className="fixed bottom-20 sm:bottom-24 left-4 right-4 sm:left-6 sm:right-6 max-w-2xl mx-auto bg-black/90 backdrop-blur-xl border-white/20 max-h-32 sm:max-h-40 z-40">
      <ScrollArea className="h-full p-3 sm:p-4" ref={scrollRef}>
        <div className="space-y-2">
          {captions.length === 0 && !currentTranscript ? (
            <div className="text-center py-4">
              <p className="text-gray-400 italic text-xs sm:text-sm">
                Captions will appear here when participants speak...
              </p>
              <p className="text-gray-500 text-xs mt-1">
                Make sure to allow microphone access and speak clearly.
              </p>
            </div>
          ) : (
            <>
              {captions.slice(-8).map((caption) => (
                <div key={caption.id} className="text-sm">
                  <div className="flex items-center space-x-2 mb-1">
                    <span className="text-blue-300 font-medium text-xs sm:text-sm">
                      {getParticipantName(caption.participant_id)}
                    </span>
                    <span className="text-gray-400 text-xs">
                      {format(new Date(caption.timestamp), 'HH:mm:ss')}
                    </span>
                  </div>
                  <p className="text-white leading-relaxed text-xs sm:text-sm">
                    {caption.content}
                  </p>
                </div>
              ))}
              
              {/* Show current/interim transcript */}
              {currentTranscript && (
                <div className="text-sm border-t border-white/10 pt-2 mt-2">
                  <div className="flex items-center space-x-2 mb-1">
                    <span className="text-blue-300 font-medium text-xs sm:text-sm">
                      You (speaking...)
                    </span>
                    <span className="text-gray-400 text-xs">
                      {format(new Date(), 'HH:mm:ss')}
                    </span>
                  </div>
                  <p className="text-gray-300 leading-relaxed text-xs sm:text-sm italic">
                    {currentTranscript}
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      </ScrollArea>
    </Card>
  );
};
