import React, { useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Crown, Mic, MicOff, Pin, PinOff, Search, User } from 'lucide-react';

interface ParticipantLite {
  id: string;
  name: string;
  isHost?: boolean;
  isMuted?: boolean;
  isLocal?: boolean;
  hasVideo?: boolean;
}

interface AllParticipantsSheetProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  participants: ParticipantLite[];
  pinnedIds: string[];
  onTogglePin: (id: string) => void;
  totalCount: number;
}

export const AllParticipantsSheet = ({
  open, onOpenChange, participants, pinnedIds, onTogglePin, totalCount
}: AllParticipantsSheetProps) => {
  const [q, setQ] = useState('');
  const filtered = participants.filter(p => p.name.toLowerCase().includes(q.toLowerCase()));

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="bg-[#202124] border-l border-white/10 text-white w-full sm:max-w-md p-0 flex flex-col">
        <SheetHeader className="px-4 py-3 border-b border-white/10">
          <SheetTitle className="text-white flex items-center gap-2">
            <User className="h-5 w-5" /> Participants
            <Badge variant="secondary" className="bg-white/10 text-white border-0 ml-2">{totalCount}</Badge>
          </SheetTitle>
        </SheetHeader>

        <div className="p-3 border-b border-white/10">
          <div className="relative">
            <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-white/50" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search participants"
              className="pl-9 bg-white/5 border-white/10 text-white placeholder:text-white/40"
            />
          </div>
        </div>

        <ScrollArea className="flex-1">
          <div className="p-2 space-y-1">
            {filtered.length === 0 && (
              <p className="text-center text-white/50 text-sm py-8">No participants match.</p>
            )}
            {filtered.map((p) => {
              const pinned = pinnedIds.includes(p.id);
              return (
                <div key={p.id} className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/5 group">
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-orange-500 to-purple-600 flex items-center justify-center text-sm font-semibold">
                    {p.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1">
                      <span className="text-sm font-medium truncate">
                        {p.name}{p.isLocal && <span className="text-white/50"> (You)</span>}
                      </span>
                      {p.isHost && <Crown className="h-3 w-3 text-yellow-400 shrink-0" />}
                    </div>
                    <div className="text-xs text-white/50 flex items-center gap-2">
                      {p.isMuted ? <><MicOff className="h-3 w-3" /> Muted</> : <><Mic className="h-3 w-3 text-green-400" /> Active</>}
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => onTogglePin(p.id)}
                    className="text-white/70 hover:bg-white/10 hover:text-white opacity-0 group-hover:opacity-100"
                  >
                    {pinned ? <PinOff className="h-4 w-4" /> : <Pin className="h-4 w-4" />}
                  </Button>
                </div>
              );
            })}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
};
