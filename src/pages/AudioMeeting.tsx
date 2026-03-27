import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { AudioOnlyMeeting } from '@/components/AudioOnlyMeeting';
import { useAuth } from '@/hooks/useAuth';
import { useMeetingValidation } from '@/hooks/useMeetingValidation';
import { Loader2, Phone, PhoneOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export const AudioMeeting = () => {
  const { meetingId } = useParams<{ meetingId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const urlUserName = searchParams.get('userName') || searchParams.get('name') || '';
  const isHost = searchParams.get('host') === 'true';

  const [userName, setUserName] = useState<string>('');
  const [inputName, setInputName] = useState<string>('');
  const [isReady, setIsReady] = useState(false);
  const [hasJoined, setHasJoined] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  
  const { validateMeetingId } = useMeetingValidation();

  useEffect(() => {
    if (user && !userName && !urlUserName) {
      const name = user?.user_metadata?.display_name || user?.email || 'Guest';
      setUserName(name);
      setHasJoined(true);
    } else if (urlUserName && !userName) {
      setUserName(urlUserName);
      setHasJoined(true);
    }
  }, [user, urlUserName, userName]);

  useEffect(() => {
    if (meetingId) {
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
  }, [meetingId, validateMeetingId, navigate]);

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

  if (!hasJoined) {
    return (
      <div className="min-h-screen gradient-hero flex items-center justify-center p-4">
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-8 max-w-md w-full space-y-6">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-white mb-2">Join Audio Meeting</h2>
            <p className="text-zinc-400">Please enter your name to join</p>
          </div>

          <div className="space-y-4">
            <Input
              value={inputName}
              onChange={(e) => setInputName(e.target.value)}
              placeholder="Your Name"
              className="bg-zinc-800 border-zinc-700 text-white"
            />

            <div className="flex flex-col gap-3">
              <Button
                onClick={() => {
                  setUserName(inputName);
                  setHasJoined(true);
                }}
                className="w-full bg-primary hover:bg-primary/90 text-white"
                disabled={!inputName.trim()}
              >
                Join Meeting
              </Button>
              <Button
                onClick={handleNavigateToDashboard}
                variant="outline"
                className="w-full border-zinc-700 text-zinc-300 hover:bg-zinc-800"
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!meetingId || !isReady) {
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