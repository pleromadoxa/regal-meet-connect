
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { LogIn, Loader2 } from 'lucide-react';
import { useMeetingValidation } from '@/hooks/useMeetingValidation';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { isPlausibleMeetingCode, normalizeMeetingCodeInput } from '@/lib/quickJoin';

interface QuickJoinCardProps {
  onJoinMeeting: (name: string, roomId: string, hostStatus?: boolean) => void;
  initialMeetingId?: string;
  defaultUserName?: string;
}

export const QuickJoinCard = ({
  onJoinMeeting,
  initialMeetingId = '',
  defaultUserName = '',
}: QuickJoinCardProps) => {
  const [meetingId, setMeetingId] = useState(initialMeetingId);
  const [userName, setUserName] = useState(defaultUserName);
  const [isJoining, setIsJoining] = useState(false);
  const { validateMeetingId } = useMeetingValidation();
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (initialMeetingId) setMeetingId(initialMeetingId);
  }, [initialMeetingId]);

  useEffect(() => {
    if (defaultUserName) setUserName((prev) => prev || defaultUserName);
  }, [defaultUserName]);

  const handleJoinMeeting = async () => {
    if (!meetingId.trim() || !userName.trim()) {
      return;
    }

    setIsJoining(true);
    try {
      const code = normalizeMeetingCodeInput(meetingId);
      if (!isPlausibleMeetingCode(code)) {
        toast({
          title: 'Invalid meeting code',
          description: 'Enter your meeting code or paste an invite link.',
          variant: 'destructive',
        });
        return;
      }

      if (user) {
        const isValid = await validateMeetingId(code);
        if (!isValid) return;
      }

      onJoinMeeting(userName.trim(), code);
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
            Meeting ID or link
          </label>
          <Input
            value={meetingId}
            onChange={(e) => setMeetingId(e.target.value)}
            placeholder="Code or meet.regalmesh.com/meeting/…"
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
