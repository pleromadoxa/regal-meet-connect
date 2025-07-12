
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LogIn, Loader2 } from 'lucide-react';
import { useMeetingValidation } from '@/hooks/useMeetingValidation';

interface QuickJoinSectionProps {
  onJoinMeeting: (name: string, roomId: string, hostStatus?: boolean) => void;
}

export const QuickJoinSection = ({ onJoinMeeting }: QuickJoinSectionProps) => {
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
    <section className="py-24 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold text-white mb-4">
            Join a Meeting
          </h2>
          <p className="text-xl text-slate-300">
            Enter a meeting ID to join an ongoing conference
          </p>
        </div>

        <Card className="bg-slate-900/40 backdrop-blur-xl border-slate-700/40 shadow-2xl max-w-md mx-auto">
          <CardHeader>
            <CardTitle className="text-white flex items-center justify-center">
              <LogIn className="h-5 w-5 mr-2 text-orange-400" />
              Quick Join
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
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
                placeholder="Enter 8-character meeting ID"
                maxLength={8}
                className="bg-slate-800/50 border-slate-600/50 text-white placeholder:text-slate-400 focus:border-orange-400/50 focus:ring-orange-400/20 font-mono text-center text-lg tracking-wider"
              />
            </div>

            <Button
              onClick={handleJoinMeeting}
              disabled={!meetingId.trim() || !userName.trim() || isJoining}
              className="w-full bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white font-semibold py-3 rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50"
            >
              {isJoining ? (
                <>
                  <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                  Joining Meeting...
                </>
              ) : (
                <>
                  <LogIn className="h-5 w-5 mr-2" />
                  Join Meeting
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>
    </section>
  );
};
