import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { useEffect, useState, useRef } from 'react';
import { VideoConference } from '@/components/VideoConference';
import { PreJoinScreen } from '@/components/meeting/PreJoinScreen';
import { useAuth } from '@/hooks/useAuth';
import { useMeetingValidation } from '@/hooks/useMeetingValidation';
import { usePlatformLogging } from '@/hooks/usePlatformLogging';

const Meeting = () => {
  const { meetingId } = useParams<{ meetingId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [isReady, setIsReady] = useState(false);
  const [isValidating, setIsValidating] = useState(true);
  const [hasJoined, setHasJoined] = useState(false);
  const [initialMediaState, setInitialMediaState] = useState({ video: true, audio: true });
  const [validationError, setValidationError] = useState<string | null>(null);
  const { validateMeetingId } = useMeetingValidation();
  const hasValidatedRef = useRef(false);
  const { logPageView, logMeetingJoin } = usePlatformLogging();

  const userName = searchParams.get('userName') || searchParams.get('name') || '';
  const isHost = searchParams.get('host') === 'true';

  useEffect(() => {
    // Prevent multiple validations 
    if (hasValidatedRef.current) return;
    
    if (!loading && meetingId) {
      // If no userName provided, redirect to join page with meeting ID
      if (!userName.trim()) {
        navigate(`/?join=${meetingId}`);
        return;
      }
      if (!user) {
        navigate('/auth');
        return;
      }

      // Mark as validating to prevent SessionManager conflicts
      hasValidatedRef.current = true;
      
      // Validate the meeting ID before proceeding
      const validateAndProceed = async () => {
        console.log('Validating meeting ID:', meetingId);
        setIsValidating(true);
        setValidationError(null);
        
        try {
          // Start validation immediately without waiting for auth
          const isValid = await validateMeetingId(meetingId, true); // Skip toast since we handle it here
          
          if (isValid) {
            console.log('Meeting ID is valid, proceeding to meeting');
            // Log meeting page view
            logPageView(`meeting/${meetingId}`, user?.id);
            if (meetingId) {
              logMeetingJoin(meetingId, user?.id);
            }
            setIsReady(true);
          } else {
            console.log('Meeting ID validation failed');
            setValidationError('Meeting not found or no longer active');
            
            // Redirect to dashboard after showing error
            setTimeout(() => {
              navigate('/dashboard', { replace: true });
            }, 3000);
          }
        } catch (error) {
          console.error('Error during meeting validation:', error);
          setValidationError('Failed to validate meeting. Please try again.');
          
          setTimeout(() => {
            navigate('/dashboard', { replace: true });
          }, 3000);
        } finally {
          setIsValidating(false);
        }
      };

      validateAndProceed();
    }
  }, [user, loading, navigate, meetingId, userName, validateMeetingId, logPageView, logMeetingJoin]);

  const handleLeaveMeeting = () => {
    // Clear meeting session when intentionally leaving
    localStorage.removeItem('currentMeeting');
    navigate('/dashboard');
  };

  const handleNavigateToDashboard = () => {
    // Clear meeting session when navigating to dashboard
    localStorage.removeItem('currentMeeting');
    navigate('/dashboard');
  };

  const handleJoin = (videoEnabled: boolean, audioEnabled: boolean, processedStream: MediaStream | null) => {
    setInitialMediaState({ video: videoEnabled, audio: audioEnabled });
    setHasJoined(true);
  };

  if (loading || isValidating) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-800 flex items-center justify-center">
        <div className="text-center text-white">
          <div className="animate-spin w-8 h-8 border-4 border-white border-t-transparent rounded-full mx-auto mb-4"></div>
          <div className="text-xl mb-2">
            {loading ? 'Loading...' : 'Validating meeting...'}
          </div>
          {isValidating && (
            <div className="text-sm opacity-75">
              Checking meeting ID: {meetingId}
            </div>
          )}
          {validationError && (
            <div className="text-red-300 text-sm mt-2">
              {validationError}
            </div>
          )}
        </div>
      </div>
    );
  }

  if (!meetingId || !userName || !isReady) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-800 flex items-center justify-center">
        <div className="text-center text-white">
          <h1 className="text-2xl font-bold mb-4">Invalid Meeting</h1>
          <p className="mb-4">Missing meeting information or meeting validation failed</p>
          <button 
            onClick={() => navigate('/dashboard')}
            className="bg-orange-500 hover:bg-orange-600 text-white px-6 py-2 rounded-lg"
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  if (!hasJoined) {
    return (
      <PreJoinScreen
        userName={userName}
        meetingId={meetingId}
        onJoin={handleJoin}
        onCancel={handleNavigateToDashboard}
      />
    );
  }

  return (
    <VideoConference
      meetingId={meetingId}
      userName={userName}
      isHost={isHost}
      initialVideoEnabled={initialMediaState.video}
      initialAudioEnabled={initialMediaState.audio}
      onLeaveMeeting={handleLeaveMeeting}
      onNavigateToDashboard={handleNavigateToDashboard}
    />
  );
};

export default Meeting;