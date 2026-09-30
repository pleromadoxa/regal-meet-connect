import { supabase } from '@/integrations/supabase/client';

export type MeetingByCodeRow = {
  id: string;
  meeting_id: string;
  host_id: string;
  title: string;
  is_active: boolean;
  status: string | null;
};

function asMeetingRow(data: unknown): MeetingByCodeRow | null {
  const row = Array.isArray(data) ? data[0] : data;
  if (!row || typeof row !== 'object') return null;
  return row as MeetingByCodeRow;
}

/** Lookup active meeting by code via RPC — works for anon (pre-sign-in join). */
export async function fetchMeetingByCode(code: string): Promise<MeetingByCodeRow | null> {
  const { data, error } = await supabase.rpc('get_meeting_by_code', { p_code: code });
  if (error) throw error;
  return asMeetingRow(data);
}

/**
 * Open a room by code. Hosts can reactivate an ended/inactive room so Recents → Join works.
 */
export async function openMeetingByCode(
  code: string,
  opts?: { reactivateIfHost?: boolean },
): Promise<MeetingByCodeRow | null> {
  const normalized = code.trim().toUpperCase();
  if (!normalized) return null;

  const active = await fetchMeetingByCode(normalized);
  if (active) return active;

  if (opts?.reactivateIfHost === false) return null;

  const { data: hosted, error: hostedErr } = await supabase.rpc('get_hosted_meeting_by_code', {
    p_code: normalized,
  });
  if (hostedErr) {
    console.warn('[openMeetingByCode] get_hosted_meeting_by_code', hostedErr.message);
    return null;
  }
  const hostedRow = asMeetingRow(hosted);
  if (!hostedRow) return null;

  if (hostedRow.is_active && hostedRow.status !== 'ended' && hostedRow.status !== 'cancelled') {
    return hostedRow;
  }

  const { data: revived, error: reviveErr } = await supabase.rpc('reactivate_meeting_by_code', {
    p_code: normalized,
  });
  if (reviveErr) {
    console.warn('[openMeetingByCode] reactivate_meeting_by_code', reviveErr.message);
    return null;
  }
  return asMeetingRow(revived);
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
