import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export const useParticipantLocation = () => {
  const getLocationFromIP = useCallback(async (): Promise<{ country?: string; city?: string; ip?: string }> => {
    try {
      // Use the log-activity edge function with the special action for location info
      const { data, error } = await supabase.functions.invoke('log-activity', {
        body: {
          action: 'get_location_info',
          user_id: null // Just to get location data without logging
        }
      });

      if (error) {
        console.error('Error getting location:', error);
        return {};
      }

      return {
        country: data?.data?.country,
        city: data?.data?.city,
        ip: data?.data?.ip_address
      };
    } catch (error) {
      console.error('Failed to get location:', error);
      return {};
    }
  }, []);

  return {
    getLocationFromIP
  };
};