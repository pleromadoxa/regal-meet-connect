import {
  isRegalMailEmail,
  normalizeRegalMailInput,
  regalMailRedirectUrl,
  REGAL_MAIL_DOMAIN,
} from '@/constants/regalMail';
import {
  isRegalMailConfigured,
  isUnifiedRegalMailSupabase,
  regalMailAuthClient,
  regalMailSupabase,
} from '@/lib/regalMailClient';
import { supabase } from '@/integrations/supabase/client';
import { extractRegalMailProfileFromMetadata } from '@/utils/regalMailProfile';
import {
  canSendRegalMailMagicLink,
  markRegalMailMagicLinkSent,
  regalMailMagicLinkCooldownSeconds,
} from '@/utils/regalMailMagicLinkThrottle';

export function isRegalMailAuthAvailable(): boolean {
  return isRegalMailConfigured;
}

function mapRegalMailAuthError(message: string): string {
  const lower = message.toLowerCase();
  if (lower.includes('invalid login credentials') || lower.includes('invalid email or password')) {
    return 'Incorrect Regal Mail email or password.';
  }
  if (lower.includes('email not confirmed')) {
    return 'Confirm your Regal Mail address first, or use a magic link to verify.';
  }
  if (lower.includes('too many requests')) {
    return 'Too many attempts. Wait a moment and try again.';
  }
  if (lower.includes('not configured')) {
    return 'Regal Mail sign-in is not fully configured. Contact your administrator.';
  }
  if (lower.includes('failed to send a request to the edge function')) {
    return 'Regal Mail sign-in could not reach the server. Refresh and try again, or use a magic link.';
  }
  if (lower.includes('edge function returned a non-2xx')) {
    return 'Regal Mail sign-in service is temporarily unavailable. Try again in a moment.';
  }
  return message;
}

async function bridgeRegalMailToMeeting(accessToken: string): Promise<void> {
  if (isUnifiedRegalMailSupabase()) {
    return;
  }

  const { data, error } = await supabase.functions.invoke('regal-mail-bridge', {
    body: { accessToken },
  });

  if (error) {
    throw new Error(mapRegalMailAuthError(error.message || 'Regal Mail bridge failed'));
  }

  const payload = data as {
    error?: string;
    email?: string;
    token_hash?: string;
  };

  if (payload?.error) {
    throw new Error(mapRegalMailAuthError(payload.error));
  }

  if (!payload?.email || !payload?.token_hash) {
    throw new Error('Regal Mail sign-in succeeded but no meeting session was returned.');
  }

  const { error: verifyError } = await supabase.auth.verifyOtp({
    email: payload.email,
    token_hash: payload.token_hash,
    type: 'email',
  });

  if (verifyError) {
    throw new Error(mapRegalMailAuthError(verifyError.message));
  }
}

async function exchangeRegalMailSession(accessToken: string): Promise<void> {
  const client = regalMailAuthClient();
  if (!client) {
    throw new Error('Regal Mail is not configured.');
  }

  if (isUnifiedRegalMailSupabase()) {
    const { data, error } = await client.auth.getUser(accessToken);
    if (error) throw new Error(mapRegalMailAuthError(error.message));

    const email = data.user?.email?.toLowerCase() ?? '';
    if (!isRegalMailEmail(email)) {
      await client.auth.signOut();
      throw new Error('This account is not a Regal Mail address.');
    }

    extractRegalMailProfileFromMetadata(
      data.user?.user_metadata as Record<string, unknown> | undefined,
      email
    );
    return;
  }

  if (!regalMailSupabase) {
    throw new Error('Regal Mail is not configured.');
  }

  const { data, error } = await regalMailSupabase.auth.getUser(accessToken);
  if (error) throw new Error(mapRegalMailAuthError(error.message));

  const email = data.user?.email?.toLowerCase() ?? '';
  if (!isRegalMailEmail(email)) {
    await regalMailSupabase.auth.signOut();
    throw new Error('This account is not a Regal Mail address.');
  }

  extractRegalMailProfileFromMetadata(
    data.user?.user_metadata as Record<string, unknown> | undefined,
    email
  );

  try {
    await bridgeRegalMailToMeeting(accessToken);
  } finally {
    await regalMailSupabase.auth.signOut();
  }
}

export async function sendRegalMailMagicLink(email: string): Promise<void> {
  const client = regalMailAuthClient();
  if (!client) {
    throw new Error('Regal Mail is not configured. Set VITE_REGAL_MAIL_SUPABASE_ANON_KEY.');
  }

  const normalized = normalizeRegalMailInput(email);
  if (!normalized || !isRegalMailEmail(normalized)) {
    throw new Error(`Regal Mail sign-in requires a @${REGAL_MAIL_DOMAIN} address.`);
  }

  if (!canSendRegalMailMagicLink()) {
    const seconds = regalMailMagicLinkCooldownSeconds();
    throw new Error(`Wait ${seconds}s before requesting another magic link.`);
  }

  const { error } = await client.auth.signInWithOtp({
    email: normalized,
    options: {
      emailRedirectTo: regalMailRedirectUrl('/auth', {
        redirect:
          typeof window !== 'undefined'
            ? new URLSearchParams(window.location.search).get('redirect')
            : null,
      }),
      shouldCreateUser: true,
    },
  });

  if (error) throw new Error(mapRegalMailAuthError(error.message));
  markRegalMailMagicLinkSent();
}

export async function signInWithRegalMailPassword(email: string, password: string): Promise<void> {
  const client = regalMailAuthClient();
  if (!client) {
    throw new Error('Regal Mail is not configured.');
  }

  const normalized = normalizeRegalMailInput(email);
  if (!normalized || !isRegalMailEmail(normalized)) {
    throw new Error(`Use your @${REGAL_MAIL_DOMAIN} address.`);
  }
  if (!password.trim()) {
    throw new Error('Enter your Regal Mail password.');
  }

  const { data, error } = await client.auth.signInWithPassword({
    email: normalized,
    password,
  });

  if (error) {
    if (!isUnifiedRegalMailSupabase()) {
      await regalMailSupabase?.auth.signOut();
    }
    throw new Error(mapRegalMailAuthError(error.message));
  }

  if (!data.session?.access_token) {
    if (!isUnifiedRegalMailSupabase()) {
      await regalMailSupabase?.auth.signOut();
    }
    throw new Error('Sign-in succeeded but no session was returned. Try a magic link instead.');
  }

  await exchangeRegalMailSession(data.session.access_token);
}

/** After magic-link redirect, establish Meeting session (or confirm unified session). */
export async function completeRegalMailSignIn(): Promise<boolean> {
  const client = regalMailAuthClient();
  if (!client) return false;

  const {
    data: { session },
    error,
  } = await client.auth.getSession();

  if (error) throw new Error(error.message);
  if (!session?.access_token) return false;

  await exchangeRegalMailSession(session.access_token);
  return true;
}

export async function signOutRegalMail(): Promise<void> {
  if (isUnifiedRegalMailSupabase()) return;
  if (!regalMailSupabase) return;
  await regalMailSupabase.auth.signOut();
}
