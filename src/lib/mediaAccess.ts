import type { MeetingMediaPrefs } from '@/lib/meetingMediaPrefs';
import { applyDeviceIds } from '@/lib/meetingMediaPrefs';

export type MediaAccessErrorInfo = {
  title: string;
  description: string;
};

export function isMediaDevicesSupported(): boolean {
  return Boolean(
    typeof navigator !== 'undefined' &&
      window.isSecureContext &&
      navigator.mediaDevices?.getUserMedia
  );
}

export function getMediaAccessErrorInfo(error: unknown): MediaAccessErrorInfo {
  const name = error instanceof DOMException ? error.name : '';
  const message = error instanceof Error ? error.message : String(error);

  if (!isMediaDevicesSupported()) {
    return {
      title: 'Secure connection required',
      description:
        'Camera and microphone require HTTPS. Open meet.regalmesh.com over a secure connection.',
    };
  }

  switch (name) {
    case 'NotAllowedError':
    case 'PermissionDeniedError':
      return {
        title: 'Media access denied',
        description:
          'Allow camera and microphone in your browser site settings, then try again.',
      };
    case 'NotFoundError':
    case 'DevicesNotFoundError':
      return {
        title: 'No media device found',
        description:
          'Connect a microphone or camera, or join with audio-only if you have a mic.',
      };
    case 'NotReadableError':
    case 'TrackStartError':
      return {
        title: 'Device in use',
        description:
          'Your camera or microphone is busy in another app or tab. Close it and retry.',
      };
    case 'OverconstrainedError':
    case 'ConstraintNotSatisfiedError':
      return {
        title: 'Device constraints failed',
        description:
          'We could not use your selected device. Try another mic/camera in Settings.',
      };
    case 'AbortError':
      return {
        title: 'Media request cancelled',
        description: 'Permission was interrupted. Click Allow and try again.',
      };
    default:
      return {
        title: 'Media access error',
        description: message || 'Failed to access camera and microphone. Please check permissions.',
      };
  }
}

export async function sanitizeMediaPrefs(prefs: MeetingMediaPrefs): Promise<MeetingMediaPrefs> {
  if (!navigator.mediaDevices?.enumerateDevices) return prefs;

  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    const audioIds = new Set(
      devices.filter((d) => d.kind === 'audioinput').map((d) => d.deviceId)
    );
    const videoIds = new Set(
      devices.filter((d) => d.kind === 'videoinput').map((d) => d.deviceId)
    );

    return {
      ...prefs,
      default_audio_device:
        prefs.default_audio_device && audioIds.has(prefs.default_audio_device)
          ? prefs.default_audio_device
          : '',
      default_video_device:
        prefs.default_video_device && videoIds.has(prefs.default_video_device)
          ? prefs.default_video_device
          : '',
    };
  } catch {
    return prefs;
  }
}

function audioOnlyConstraints(prefs?: MeetingMediaPrefs): MediaStreamConstraints {
  const base: MediaStreamConstraints = {
    audio: {
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true,
    },
    video: false,
  };
  return prefs ? applyDeviceIds(base, prefs) : base;
}

/**
 * Request camera/mic with progressive fallbacks for stale device IDs and strict constraints.
 */
export async function acquireUserMedia(
  primary: MediaStreamConstraints,
  prefs?: MeetingMediaPrefs
): Promise<MediaStream> {
  if (!isMediaDevicesSupported()) {
    throw new DOMException('Media devices require a secure context', 'NotSupportedError');
  }

  const safePrefs = prefs ? await sanitizeMediaPrefs(prefs) : undefined;
  const attempts: MediaStreamConstraints[] = [];

  if (safePrefs) {
    attempts.push(applyDeviceIds(primary, safePrefs));
  }
  attempts.push(primary);

  const wantsVideo = primary.video !== false && primary.video != null;
  if (wantsVideo) {
    const audioOnly = audioOnlyConstraints(safePrefs);
    attempts.push(audioOnly);
    attempts.push({ audio: true, video: false });
  } else {
    attempts.push({ audio: true, video: false });
  }

  let lastError: unknown;
  const seen = new Set<string>();

  for (const constraints of attempts) {
    const key = JSON.stringify(constraints);
    if (seen.has(key)) continue;
    seen.add(key);

    try {
      return await navigator.mediaDevices.getUserMedia(constraints);
    } catch (error) {
      lastError = error;
      const name = error instanceof DOMException ? error.name : '';
      if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
        throw error;
      }
    }
  }

  throw lastError ?? new DOMException('getUserMedia failed', 'NotReadableError');
}
