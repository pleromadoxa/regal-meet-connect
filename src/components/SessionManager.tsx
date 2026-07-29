
import { useEffect, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate, useLocation } from 'react-router-dom';

interface StoredMeeting {
  meetingId: string;
  userName: string;
  isHost: boolean;
  userId: string;
  timestamp: number;
}

export const SessionManager = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const hasCheckedSessionRef = useRef(false);
  const navigationTimeRef = useRef<number>(0);

  useEffect(() => {
    // Track when navigation happens intentionally
    const handleBeforeUnload = () => {
      navigationTimeRef.current = Date.now();
    };

    const handlePopState = () => {
      navigationTimeRef.current = Date.now();
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('popstate', handlePopState);
    };
  }, []);

  useEffect(() => {
    // Only check session once per app load and only for authenticated users
    if (!authLoading && user?.id && !hasCheckedSessionRef.current) {
      hasCheckedSessionRef.current = true;
      
      const storedMeeting = localStorage.getItem('currentMeeting');
      
      if (storedMeeting) {
        try {
          const meetingData: StoredMeeting = JSON.parse(storedMeeting);
          const timeElapsed = Date.now() - meetingData.timestamp;
          const sessionTimeout = 4 * 60 * 60 * 1000; // 4 hours
          const timeSinceNavigation = Date.now() - navigationTimeRef.current;
          
          // Check if session is still valid and user matches
          if (timeElapsed < sessionTimeout && meetingData.userId === user.id) {
            const currentPath = location.pathname;
            const isInMeeting = currentPath.includes('/meeting/');

            // Restore after refresh: same meeting URL, or landing/dashboard/auth within session window
            const isPageRefresh =
              timeSinceNavigation < 3000 ||
              (typeof performance !== 'undefined' &&
                'navigation' in performance &&
                (performance as Performance & { navigation?: { type?: number } }).navigation?.type === 1);

            if (isInMeeting && isPageRefresh) {
              const targetPath = `/meeting/${meetingData.meetingId}`;
              const params = new URLSearchParams({
                userName: meetingData.userName,
                ...(meetingData.isHost && { host: 'true' }),
              });
              if (currentPath !== targetPath.split('?')[0]) {
                navigate(`${targetPath}?${params.toString()}`, { replace: true });
              }
            } else if (!isPageRefresh) {
              console.log('Skipping session restore - user navigated intentionally');
            }
          } else {
            // Clear expired or invalid session
            console.log('Clearing expired meeting session');
            localStorage.removeItem('currentMeeting');
          }
        } catch (error) {
          console.error('Error parsing stored meeting data:', error);
          localStorage.removeItem('currentMeeting');
        }
      }
    }
  }, [user, authLoading, navigate, location.pathname]);

  // Clear session when user signs out
  useEffect(() => {
    if (!user && hasCheckedSessionRef.current) {
      // User has signed out, clear all meeting data
      hasCheckedSessionRef.current = false;
      localStorage.removeItem('currentMeeting');
      localStorage.removeItem('recentMeetings');
      console.log('User signed out, cleared all meeting sessions');
    }
  }, [user]);

  return null;
};
