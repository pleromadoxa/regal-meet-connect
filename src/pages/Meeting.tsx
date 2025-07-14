
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { VideoConference } from '@/components/VideoConference';
import { useAuth } from '@/hooks/useAuth';
import { useMeetingValidation } from '@/hooks/useMeetingValidation';

const Meeting = () => {
  const { meetingId } = useParams<{ meetingId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [isReady, setIsReady] = useState(false);
  const [isValidating, setIsValidating] = useState(true);
  const { validateMeetingId } = useMeetingValidation();

  const userName = searchParams.get('userName') || '';
  const isHost = searchParams.get('host') === 'true';

  useEffect(() => {
    if (!loading && meetingId && userName) {
      if (!user) {
        navigate('/auth');
        return;
      }

      // Validate the meeting ID before proceeding
      const validateAndProceed = async () => {
        console.log('Validating meeting ID:', meetingId);
        setIsValidating(true);
        
        try {
          const isValid = await validateMeetingId(meetingId);
          if (isValid) {
            console.log('Meeting ID is valid, proceeding to meeting');
            setIsReady(true);
          } else {
            console.log('Meeting ID validation failed');
            // Validation failed, user will see error toast from useMeetingValidation
            // Redirect to dashboard after a short delay
            setTimeout(() => {
              navigate('/dashboard');
            }, 2000);
          }
        } catch (error) {
          console.error('Error during meeting validation:', error);
          navigate('/dashboard');
        } finally {
          setIsValidating(false);
        }
      };

      validateAndProceed();
    }
  }, [user, loading, navigate, meetingId, userName, validateMeetingId]);

  const handleLeaveMeeting = () => {
    navigate('/dashboard');
  };

  const handleNavigateToDashboard = () => {
    navigate('/dashboard');
  };

  if (loading || isValidating) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-800 flex items-center justify-center">
        <div className="text-white text-xl">
          {loading ? 'Loading...' : 'Validating meeting...'}
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

  return (
    <VideoConference
      meetingId={meetingId}
      userName={userName}
      isHost={isHost}
      onLeaveMeeting={handleLeaveMeeting}
      onNavigateToDashboard={handleNavigateToDashboard}
    />
  );
};

export default Meeting;
