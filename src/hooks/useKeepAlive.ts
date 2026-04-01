import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

/**
 * A custom hook that periodically pings the Supabase database.
 * Supabase pauses free-tier projects after 7 days of inactivity.
 * By keeping a browser tab open, this hook will ensure the database
 * receives traffic and does not pause.
 */
export const useKeepAlive = (pingIntervalMinutes: number = 15) => {
  useEffect(() => {
    const pingDatabase = async () => {
      try {
        console.log('🔄 Pinging Supabase to keep project active...');
        // A very lightweight query just to register API activity
        // Querying a small table with a limit of 1 is virtually zero cost
        await supabase
          .from('profiles')
          .select('id')
          .limit(1)
          .maybeSingle();
      } catch (error) {
        console.error('Failed to ping Supabase:', error);
      }
    };

    // Ping immediately on mount
    pingDatabase();

    // Set up the interval
    const intervalMs = pingIntervalMinutes * 60 * 1000;
    const intervalId = setInterval(pingDatabase, intervalMs);

    return () => clearInterval(intervalId);
  }, [pingIntervalMinutes]);
};
