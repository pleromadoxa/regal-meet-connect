import { useCallback, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Footer } from '@/components/Footer';
import { LandingBackground } from '@/components/landing/LandingBackground';
import { LandingHeader } from '@/components/landing/LandingHeader';
import { JoinMeetingHero } from '@/components/landing/JoinMeetingHero';
import { useAuth } from '@/hooks/useAuth';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { useToast } from '@/hooks/use-toast';
import { ensureGuestOrUserSession } from '@/lib/guestAuth';
import { parseMeetingCodeFromInput } from '@/lib/meeting';

const Join = () => {
  const { meetingId: routeCode } = useParams<{ meetingId?: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, profile, signOut } = useAuth();
  const { toast } = useToast();
  const [joining, setJoining] = useState(false);
  const meetingCode = routeCode ? parseMeetingCodeFromInput(routeCode) : '';
  const prefillName = searchParams.get('prefillName')?.trim() || '';

  useDocumentTitle(meetingCode ? `Join ${meetingCode}` : 'Join meeting');

  const handleJoinMeeting = useCallback(
    async (name: string, roomId: string) => {
      const code = parseMeetingCodeFromInput(roomId);
      if (!code) {
        toast({
          title: 'Meeting code required',
          description: 'Enter a valid meeting ID or invite link.',
          variant: 'destructive',
        });
        return;
      }
      const displayName = name.trim();
      if (!displayName) {
        toast({
          title: 'Name required',
          description: 'Enter the name you want others to see.',
          variant: 'destructive',
        });
        return;
      }

      setJoining(true);
      try {
        await ensureGuestOrUserSession(displayName);
        const params = new URLSearchParams({ userName: displayName });
        navigate(`/meeting/${code}?${params.toString()}`);
      } catch (err) {
        toast({
          title: 'Could not join',
          description: err instanceof Error ? err.message : 'Please try again.',
          variant: 'destructive',
        });
      } finally {
        setJoining(false);
      }
    },
    [navigate, toast],
  );

  return (
    <div className="relative flex min-h-screen-safe flex-col overflow-x-clip bg-[#0a0a0a] text-white">
      <LandingBackground />
      <LandingHeader user={user} onSignOut={signOut} activeProduct="meeting" />

      <JoinMeetingHero
        user={user}
        meetingCode={meetingCode}
        defaultUserName={
          prefillName || profile?.display_name || user?.email?.split('@')[0] || ''
        }
        onJoinMeeting={handleJoinMeeting}
        joining={joining}
      />

      <Footer className="relative z-10 border-white/10 bg-transparent" isAuthenticated={Boolean(user)} />
    </div>
  );
};

export default Join;
