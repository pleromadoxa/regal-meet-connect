import { supabase } from '@/integrations/supabase/client';

export type MeetingMediaPrefs = {
  camera_default_on: boolean;
  microphone_default_on: boolean;
  default_audio_device: string;
  default_video_device: string;
};

const FALLBACK: MeetingMediaPrefs = {
  camera_default_on: false,
  microphone_default_on: true,
  default_audio_device: '',
  default_video_device: '',
};

export async function loadMeetingMediaPrefs(userId?: string): Promise<MeetingMediaPrefs> {
  if (!userId) return { ...FALLBACK };

  const prefs = { ...FALLBACK };

  try {
    const stored = localStorage.getItem(`device_prefs_${userId}`);
    if (stored) {
      const parsed = JSON.parse(stored) as Partial<MeetingMediaPrefs>;
      prefs.default_audio_device = parsed.default_audio_device ?? '';
      prefs.default_video_device = parsed.default_video_device ?? '';
    }
  } catch {
    /* ignore corrupt local prefs */
  }

  try {
    const { data } = await supabase
      .from('user_settings')
      .select('camera_default_on, microphone_default_on')
      .eq('user_id', userId)
      .maybeSingle();

    if (data) {
      if (data.camera_default_on != null) prefs.camera_default_on = data.camera_default_on;
      if (data.microphone_default_on != null) prefs.microphone_default_on = data.microphone_default_on;
    }
  } catch {
    /* settings table optional */
  }

  return prefs;
}

export function applyDeviceIds(
  constraints: MediaStreamConstraints,
  prefs: MeetingMediaPrefs
): MediaStreamConstraints {
  const next = { ...constraints };

  if (prefs.default_audio_device && next.audio !== false) {
    const audio = typeof next.audio === 'object' ? { ...next.audio } : {};
    next.audio = { ...audio, deviceId: { ideal: prefs.default_audio_device } };
  }

  if (prefs.default_video_device && next.video !== false && next.video != null) {
    const video = typeof next.video === 'object' ? { ...next.video } : {};
    next.video = { ...video, deviceId: { ideal: prefs.default_video_device } };
  }

  return next;
}
