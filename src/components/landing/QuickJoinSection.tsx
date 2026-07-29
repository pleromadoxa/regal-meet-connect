
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { LogIn, Loader2, Hash } from 'lucide-react';
import { useMeetingValidation } from '@/hooks/useMeetingValidation';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { isPlausibleMeetingCode, normalizeMeetingCodeInput } from '@/lib/quickJoin';
import { cn } from '@/lib/utils';

interface QuickJoinSectionProps {
  onJoinMeeting: (name: string, roomId: string, hostStatus?: boolean) => void;
  initialMeetingId?: string;
  defaultUserName?: string;
  highlight?: boolean;
  variant?: 'default' | 'landing';
}

export const QuickJoinSection = ({
  onJoinMeeting,
  initialMeetingId = '',
  defaultUserName = '',
  highlight = false,
  variant = 'default',
}: QuickJoinSectionProps) => {
  const [meetingId, setMeetingId] = useState(initialMeetingId);
  const [userName, setUserName] = useState(defaultUserName);
  const [isJoining, setIsJoining] = useState(false);
  const { validateMeetingId } = useMeetingValidation();
  const { user } = useAuth();
  const { toast } = useToast();
  const isLanding = variant === 'landing';

  useEffect(() => {
    if (initialMeetingId) setMeetingId(initialMeetingId);
  }, [initialMeetingId]);

  useEffect(() => {
    if (defaultUserName) setUserName((prev) => prev || defaultUserName);
  }, [defaultUserName]);

  const handleJoinMeeting = async () => {
    if (!meetingId.trim() || !userName.trim()) return;

    const code = normalizeMeetingCodeInput(meetingId);
    if (!isPlausibleMeetingCode(code)) {
      toast({
        title: 'Invalid meeting code',
        description: 'Enter your 8-character meeting code or paste an invite link.',
        variant: 'destructive',
      });
      return;
    }

    setIsJoining(true);
    try {
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
    <section className={cn(!isLanding && 'py-12 md:py-20 px-4')}>
      <div className={cn(isLanding ? 'w-full' : 'max-w-4xl mx-auto')}>
        {!isLanding && (
          <div className="text-center mb-8 md:mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-3 md:mb-4">Join a Meeting</h2>
            <p className="text-lg md:text-xl text-slate-300">
              {highlight
                ? 'Enter your name to join the meeting you were invited to'
                : 'Enter a meeting ID or paste an invite link'}
            </p>
          </div>
        )}

        <div
          className={cn(
            'relative overflow-hidden rounded-2xl border transition-all duration-500',
            isLanding
              ? 'border-white/12 bg-white/[0.04] p-6 shadow-[0_20px_60px_rgba(0,0,0,0.4)] backdrop-blur-xl sm:p-8'
              : 'glass-morphism shadow-2xl border-border/40 max-w-md mx-auto',
            highlight && 'ring-2 ring-orange-400/50 shadow-orange-500/20'
          )}
        >
          {isLanding && (
            <div className="pointer-events-none absolute -right-20 -top-20 h-40 w-40 rounded-full bg-orange-500/20 blur-3xl" />
          )}

          <div className={cn('relative', isLanding && 'grid gap-5 sm:gap-6 md:grid-cols-2 lg:grid-cols-[1fr_1fr_auto] lg:items-end')}>
            {isLanding && (
              <div className="mb-1 flex items-center gap-2 md:col-span-2 lg:col-span-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-orange-500/15 text-orange-400">
                  <LogIn className="h-4 w-4" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">Quick join</h2>
                  <p className="text-xs text-white/45">Paste an invite link or enter your 8-character code</p>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <label className={cn('text-sm font-medium', isLanding ? 'text-white/80' : 'text-foreground')}>
                Your name
              </label>
              <Input
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                placeholder="How you'll appear in the call"
                className={cn(
                  'h-12',
                  isLanding
                    ? 'border-white/12 bg-black/25 text-white placeholder:text-white/30 focus-visible:ring-orange-500/40'
                    : 'bg-background/50 border-border/50 text-foreground placeholder:text-muted-foreground focus:border-primary/50 focus:ring-primary/20'
                )}
                autoFocus={highlight}
                onKeyDown={(e) => e.key === 'Enter' && handleJoinMeeting()}
              />
            </div>

            <div className="space-y-2">
              <label className={cn('text-sm font-medium', isLanding ? 'text-white/80' : 'text-foreground')}>
                Meeting ID or link
              </label>
              <div className="relative">
                <Hash className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-white/25" />
                <Input
                  value={meetingId}
                  onChange={(e) => setMeetingId(e.target.value)}
                  placeholder="ABC12XYZ or invite URL"
                  className={cn(
                    'h-12 pl-10 font-mono tracking-wide',
                    isLanding
                      ? 'border-white/12 bg-black/25 text-white placeholder:text-white/30 focus-visible:ring-orange-500/40'
                      : 'bg-background/50 border-border/50 text-foreground placeholder:text-muted-foreground focus:border-primary/50 focus:ring-primary/20 text-center text-base md:text-lg'
                  )}
                  onKeyDown={(e) => e.key === 'Enter' && handleJoinMeeting()}
                />
              </div>
            </div>

            <Button
              onClick={handleJoinMeeting}
              disabled={!meetingId.trim() || !userName.trim() || isJoining}
              variant={isLanding ? 'premium' : 'hero'}
              size="lg"
              className={cn(
                'w-full rounded-xl md:col-span-2 lg:col-span-1',
                isLanding && 'h-12 lg:min-w-[148px] shadow-[0_0_32px_rgba(255,107,53,0.25)]'
              )}
            >
              {isJoining ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Joining…
                </>
              ) : (
                <>
                  <LogIn className="h-5 w-5" />
                  Join now
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
};
