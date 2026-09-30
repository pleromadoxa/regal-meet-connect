import { supabase } from '@/integrations/supabase/client';

/**
 * Ensure the browser has an authenticated Supabase session for joining a meeting.
 * Logged-in users are left alone; guests get an anonymous session + display name.
 */
export async function ensureGuestOrUserSession(displayName: string): Promise<{
  userId: string;
  isGuest: boolean;
}> {
  const name = displayName.trim() || 'Guest';
  const { data: existing } = await supabase.auth.getSession();
  if (existing.session?.user) {
    const user = existing.session.user;
    const isGuest = Boolean(user.is_anonymous);
    if (isGuest || !user.user_metadata?.display_name) {
      await supabase.auth.updateUser({ data: { display_name: name } });
    }
    await supabase.from('profiles').upsert(
      {
        id: user.id,
        display_name: name,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'id' },
    );
    return { userId: user.id, isGuest };
  }

  const { data, error } = await supabase.auth.signInAnonymously({
    options: { data: { display_name: name } },
  });
  if (error || !data.user) {
    throw new Error(error?.message || 'Could not start guest session');
  }

  await supabase.from('profiles').upsert(
    {
      id: data.user.id,
      display_name: name,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'id' },
  ).then(({ error }) => {
    if (error) console.warn('Guest profile upsert failed:', error.message);
  });

  return { userId: data.user.id, isGuest: true };
}
