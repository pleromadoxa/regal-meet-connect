import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

/**
 * Pings Supabase periodically so the free-tier project doesn't pause.
 * Uses a lightweight session check (no DB row read).
 */
export const useKeepAlive = (intervalMs = 4 * 60 * 1000) => {
  useEffect(() => {
    const ping = () => {
      supabase.auth.getSession().catch(() => {});
    };
    ping();
    const id = window.setInterval(ping, intervalMs);
    return () => window.clearInterval(id);
  }, [intervalMs]);
};
