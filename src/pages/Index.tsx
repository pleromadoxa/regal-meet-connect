
import { useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Footer } from '@/components/Footer';
import { LandingBackground } from '@/components/landing/LandingBackground';
import { LandingHeader } from '@/components/landing/LandingHeader';
import { LandingHero } from '@/components/landing/LandingHero';
import { LandingFeatures } from '@/components/landing/LandingFeatures';
import { LandingCta } from '@/components/landing/LandingCta';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { parseMeetingCodeFromInput } from '@/lib/meeting';

const Index = () => {
  const { user, signOut, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const joinCode = searchParams.get('join')?.trim() || '';

  useDocumentTitle();

  useEffect(() => {
    if (authLoading) return;
    if (joinCode) {
      navigate(`/join/${encodeURIComponent(parseMeetingCodeFromInput(joinCode))}`, { replace: true });
      return;
    }
    if (user) {
      navigate('/dashboard', { replace: true });
    }
  }, [user, joinCode, navigate, authLoading]);

  const handleJoinMeeting = useCallback(
    (name: string, roomId: string) => {
      const code = parseMeetingCodeFromInput(roomId);
      const params = new URLSearchParams({ userName: name });
      const meetingPath = `/meeting/${code}?${params.toString()}`;

      if (user) {
        navigate(meetingPath);
        return;
      }
      navigate(`/auth?redirect=${encodeURIComponent(meetingPath)}`);
    },
    [navigate, user]
  );

  if (authLoading || (user && !joinCode)) {
    return (
      <div className="min-h-screen-safe flex items-center justify-center bg-[#0a0612]">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-orange-500/30 border-t-orange-400" />
      </div>
    );
  }

  return (
    <div className="relative min-h-screen-safe overflow-x-clip bg-[#0a0612] text-white">
      <LandingBackground />

      <LandingHeader user={user} onSignOut={signOut} />

      <main>
        <LandingHero user={user} onJoinMeeting={handleJoinMeeting} />
        <LandingFeatures />
        <LandingCta isAuthenticated={Boolean(user)} />
      </main>

      <Footer className="border-white/10 bg-transparent" />
    </div>
  );
};

export default Index;
