
import { useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';

interface StoredMeeting {
  meetingId: string;
  userName: string;
  isHost: boolean;
  userId: string;
  timestamp: number;
}

export const SessionManager = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user?.id) {
      const storedMeeting = localStorage.getItem('currentMeeting');
      
      if (storedMeeting) {
        try {
          const meetingData: StoredMeeting = JSON.parse(storedMeeting);
          const timeElapsed = Date.now() - meetingData.timestamp;
          const sessionTimeout = 4 * 60 * 60 * 1000; // 4 hours
          
          // Check if session is still valid and user matches
          if (timeElapsed < sessionTimeout && meetingData.userId === user.id) {
            console.log('Resuming previous meeting session:', meetingData);
            // Only navigate if not already in a meeting
            if (!window.location.pathname.includes('/meeting/')) {
              // Navigate back to the meeting
              navigate(`/meeting/${meetingData.meetingId}?userName=${encodeURIComponent(meetingData.userName)}&isHost=${meetingData.isHost}`);
            }
          } else {
            // Clear expired session
            localStorage.removeItem('currentMeeting');
          }
        } catch (error) {
          console.error('Error parsing stored meeting data:', error);
          localStorage.removeItem('currentMeeting');
        }
      }
    }
  }, [user, navigate]);

  return null;
};
