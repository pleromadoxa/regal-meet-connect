import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { AudioOnlyMeeting } from '@/components/AudioOnlyMeeting';
import { useAuth } from '@/hooks/useAuth';
import { useMeetingValidation } from '@/hooks/useMeetingValidation';
import { Loader2, Phone, PhoneOff } from 'lucide-react';
import { Button } from '@/components/ui/button';

export const AudioMeeting = () => {
  const { meetingId } = useParams<{ meetingId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const userName = searchParams.get('userName') || '';
  const isHost = searchParams.get('host') === 'true';
  const [isReady, setIsReady] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  
  const { validateMeetingId } = useMeetingValidation();

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }

    if (meetingId && userName) {
      console.log('Validating audio meeting:', { meetingId, userName, isHost });
      validateMeetingId(meetingId)
        .then((isValid) => {
          console.log('Audio meeting validation result:', isValid);
          if (isValid) {
            setIsReady(true);
          } else {
            setValidationError('Meeting not found or has ended');
            setTimeout(() => {
              navigate('/dashboard');
            }, 3000);
          }
        })
        .catch((error) => {
          console.error('Audio meeting validation error:', error);
          setValidationError('Failed to validate meeting');
          setTimeout(() => {
            navigate('/dashboard');
          }, 3000);
        });
    }
  }, [meetingId, userName, user, validateMeetingId, navigate]);

  const handleLeaveMeeting = () => {
    console.log('Leaving audio meeting, clearing storage');
    localStorage.removeItem(`meeting-${meetingId}`);
    navigate('/dashboard');
  };

  const handleNavigateToDashboard = () => {
    console.log('Navigating to dashboard from audio meeting');
    localStorage.removeItem(`meeting-${meetingId}`);
    navigate('/dashboard');
  };

  if (!user) {
    return (
      <div className="min-h-screen gradient-hero flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-white" />
          <p className="text-white">Redirecting to authentication...</p>
        </div>
      </div>
    );
  }

  if (!isReady && !validationError) {
    return (
      <div className="min-h-screen gradient-hero flex items-center justify-center">
        <div className="text-center">
          <Phone className="h-12 w-12 mx-auto mb-4 text-primary animate-pulse" />
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-white" />
          <p className="text-white text-lg font-medium">Connecting to audio meeting...</p>
          <p className="text-white/70 text-sm">Meeting ID: {meetingId}</p>
        </div>
      </div>
    );
  }

  if (validationError) {
    return (
      <div className="min-h-screen gradient-hero flex items-center justify-center">
        <div className="text-center max-w-md">
          <PhoneOff className="h-12 w-12 mx-auto mb-4 text-red-400" />
          <h2 className="text-2xl font-bold text-white mb-4">Invalid Audio Meeting</h2>
          <p className="text-white/80 mb-6">{validationError}</p>
          <Button 
            onClick={handleNavigateToDashboard}
            variant="outline"
            className="bg-white/10 border-white/20 text-white hover:bg-white/20"
          >
            Return to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  if (!meetingId || !userName || !isReady) {
    return (
      <div className="min-h-screen gradient-hero flex items-center justify-center">
        <div className="text-center max-w-md">
          <PhoneOff className="h-12 w-12 mx-auto mb-4 text-red-400" />
          <h2 className="text-2xl font-bold text-white mb-4">Invalid Audio Meeting</h2>
          <p className="text-white/80 mb-6">
            Missing meeting information or meeting not ready.
          </p>
          <Button 
            onClick={handleNavigateToDashboard}
            variant="outline"
            className="bg-white/10 border-white/20 text-white hover:bg-white/20"
          >
            Return to Dashboard
          </Button>
        </div>
      </div>
    );
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