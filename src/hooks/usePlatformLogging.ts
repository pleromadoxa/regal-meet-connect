import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface LogActivityOptions {
  includeLocation?: boolean;
  metadata?: Record<string, any>;
}

export const usePlatformLogging = () => {
  const logActivity = useCallback(async (
    action: string, 
    userId?: string,
    options: LogActivityOptions = {}
  ) => {
    try {
      // Use the enhanced edge function for logging
      const { data, error } = await supabase.functions.invoke('log-activity', {
        body: {
          action,
          user_id: userId,
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
  }, []);

  // Common logging functions for specific actions
  const logUserSignIn = useCallback((userId?: string) => {
    return logActivity('user_sign_in', userId);
  }, [logActivity]);

  const logUserSignOut = useCallback((userId?: string) => {
    return logActivity('user_sign_out', userId);
  }, [logActivity]);

  const logMeetingJoin = useCallback((meetingId: string, userId?: string) => {
    return logActivity('meeting_join', userId, { 
      metadata: { meetingId } 
    });
  }, [logActivity]);

  const logMeetingCreate = useCallback((meetingId: string, userId?: string) => {
    return logActivity('meeting_create', userId, { 
      metadata: { meetingId } 
    });
  }, [logActivity]);

  const logMeetingLeave = useCallback((meetingId: string, userId?: string) => {
    return logActivity('meeting_leave', userId, { 
      metadata: { meetingId } 
    });
  }, [logActivity]);

  const logPageView = useCallback((page: string, userId?: string) => {
    return logActivity('page_view', userId, { 
      metadata: { page } 
    });
  }, [logActivity]);

  const logFeatureUsage = useCallback((feature: string, userId?: string) => {
    return logActivity('feature_usage', userId, { 
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