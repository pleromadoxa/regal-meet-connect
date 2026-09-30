export type VideoQualityLevel = 'high' | 'medium' | 'low' | 'potato';

export const VIDEO_BITRATE_BPS: Record<VideoQualityLevel, number> = {
  potato: 200_000,
  low: 700_000,
  medium: 1_800_000,
  high: 4_000_000,
};

export const VIDEO_FRAMERATE: Record<VideoQualityLevel, number> = {
  potato: 12,
  low: 20,
  medium: 30,
  high: 30,
};

const CAPTURE: Record<VideoQualityLevel, { width: number; height: number; fps: number }> = {
  high: { width: 1920, height: 1080, fps: 30 },
  medium: { width: 1280, height: 720, fps: 30 },
  low: { width: 854, height: 480, fps: 20 },
  potato: { width: 640, height: 360, fps: 12 },
};

export function videoCaptureConstraints(
  quality: VideoQualityLevel = 'high',
  maxHeight = 1080
): MediaTrackConstraints {
  const preset = CAPTURE[quality];
  const height = Math.min(preset.height, maxHeight);
  const width = Math.round((height * 16) / 9);
  return {
    width: { ideal: width },
    height: { ideal: height },
    frameRate: { ideal: preset.fps },
    aspectRatio: { ideal: 16 / 9 },
  };
}

export function videoSendEncodings(
  quality: VideoQualityLevel = 'high'
): RTCRtpEncodingParameters[] {
  return [
    {
      maxBitrate: VIDEO_BITRATE_BPS[quality],
      maxFramerate: VIDEO_FRAMERATE[quality],
      scaleResolutionDownBy: 1,
    },
  ];
}

export async function applyVideoEncoding(
  peerConnection: RTCPeerConnection,
  quality: VideoQualityLevel = 'high'
): Promise<void> {
  const videoSender = peerConnection.getSenders().find((sender) => sender.track?.kind === 'video');
  if (!videoSender?.track) return;

  try {
    const params = videoSender.getParameters();
    if (!params.encodings?.length) {
      params.encodings = videoSendEncodings(quality);
    } else {
      params.encodings[0].maxBitrate = VIDEO_BITRATE_BPS[quality];
      params.encodings[0].maxFramerate = VIDEO_FRAMERATE[quality];
      params.encodings[0].scaleResolutionDownBy = 1;
    }
    await videoSender.setParameters(params);
  } catch {
    /* Encodings are unavailable until negotiation completes. */
  }
}
