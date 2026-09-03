import { useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Footer } from '@/components/Footer';
import { LandingBackground } from '@/components/landing/LandingBackground';
import { LandingHeader } from '@/components/landing/LandingHeader';
import { JoinMeetingHero } from '@/components/landing/JoinMeetingHero';
import { useAuth } from '@/hooks/useAuth';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { parseMeetingCodeFromInput } from '@/lib/meeting';

const Join = () => {
  const { meetingId: routeCode } = useParams<{ meetingId?: string }>();
  const navigate = useNavigate();
  const { user, profile, signOut } = useAuth();
  const meetingCode = routeCode ? parseMeetingCodeFromInput(routeCode) : '';

  useDocumentTitle(meetingCode ? `Join ${meetingCode}` : 'Join meeting');

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

  return (
    <div className="relative flex min-h-screen-safe flex-col overflow-x-clip bg-[#0a0a0a] text-white">
      <LandingBackground />
      <LandingHeader user={user} onSignOut={signOut} activeProduct="meeting" />

      <JoinMeetingHero
        user={user}
        meetingCode={meetingCode}
        defaultUserName={profile?.display_name || user?.email?.split('@')[0] || ''}
        onJoinMeeting={handleJoinMeeting}
      />

      <Footer className="relative z-10 border-white/10 bg-transparent" isAuthenticated={Boolean(user)} />
    </div>
  );
};

export default Join;
