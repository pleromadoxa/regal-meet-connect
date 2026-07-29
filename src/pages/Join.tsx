
import { useCallback } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Footer } from '@/components/Footer';
import { QuickJoinSection } from '@/components/landing/QuickJoinSection';
import { useAuth } from '@/hooks/useAuth';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { PRODUCT_NAME } from '@/constants/site';
import { parseMeetingCodeFromInput } from '@/lib/meeting';
import logo from '@/assets/regal-logo.png';

const Join = () => {
  const { meetingId: routeCode } = useParams<{ meetingId?: string }>();
  const navigate = useNavigate();
  const { user, profile } = useAuth();
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
    <div className="min-h-screen-safe bg-gradient-to-br from-slate-900 via-purple-900 to-slate-800 flex flex-col">
      <header className="container mx-auto px-4 py-4 sm:px-6 md:py-6 safe-area-inset-top">
        <div className="flex items-center justify-between">
          <Link
            to="/"
            className="flex items-center gap-2 text-white/70 hover:text-white transition-colors text-sm font-medium"
          >
            <ArrowLeft className="h-4 w-4" />
            Home
          </Link>
          <div className="flex items-center gap-2">
            <img src={logo} alt={PRODUCT_NAME} className="h-8 w-8" />
            <span className="font-bold text-white">{PRODUCT_NAME}</span>
          </div>
        </div>
      </header>

      <div className="flex-1 flex items-center px-4 sm:px-6">
        <QuickJoinSection
          onJoinMeeting={handleJoinMeeting}
          initialMeetingId={meetingCode}
          defaultUserName={profile?.display_name || user?.email?.split('@')[0] || ''}
          highlight={Boolean(meetingCode)}
        />
      </div>

      <Footer />
    </div>
  );
};

export default Join;
