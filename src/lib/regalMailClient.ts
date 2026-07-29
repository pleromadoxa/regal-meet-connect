import { createClient } from '@supabase/supabase-js';
import {
  REGAL_MAIL_SUPABASE_PROJECT_REF,
  REGAL_MAIL_SUPABASE_URL,
} from '@/constants/regalMailProduct';
import { supabase } from '@/integrations/supabase/client';

const regalMailAnonKey = import.meta.env.VITE_REGAL_MAIL_SUPABASE_ANON_KEY as string | undefined;
const mainSupabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;

function supabaseProjectRef(url: string | undefined): string | null {
  if (!url) return null;
  const match = url.replace(/\/$/, '').match(/https:\/\/([^.]+)\.supabase\.co$/);
  return match?.[1] ?? null;
}

export const isRegalMailConfigured = Boolean(
  REGAL_MAIL_SUPABASE_URL && regalMailAnonKey?.trim()
);

/** Meeting and Regal Mail share one Supabase project — no bridge needed. */
export function isUnifiedRegalMailSupabase(): boolean {
  if (!isRegalMailConfigured) return false;

  const mainRef = supabaseProjectRef(mainSupabaseUrl);
  if (mainRef) {
    return mainRef === REGAL_MAIL_SUPABASE_PROJECT_REF;
  }

  // Regal Mail uses the shared project by default; skip bridge unless Meeting explicitly points elsewhere.
  return true;
}

/** Isolated Supabase client for Regal Mail when projects differ; otherwise main client. */
export const regalMailSupabase = isRegalMailConfigured
  ? createClient(REGAL_MAIL_SUPABASE_URL, regalMailAnonKey!, {
      auth: {
        storageKey: 'regal-mail-auth',
        storage: localStorage,
        persistSession: true,
        autoRefreshToken: true,
      },
    })
  : null;

export function regalMailAuthClient() {
  if (isUnifiedRegalMailSupabase()) return supabase;
  return regalMailSupabase;
}
