
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Video } from 'lucide-react';

interface QuickJoinCardProps {
  meetingId: string;
  onSetMeetingId: (id: string) => void;
  onJoinMeeting: () => void;
}

export const QuickJoinCard = ({
  meetingId,
  onSetMeetingId,
  onJoinMeeting
}: QuickJoinCardProps) => {
  return (
    <Card className="bg-gradient-to-br from-blue-600/20 to-purple-600/20 backdrop-blur-xl border-blue-400/30 shadow-2xl">
      <CardHeader className="pb-4">
        <CardTitle className="text-white flex items-center text-lg">
          <Video className="h-6 w-6 mr-3 text-blue-300" />
          Quick Join Meeting
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <label className="text-sm font-medium text-white/90 mb-2 block">Meeting ID</label>
          <Input
            value={meetingId}
            onChange={(e) => onSetMeetingId(e.target.value)}
            placeholder="Enter meeting ID..."
            className="bg-white/20 border-white/30 text-white placeholder-white/60 focus:border-blue-400/60 focus:ring-2 focus:ring-blue-400/20 transition-all duration-200"
          />
        </div>
        <Button
          onClick={onJoinMeeting}
          className="w-full h-16 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-semibold text-xl shadow-lg hover:shadow-xl transform hover:scale-[1.02] transition-all duration-200 border-0"
        >
          <Video className="h-8 w-8 mr-4" />
          Join Meeting Now
        </Button>
      </CardContent>
    </Card>
  );
};
