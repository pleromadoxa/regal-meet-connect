import { supabase } from '@/integrations/supabase/client';
import { parseMeetingCodeFromInput } from '@/lib/meeting';

export interface MeetingRecordingRow {
  id: string;
  meeting_id: string;
  file_path: string;
  duration_seconds: number | null;
  started_at: string;
  ended_at: string | null;
  status: string;
}

export function meetingCodeFromEvent(location?: string | null, meetingId?: string): string | null {
  if (meetingId) return meetingId.toUpperCase();
  if (!location) return null;
  const parsed = parseMeetingCodeFromInput(location);
  return parsed.length >= 4 ? parsed : null;
}

export async function fetchRecordingsForMeetingCode(
  code: string
): Promise<MeetingRecordingRow[]> {
  const { data, error } = await supabase
    .from('meeting_recordings')
    .select('id, meeting_id, file_path, duration_seconds, started_at, ended_at, status')
    .eq('meeting_id', code.toUpperCase())
    .eq('status', 'completed')
    .order('started_at', { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export async function getRecordingSignedUrl(filePath: string, expiresIn = 3600): Promise<string | null> {
  const { data, error } = await supabase.storage
    .from('meeting-recordings')
    .createSignedUrl(filePath, expiresIn);

  if (error || !data?.signedUrl) return null;
  return data.signedUrl;
}

export function formatRecordingDuration(seconds: number | null): string {
  if (!seconds || seconds <= 0) return '—';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}
