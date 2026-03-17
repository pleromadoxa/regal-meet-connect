
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Mic, MicOff, Video, VideoOff, MoreVertical, Hand } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Participant {
  id: string;
  user_name: string;
  is_host: boolean;
  is_muted: boolean;
  is_video_enabled: boolean;
  hand_raised?: boolean;
}

interface ParticipantsListProps {
  participants: Participant[];
}

export const ParticipantsList = ({ participants }: ParticipantsListProps) => {
  return (
    <div className="h-full flex flex-col bg-slate-900 border-l border-white/10">
      <div className="p-4 border-b border-white/10 flex items-center justify-between">
        <h2 className="text-white font-semibold">Participants ({participants.length})</h2>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1">
          {participants.map((participant) => (
            <div
              key={participant.id}
              className="flex items-center justify-between p-2 rounded-lg hover:bg-white/5 group transition-colors"
            >
              <div className="flex items-center space-x-3">
                <div className="relative">
                  <Avatar className="h-8 w-8 border border-white/10">
                    <AvatarFallback className="bg-slate-800 text-xs text-white">
                      {participant.user_name.substring(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  {participant.hand_raised && (
                    <div className="absolute -top-1 -right-1 bg-yellow-500 rounded-full p-0.5 animate-bounce">
                      <Hand className="h-2 w-2 text-black" />
                    </div>
                  )}
                </div>
                <div className="flex flex-col">
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-white font-medium">
                      {participant.user_name}
                    </span>
                    {participant.is_host && (
                      <Badge variant="secondary" className="bg-orange-500/10 text-orange-400 text-[10px] h-4 border-none">
                        Host
                      </Badge>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-1">
                <div className="p-1.5 rounded-full text-slate-400">
                  {participant.is_muted ? (
                    <MicOff className="h-3.5 w-3.5 text-red-400" />
                  ) : (
                    <Mic className="h-3.5 w-3.5 text-green-400" />
                  )}
                </div>
                <div className="p-1.5 rounded-full text-slate-400">
                  {participant.is_video_enabled ? (
                    <Video className="h-3.5 w-3.5 text-green-400" />
                  ) : (
                    <VideoOff className="h-3.5 w-3.5 text-red-400" />
                  )}
                </div>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
};
