
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
    <Card className="glass-morphism hover:glass-morphism-elevated transition-all duration-300 border-border/40 hover:border-primary/30">
      <CardHeader className="pb-3 md:pb-4">
        <CardTitle className="flex items-center text-foreground text-base md:text-lg">
          <LogIn className="h-5 w-5 md:h-6 md:w-6 mr-2 text-primary" />
          Join Meeting
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 md:space-y-4">
        <div className="space-y-2">
          <label className="text-foreground text-xs md:text-sm font-medium">
            Your Name
          </label>
          <Input
            value={userName}
            onChange={(e) => setUserName(e.target.value)}
            placeholder="Enter your name"
            className="bg-background/50 border-border/50 text-foreground placeholder:text-muted-foreground focus:border-primary/50 focus:ring-primary/20 h-11 md:h-12"
          />
        </div>

        <div className="space-y-2">
          <label className="text-foreground text-xs md:text-sm font-medium">
            Meeting ID
          </label>
          <Input
            value={meetingId}
            onChange={(e) => setMeetingId(e.target.value.toUpperCase())}
            placeholder="Enter meeting ID"
            maxLength={8}
            className="bg-background/50 border-border/50 text-foreground placeholder:text-muted-foreground focus:border-primary/50 focus:ring-primary/20 font-mono h-11 md:h-12"
          />
        </div>

        <Button
          onClick={handleJoinMeeting}
          disabled={!meetingId.trim() || !userName.trim() || isJoining}
          variant="hero"
          size="default"
          className="w-full"
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
