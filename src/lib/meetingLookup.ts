import { supabase } from '@/integrations/supabase/client';

export type MeetingByCodeRow = {
  id: string;
  meeting_id: string;
  host_id: string;
  title: string;
  is_active: boolean;
  status: string | null;
};

/** Lookup active meeting by code via RPC — works for anon (pre-sign-in join). */
export async function fetchMeetingByCode(code: string): Promise<MeetingByCodeRow | null> {
  const { data, error } = await supabase.rpc('get_meeting_by_code', { p_code: code });
  if (error) throw error;
  const row = Array.isArray(data) ? data[0] : data;
  return (row as MeetingByCodeRow | undefined) ?? null;
}

export async function fetchProfileDisplayNames(
  userIds: string[]
): Promise<Map<string, string>> {
  if (userIds.length === 0) return new Map();

  const { data, error } = await supabase.rpc('get_profile_display_names', {
    p_user_ids: userIds,
  });
  if (error) {
    console.warn('Profile display names lookup failed:', error);
    return new Map();
  }

  const rows = Array.isArray(data) ? data : data ? [data] : [];
  return new Map(
    rows
      .filter((row) => row.display_name?.trim())
      .map((row) => [row.id as string, (row.display_name as string).trim()])
  );
}
