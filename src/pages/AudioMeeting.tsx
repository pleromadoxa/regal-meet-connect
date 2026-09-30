import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { AudioOnlyMeeting } from '@/components/AudioOnlyMeeting';
import { RegalWrapSheet } from '@/components/meeting/RegalWrapSheet';
import { useAuth } from '@/hooks/useAuth';
import { useMeetingValidation } from '@/hooks/useMeetingValidation';
import { Loader2, Phone, PhoneOff } from 'lucide-react';
import { Button } from '@/components/ui/button';

export const AudioMeeting = () => {
  const { meetingId } = useParams<{ meetingId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, profile, loading: authLoading } = useAuth();

  const urlUserName = searchParams.get('userName') || searchParams.get('name') || '';
  const profileName = profile?.display_name?.trim() || user?.email?.split('@')[0] || '';
  const userName = urlUserName.trim() || profileName;
  const isHost = searchParams.get('host') === 'true';
  const [isReady, setIsReady] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [showWrap, setShowWrap] = useState(false);
  const [wrapStartedAt] = useState(() => new Date());
  const hasValidatedRef = useRef(false);

  const { validateMeetingId } = useMeetingValidation();

  useEffect(() => {
    if (authLoading || !meetingId) return;
    if (hasValidatedRef.current) return;

    if (!userName.trim()) {
      navigate(`/join/${encodeURIComponent(meetingId)}`, { replace: true });
      return;
    }

    if (!user) {
      const returnPath = `/audio-meeting/${meetingId}?userName=${encodeURIComponent(userName)}${
        isHost ? '&host=true' : ''
      }`;
      navigate(`/auth?redirect=${encodeURIComponent(returnPath)}`, { replace: true });
      return;
    }

    hasValidatedRef.current = true;

    void validateMeetingId(meetingId)
      .then((isValid) => {
        if (isValid) {
          sessionStorage.setItem('was-in-meeting', meetingId);
          setIsReady(true);
        } else {
          setValidationError('Meeting not found or has ended');
        }
      })
      .catch(() => {
        setValidationError('Failed to validate meeting');
      });
  }, [meetingId, userName, user, authLoading, validateMeetingId, navigate, isHost]);

  const goDashboard = useCallback(() => {
    sessionStorage.removeItem('was-in-meeting');
    localStorage.removeItem(`meeting-${meetingId}`);
    localStorage.removeItem('currentMeeting');
    navigate('/dashboard');
  }, [meetingId, navigate]);

  const handleLeaveMeeting = () => {
    sessionStorage.removeItem('was-in-meeting');
    localStorage.removeItem(`meeting-${meetingId}`);
    localStorage.removeItem('currentMeeting');
    setShowWrap(true);
  };

  const handleNavigateToDashboard = () => {
    goDashboard();
  };

  if (showWrap && meetingId) {
    return (
      <RegalWrapSheet
        meetingCode={meetingId}
        startedAt={wrapStartedAt}
        onDone={goDashboard}
      />
    );
  }

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center gradient-hero">
        <Loader2 className="h-8 w-8 animate-spin text-white" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center gradient-hero">
        <div className="text-center">
          <Loader2 className="mx-auto mb-4 h-8 w-8 animate-spin text-white" />
          <p className="text-white">Redirecting to sign in…</p>
        </div>
      </div>
    );
  }

  if (!isReady && !validationError) {
    return (
      <div className="flex min-h-screen items-center justify-center gradient-hero">
        <div className="text-center">
          <Phone className="mx-auto mb-4 h-12 w-12 animate-pulse text-primary" />
          <Loader2 className="mx-auto mb-4 h-8 w-8 animate-spin text-white" />
          <p className="text-lg font-medium text-white">Connecting to audio meeting...</p>
          <p className="text-sm text-white/70">Meeting ID: {meetingId}</p>
        </div>
      </div>
    );
  }

  if (validationError) {
    return (
      <div className="flex min-h-screen items-center justify-center gradient-hero">
        <div className="max-w-md text-center">
          <PhoneOff className="mx-auto mb-4 h-12 w-12 text-red-400" />
          <h2 className="mb-4 text-2xl font-bold text-white">Invalid Audio Meeting</h2>
          <p className="mb-6 text-white/80">{validationError}</p>
          <Button
            onClick={handleNavigateToDashboard}
            variant="outline"
            className="border-white/20 bg-white/10 text-white hover:bg-white/20"
          >
            Return to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  if (!meetingId || !userName || !isReady) {
    return null;
  }

  return (
    <AudioOnlyMeeting
      meetingId={meetingId}
      userName={userName}
      isHost={isHost}
      onLeaveMeeting={handleLeaveMeeting}
      onNavigateToDashboard={handleNavigateToDashboard}
    />
  );
};
