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
