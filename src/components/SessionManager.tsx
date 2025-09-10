
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
  const { user } = useAuth();
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
    if (user?.id && !hasCheckedSessionRef.current) {
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
            const isOnDashboard = currentPath === '/dashboard';
            const isOnAuth = currentPath === '/auth';
            const isOnRoot = currentPath === '/';
            
            // Only restore meeting session if:
            // 1. User is not already in a meeting
            // 2. It's been less than 2 seconds since page load (indicating a refresh, not intentional navigation)
            // 3. User is coming from root, auth, or dashboard after a refresh
            const isPageRefresh = timeSinceNavigation < 2000 || performance.navigation?.type === 1;
            
            if (!isInMeeting && isPageRefresh && (isOnRoot || isOnDashboard || isOnAuth)) {
              console.log('Restoring meeting session after page refresh:', meetingData);
              
              // Small delay to ensure auth state is settled
              setTimeout(() => {
                const targetPath = `/meeting/${meetingData.meetingId}`;
                const params = new URLSearchParams({
                  userName: meetingData.userName,
                  ...(meetingData.isHost && { host: 'true' })
                });
                
                navigate(`${targetPath}?${params.toString()}`, {
                  replace: true
                });
              }, 200);
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
  }, [user, navigate, location.pathname]);

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
