
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { LogIn, Loader2 } from 'lucide-react';
import { useMeetingValidation } from '@/hooks/useMeetingValidation';

interface QuickJoinCardProps {
  onJoinMeeting: (name: string, roomId: string, hostStatus?: boolean) => void;
}

export const QuickJoinCard = ({ onJoinMeeting }: QuickJoinCardProps) => {
  const [meetingId, setMeetingId] = useState('');
  const [userName, setUserName] = useState('');
  const [isJoining, setIsJoining] = useState(false);
  const { validateMeetingId } = useMeetingValidation();

  const handleJoinMeeting = async () => {
    if (!meetingId.trim() || !userName.trim()) {
      return;
    }

    setIsJoining(true);
    try {
      const isValid = await validateMeetingId(meetingId);
      if (isValid) {
        onJoinMeeting(userName, meetingId.toUpperCase());
      }
    } catch (error) {
      console.error('Error joining meeting:', error);
    } finally {
      setIsJoining(false);
    }
  };

  return (
    <Card className="bg-gradient-to-br from-slate-800/60 to-slate-900/60 backdrop-blur-xl border-slate-700/40 hover:border-orange-400/30 transition-all duration-300 shadow-xl">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center text-white">
          <LogIn className="h-6 w-6 mr-2 text-orange-400" />
          Join Meeting
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <label className="text-slate-200 text-sm font-medium">
            Your Name
          </label>
          <Input
            value={userName}
            onChange={(e) => setUserName(e.target.value)}
            placeholder="Enter your name"
            className="bg-slate-800/50 border-slate-600/50 text-white placeholder:text-slate-400 focus:border-orange-400/50 focus:ring-orange-400/20"
          />
        </div>

        <div className="space-y-2">
          <label className="text-slate-200 text-sm font-medium">
            Meeting ID
          </label>
          <Input
            value={meetingId}
            onChange={(e) => setMeetingId(e.target.value.toUpperCase())}
            placeholder="Enter meeting ID"
            maxLength={8}
            className="bg-slate-800/50 border-slate-600/50 text-white placeholder:text-slate-400 focus:border-orange-400/50 focus:ring-orange-400/20 font-mono"
          />
        </div>

        <Button
          onClick={handleJoinMeeting}
          disabled={!meetingId.trim() || !userName.trim() || isJoining}
          className="w-full bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white font-semibold transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50"
        >
          {isJoining ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Joining...
            </>
          ) : (
            <>
              <LogIn className="h-4 w-4 mr-2" />
              Join Meeting
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
};
