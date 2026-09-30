import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { useEffect, useState, useRef, useCallback } from 'react';
import { VideoConference } from '@/components/VideoConference';
import { MeetingLobby } from '@/components/meeting/MeetingLobby';
import { RegalWrapSheet } from '@/components/meeting/RegalWrapSheet';
import { useAuth } from '@/hooks/useAuth';
import { useMeetingValidation } from '@/hooks/useMeetingValidation';
import { usePlatformLogging } from '@/hooks/usePlatformLogging';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { Button } from '@/components/ui/button';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { ensureGuestOrUserSession } from '@/lib/guestAuth';
import { supabase } from '@/integrations/supabase/client';

const Meeting = () => {
  const { meetingId } = useParams<{ meetingId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, profile, loading } = useAuth();
  const [isReady, setIsReady] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [admitted, setAdmitted] = useState(false);
  const [showWrap, setShowWrap] = useState(false);
  const [wrapMeta, setWrapMeta] = useState<{ title?: string; startedAt: Date } | null>(null);
  const { validateMeetingId } = useMeetingValidation();
  const hasValidatedRef = useRef(false);
  const guestBootRef = useRef(false);
  const { logPageView, logMeetingJoin } = usePlatformLogging();

  const urlUserName = searchParams.get('userName') || searchParams.get('name') || '';
  const profileName = profile?.display_name?.trim() || user?.email?.split('@')[0] || '';
  const userName = urlUserName.trim() || profileName;
  const isHost = searchParams.get('host') === 'true';

  const handleAdmit = useCallback(() => setAdmitted(true), []);
  const handleLobbyCancel = useCallback(() => navigate('/', { replace: true }), [navigate]);

  useDocumentTitle(meetingId ? `Join ${meetingId}` : 'Meeting');

  useEffect(() => {
    if (isHost) setAdmitted(true);
  }, [isHost]);

  useEffect(() => {
    if (hasValidatedRef.current || !meetingId || loading) return;

    if (!userName.trim()) {
      navigate(`/join/${encodeURIComponent(meetingId)}`, { replace: true });
      return;
    }

    const validateAndProceed = async () => {
      setIsValidating(true);
      setValidationError(null);

      try {
        let activeUser = user;
        if (!activeUser) {
          const { data } = await supabase.auth.getSession();
          activeUser = data.session?.user ?? null;
        }
        if (!activeUser && !guestBootRef.current) {
          guestBootRef.current = true;
          await ensureGuestOrUserSession(userName);
          const { data } = await supabase.auth.getSession();
          activeUser = data.session?.user ?? null;
        }
        if (!activeUser) {
          navigate(`/join/${encodeURIComponent(meetingId)}`, { replace: true });
          return;
        }

        const isValid = await validateMeetingId(meetingId, true);

        if (isValid) {
          hasValidatedRef.current = true;
          sessionStorage.setItem('was-in-meeting', meetingId);
          void logPageView(`meeting/${meetingId}`, activeUser.id);
          void logMeetingJoin(meetingId, activeUser.id);
          setIsReady(true);
          setWrapMeta({ startedAt: new Date() });
        } else {
          setValidationError('Meeting not found or no longer active');
        }
      } catch {
        setValidationError('Failed to validate meeting. Please try again.');
      } finally {
        setIsValidating(false);
      }
    };

    void validateAndProceed();
  }, [
    meetingId,
    user,
    userName,
    loading,
    isHost,
    navigate,
    validateMeetingId,
    logPageView,
    logMeetingJoin,
  ]);

  const goDashboard = useCallback(() => {
    sessionStorage.removeItem('was-in-meeting');
    localStorage.removeItem('currentMeeting');
    navigate('/dashboard');
  }, [navigate]);

  const handleLeaveMeeting = useCallback(() => {
    sessionStorage.removeItem('was-in-meeting');
    localStorage.removeItem('currentMeeting');
    setShowWrap(true);
  }, []);

  const handleNavigateToDashboard = useCallback(() => {
    goDashboard();
  }, [goDashboard]);

  const handleRetry = useCallback(() => {
    hasValidatedRef.current = false;
    setValidationError(null);
    setIsReady(false);
    setIsValidating(true);
    window.location.reload();
  }, []);

  if (showWrap && meetingId) {
    return (
      <RegalWrapSheet
        meetingCode={meetingId}
        meetingTitle={wrapMeta?.title}
        startedAt={wrapMeta?.startedAt}
        onDone={goDashboard}
      />
    );
  }

  if (loading || isValidating) {
    return (
      <div className="min-h-screen-safe flex items-center justify-center bg-gradient-to-br from-[#0a0612] via-[#160a26] to-[#1a0d2e] px-4">
        <div className="text-center text-white max-w-sm">
          <div className="animate-spin w-10 h-10 border-4 border-orange-500/30 border-t-orange-400 rounded-full mx-auto mb-4" />
          <div className="text-lg font-semibold mb-1">
            {loading ? 'Loading…' : 'Joining meeting…'}
          </div>
          {isValidating && meetingId && (
            <p className="text-sm text-white/50 font-mono tracking-wider">{meetingId}</p>
          )}
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen-safe flex items-center justify-center bg-gradient-to-br from-[#0a0612] via-[#160a26] to-[#1a0d2e] px-4">
        <div className="text-center text-white">
          <div className="animate-spin w-10 h-10 border-4 border-orange-500/30 border-t-orange-400 rounded-full mx-auto mb-4" />
          <p className="text-white/70">Preparing guest session…</p>
        </div>
      </div>
    );
  }

  if (validationError) {
    return (
      <div className="min-h-screen-safe flex items-center justify-center bg-gradient-to-br from-[#0a0612] via-[#160a26] to-[#1a0d2e] px-4">
        <div className="text-center text-white max-w-md glass-morphism rounded-2xl p-8 border border-white/10">
          <h1 className="text-2xl font-bold mb-2">Couldn&apos;t join meeting</h1>
          <p className="text-white/60 mb-6">{validationError}</p>
          <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
            <Button onClick={handleRetry} className="bg-orange-500 hover:bg-orange-600">
              Try again
            </Button>
            <Button
              variant="outline"
              onClick={() => navigate('/dashboard')}
              className="border-white/20 text-white hover:bg-white/10"
            >
              Dashboard
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (!meetingId || !userName || !isReady) {
    return (
      <div className="min-h-screen-safe flex items-center justify-center bg-gradient-to-br from-[#0a0612] via-[#160a26] to-[#1a0d2e] px-4">
        <div className="text-center text-white">
          <h1 className="text-2xl font-bold mb-4">Invalid meeting link</h1>
          <p className="mb-6 text-white/60">Missing meeting information or validation failed.</p>
          <Button onClick={() => navigate('/dashboard')} className="bg-orange-500 hover:bg-orange-600">
            Return to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  if (!isHost && !admitted) {
    return (
      <MeetingLobby
        meetingId={meetingId}
        userId={user.id}
        userName={userName}
        onAdmit={handleAdmit}
        onCancel={handleLobbyCancel}
      />
    );
  }

  return (
    <ErrorBoundary>
      <VideoConference
        meetingId={meetingId}
        userName={userName}
        isHost={isHost}
        onLeaveMeeting={handleLeaveMeeting}
        onNavigateToDashboard={handleNavigateToDashboard}
      />
    </ErrorBoundary>
  );
};

export default Meeting;
