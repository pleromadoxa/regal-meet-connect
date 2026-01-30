
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
    <section className="py-12 md:py-24 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8 md:mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-3 md:mb-4">
            Join Regal Meeting
          </h2>
          <p className="text-lg md:text-xl text-slate-300">
            Enter a meeting ID to join an ongoing Regal Meeting session
          </p>
        </div>

        <Card className="glass-morphism shadow-2xl border-border/40 max-w-md mx-auto">
          <CardHeader className="pb-4 md:pb-6">
            <CardTitle className="text-foreground flex items-center justify-center text-lg md:text-xl">
              <LogIn className="h-5 w-5 mr-2 text-primary" />
              Quick Join
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 md:space-y-6">
            <div className="space-y-2">
              <label className="text-foreground text-sm font-medium">
                Your Name
              </label>
              <Input
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                placeholder="Enter your name"
                className="bg-background/50 border-border/50 text-foreground placeholder:text-muted-foreground focus:border-primary/50 focus:ring-primary/20 h-12 md:h-14"
              />
            </div>

            <div className="space-y-2">
              <label className="text-foreground text-sm font-medium">
                Meeting ID
              </label>
              <Input
                value={meetingId}
                onChange={(e) => setMeetingId(e.target.value.toUpperCase())}
                placeholder="Enter 8-character meeting ID"
                maxLength={8}
                className="bg-background/50 border-border/50 text-foreground placeholder:text-muted-foreground focus:border-primary/50 focus:ring-primary/20 font-mono text-center text-base md:text-lg tracking-wider h-12 md:h-14"
              />
            </div>

            <Button
              onClick={handleJoinMeeting}
              disabled={!meetingId.trim() || !userName.trim() || isJoining}
              variant="hero"
              size="lg"
              className="w-full"
            >
              {isJoining ? (
                <>
                  <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                  Joining Meeting...
                </>
              ) : (
                <>
                  <LogIn className="h-5 w-5 mr-2" />
                  Join Regal Meeting
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>
    </section>
  );
};
