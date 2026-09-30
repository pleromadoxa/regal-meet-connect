import { useEffect, useState } from 'react';

/** True when the track is actively producing video frames (not ended/disabled/muted). */
export function isVideoTrackUsable(track: MediaStreamTrack | null | undefined): boolean {
  if (!track) return false;
  if (track.readyState === 'ended') return false;
  if (track.enabled === false) return false;
  // Remote cam-off / freeze usually sets muted on the receiver track.
  if (track.muted) return false;
  return true;
}

export function streamHasUsableVideo(stream: MediaStream | null | undefined): boolean {
  return Boolean(stream?.getVideoTracks?.().some((t) => isVideoTrackUsable(t)));
}

/**
 * Re-renders when a stream's video usability changes (mute / unmute / ended / enabled).
 * Use this so frozen or camera-off remotes swap to avatar immediately.
 */
export function useStreamHasUsableVideo(stream: MediaStream | null | undefined): boolean {
  const [hasVideo, setHasVideo] = useState(() => streamHasUsableVideo(stream));

  useEffect(() => {
    const refresh = () => setHasVideo(streamHasUsableVideo(stream));
    refresh();
    if (!stream) return;

    const tracks = stream.getVideoTracks();
    const cleanups: Array<() => void> = [];
    for (const track of tracks) {
      const onChange = () => refresh();
      track.addEventListener('mute', onChange);
      track.addEventListener('unmute', onChange);
      track.addEventListener('ended', onChange);
      // Some browsers expose enable via events only through polling; keep a light poll.
      cleanups.push(() => {
        track.removeEventListener('mute', onChange);
        track.removeEventListener('unmute', onChange);
        track.removeEventListener('ended', onChange);
      });
    }
    const poll = window.setInterval(refresh, 700);
    cleanups.push(() => window.clearInterval(poll));
    return () => cleanups.forEach((fn) => fn());
  }, [stream]);

  return hasVideo;
}
