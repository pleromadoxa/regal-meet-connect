/** Locate the video m-line transceiver on a peer connection. */
export function findVideoTransceiver(pc: RTCPeerConnection): RTCRtpTransceiver | undefined {
  return pc.getTransceivers().find((t) => {
    const kind = (t as RTCRtpTransceiver & { mediaKind?: string }).mediaKind;
    return (
      kind === 'video' ||
      t.sender.track?.kind === 'video' ||
      t.receiver.track?.kind === 'video'
    );
  });
}

function findKindTransceiver(
  pc: RTCPeerConnection,
  kind: 'audio' | 'video'
): RTCRtpTransceiver | undefined {
  return pc.getTransceivers().find((t) => {
    return (
      t.sender.track?.kind === kind ||
      t.receiver.track?.kind === kind ||
      (t as RTCRtpTransceiver & { mediaKind?: string }).mediaKind === kind
    );
  });
}

/** Attach a camera track to a peer, reusing recvonly video transceivers when present. */
export async function replaceOrAddVideoTrack(
  pc: RTCPeerConnection,
  videoTrack: MediaStreamTrack,
  stream: MediaStream
): Promise<void> {
  const senderWithTrack = pc.getSenders().find((s) => s.track?.kind === 'video');
  if (senderWithTrack) {
    await senderWithTrack.replaceTrack(videoTrack);
    return;
  }

  const videoTransceiver = findVideoTransceiver(pc);
  if (videoTransceiver) {
    await videoTransceiver.sender.replaceTrack(videoTrack);
    if (videoTransceiver.direction === 'recvonly') {
      videoTransceiver.direction = 'sendrecv';
    }
    return;
  }

  pc.addTrack(videoTrack, stream);
}

/** Attach a mic track, upgrading recvonly audio transceivers created before media was ready. */
export async function replaceOrAddAudioTrack(
  pc: RTCPeerConnection,
  audioTrack: MediaStreamTrack,
  stream: MediaStream
): Promise<void> {
  const senderWithTrack = pc.getSenders().find((s) => s.track?.kind === 'audio');
  if (senderWithTrack) {
    await senderWithTrack.replaceTrack(audioTrack);
    return;
  }

  const audioTransceiver = findKindTransceiver(pc, 'audio');
  if (audioTransceiver) {
    await audioTransceiver.sender.replaceTrack(audioTrack);
    if (audioTransceiver.direction === 'recvonly') {
      audioTransceiver.direction = 'sendrecv';
    }
    return;
  }

  pc.addTrack(audioTrack, stream);
}

/** Publish (or refresh) all local A/V tracks onto an existing peer connection. */
export async function syncLocalTracksToPeer(
  pc: RTCPeerConnection,
  stream: MediaStream
): Promise<void> {
  if (pc.connectionState === 'closed') return;
  for (const track of stream.getAudioTracks()) {
    await replaceOrAddAudioTrack(pc, track, stream);
  }
  for (const track of stream.getVideoTracks()) {
    await replaceOrAddVideoTrack(pc, track, stream);
  }
}

/** Remove an outgoing video track while keeping recv capability when possible. */
export async function clearOutgoingVideoTrack(pc: RTCPeerConnection): Promise<void> {
  const senderWithTrack = pc.getSenders().find((s) => s.track?.kind === 'video');
  if (senderWithTrack) {
    await senderWithTrack.replaceTrack(null);
    return;
  }

  const videoTransceiver = findVideoTransceiver(pc);
  if (videoTransceiver?.sender.track) {
    await videoTransceiver.sender.replaceTrack(null);
    if (videoTransceiver.direction === 'sendrecv') {
      videoTransceiver.direction = 'recvonly';
    }
  }
}
