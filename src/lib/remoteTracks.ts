/**
 * Route an incoming receiver track into the right per-peer stream.
 *
 * A single peer connection can deliver tracks on several *different*
 * `MediaStream`s:
 *
 *  - camera + mic arrive together (msid of `localStream`),
 *  - screen video is added with `pc.addTrack(screenTrack, displayStream)` when
 *    there is no camera sender (new msid),
 *  - tab/screen audio is added with `pc.addTrack(track, displayStream)` (new msid),
 *  - senders created from a `recvonly` transceiver carry no msid at all, so the
 *    browser fires `ontrack` with `event.streams = []` and each track gets its
 *    own throw-away stream.
 *
 * Historically we did `remoteStreams.set(peerId, event.streams[0])`, so the
 * *last* track to arrive decided what the whole peer looked like. If screen or
 * tab audio arrived last, the mic/camera stream was dropped from the map — and
 * since `RemoteAudioMix` only plays what is in that map, everybody silently
 * stopped hearing that person.
 *
 * Routing rules:
 *  - ONE stable "primary" stream per peer: audio tracks are ALWAYS folded into
 *    it, so audio can never be lost to a later track arrival.
 *  - Video only ever occupies the primary slot once; an *extra* video arriving
 *    on a foreign msid (the shared screen) goes to a separate stream so the
 *    projection layout can show it while tiles keep showing the camera.
 */

const contains = (tracks: MediaStreamTrack[], track: MediaStreamTrack) =>
  tracks.some((t) => t.id === track.id);

/**
 * Get-or-create the stable primary stream for a peer. `incoming` (from
 * `event.streams[0]`) seeds it the very first time only, so a later foreign
 * stream can never replace what we already showed to the user.
 */
export function ensureRemoteStream(
  store: Map<string, MediaStream>,
  peerId: string,
  incoming: MediaStream | undefined
): MediaStream {
  let stream = store.get(peerId);
  if (!stream) {
    stream = incoming ?? new MediaStream();
    store.set(peerId, stream);
  }
  return stream;
}

/** Put a shared-screen video track into its own per-peer stream. */
export function storeForeignVideo(
  screenStore: Map<string, MediaStream>,
  peerId: string,
  track: MediaStreamTrack
): MediaStream {
  let screen = screenStore.get(peerId);
  if (!screen) {
    screen = new MediaStream();
    screenStore.set(peerId, screen);
  }
  // Keep only the newest video track: <video> renders the first one it finds,
  // so stale/camera leftovers would hide the projection.
  for (const existing of screen.getVideoTracks()) {
    if (existing.id !== track.id) screen.removeTrack(existing);
  }
  if (!contains(screen.getVideoTracks(), track)) screen.addTrack(track);
  return screen;
}

/** Fold a track into the primary stream (audio always; video only if free). */
export function absorbRemoteTrack(
  primary: MediaStream,
  incoming: MediaStream | undefined,
  track: MediaStreamTrack
): void {
  if (track.kind === 'audio') {
    if (!contains(primary.getAudioTracks(), track)) primary.addTrack(track);
    foldForeignAudio(primary, incoming);
    return;
  }

  if (!contains(primary.getVideoTracks(), track)) primary.addTrack(track);

  if (incoming && incoming !== primary) {
    // Video arrived on a foreign msid before we had any video: adopt the rest
    // of that stream too (it may carry the mic announced alongside it).
    for (const t of incoming.getTracks()) {
      if (t.readyState === 'ended') continue;
      if (t.kind === 'audio') {
        if (contains(primary.getAudioTracks(), t)) continue;
      } else {
        if (contains(primary.getVideoTracks(), t)) continue;
        if (primary.getVideoTracks().some((x) => x.readyState !== 'ended')) continue;
      }
      primary.addTrack(t);
    }
  }
}

/** Fold any audio announced on a foreign msid into the primary stream. */
function foldForeignAudio(primary: MediaStream, incoming: MediaStream | undefined): void {
  if (!incoming || incoming === primary) return;
  for (const audio of incoming.getAudioTracks()) {
    if (audio.readyState === 'ended') continue;
    if (contains(primary.getAudioTracks(), audio)) continue;
    primary.addTrack(audio);
  }
}

/**
 * Full routing decision for one `RTCTrackEvent`.
 * Returns `true` when the track landed in the primary stream.
 */
export function routeRemoteTrack(
  primary: MediaStream,
  screenStore: Map<string, MediaStream>,
  peerId: string,
  incoming: MediaStream | undefined,
  track: MediaStreamTrack
): boolean {
  if (track.kind === 'video') {
    const primaryHasVideo = primary
      .getVideoTracks()
      .some((t) => t.readyState !== 'ended' && t.id !== track.id);
    if (primaryHasVideo) {
      // Extra video on a foreign msid — this is the shared screen.
      storeForeignVideo(screenStore, peerId, track);
      foldForeignAudio(primary, incoming);
      return false;
    }
  }
  absorbRemoteTrack(primary, incoming, track);
  return true;
}
