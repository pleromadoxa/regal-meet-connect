import { useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

interface LogActivityOptions {
  includeLocation?: boolean;
  metadata?: Record<string, any>;
}

export const usePlatformLogging = () => {
  const { user } = useAuth();

  const logActivity = useCallback(async (
    action: string, 
    options: LogActivityOptions = {}
  ) => {
    try {
      // Use the enhanced edge function for logging
      const { data, error } = await supabase.functions.invoke('log-activity', {
        body: {
          action,
          user_id: user?.id,
          ...options
        }
      });

      if (error) {
        console.error('Error logging activity:', error);
        return false;
      }

      console.log('Activity logged:', data);
      return true;
    } catch (error) {
      console.error('Failed to log activity:', error);
      return false;
    }
  }, [user]);

  // Common logging functions for specific actions
  const logUserSignIn = useCallback(() => {
    return logActivity('user_sign_in');
  }, [logActivity]);

  const logUserSignOut = useCallback(() => {
    return logActivity('user_sign_out');
  }, [logActivity]);

  const logMeetingJoin = useCallback((meetingId: string) => {
    return logActivity('meeting_join', { 
      metadata: { meetingId } 
    });
  }, [logActivity]);

  const logMeetingCreate = useCallback((meetingId: string) => {
    return logActivity('meeting_create', { 
      metadata: { meetingId } 
    });
  }, [logActivity]);

  const logMeetingLeave = useCallback((meetingId: string) => {
    return logActivity('meeting_leave', { 
      metadata: { meetingId } 
    });
  }, [logActivity]);

  const logPageView = useCallback((page: string) => {
    return logActivity('page_view', { 
      metadata: { page } 
    });
  }, [logActivity]);

  const logFeatureUsage = useCallback((feature: string) => {
    return logActivity('feature_usage', { 
      metadata: { feature } 
    });
  }, [logActivity]);

  return {
    logActivity,
    logUserSignIn,
    logUserSignOut,
    logMeetingJoin,
    logMeetingCreate,
    logMeetingLeave,
    logPageView,
    logFeatureUsage
  };
};