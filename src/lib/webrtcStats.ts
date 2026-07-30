export interface InboundRtpSnapshot {
  packetsLost: number;
  packetsReceived: number;
  bytesReceived: number;
  timestamp: number;
}

export interface AggregatedNetworkMetrics {
  rttMs: number;
  packetLossPct: number;
  jitterMs: number;
  inboundKbps: number;
}

/** Compute packet-loss % and inbound bitrate from consecutive inbound-rtp snapshots. */
export function deltaInboundMetrics(
  prev: InboundRtpSnapshot | undefined,
  current: InboundRtpSnapshot
): { packetLossPct: number; inboundKbps: number } {
  if (!prev || current.timestamp <= prev.timestamp) {
    return { packetLossPct: 0, inboundKbps: 0 };
  }

  const lostDelta = Math.max(0, current.packetsLost - prev.packetsLost);
  const receivedDelta = Math.max(0, current.packetsReceived - prev.packetsReceived);
  const totalDelta = lostDelta + receivedDelta;
  const packetLossPct = totalDelta > 0 ? (lostDelta / totalDelta) * 100 : 0;

  const bytesDelta = Math.max(0, current.bytesReceived - prev.bytesReceived);
  const timeDeltaSec = (current.timestamp - prev.timestamp) / 1000;
  const inboundKbps = timeDeltaSec > 0 ? (bytesDelta * 8) / timeDeltaSec / 1000 : 0;

  return { packetLossPct, inboundKbps };
}

/** Aggregate RTT, loss, jitter, and bitrate across all peer connections. */
export async function aggregatePeerMetrics(
  peerConnections: Iterable<RTCPeerConnection>,
  prevSnapshots: Map<RTCPeerConnection, InboundRtpSnapshot>
): Promise<AggregatedNetworkMetrics | null> {
  let rttSum = 0;
  let rttCount = 0;
  let lossSum = 0;
  let lossCount = 0;
  let jitterSum = 0;
  let jitterCount = 0;
  let kbpsSum = 0;
  let kbpsCount = 0;

  for (const pc of peerConnections) {
    if (pc.connectionState === 'closed') continue;
    try {
      const stats = await pc.getStats();
      let inboundSnap: InboundRtpSnapshot | undefined;

      stats.forEach((report) => {
        if (report.type === 'candidate-pair' && report.state === 'succeeded') {
          const rtt = report.currentRoundTripTime;
          if (typeof rtt === 'number' && rtt > 0) {
            rttSum += rtt * 1000;
            rttCount += 1;
          }
        }

        if (report.type === 'inbound-rtp' && (report.mediaType === 'video' || report.mediaType === 'audio')) {
          inboundSnap = {
            packetsLost: report.packetsLost ?? 0,
            packetsReceived: report.packetsReceived ?? 0,
            bytesReceived: report.bytesReceived ?? 0,
            timestamp: report.timestamp ?? Date.now(),
          };
          if (typeof report.jitter === 'number') {
            jitterSum += report.jitter * 1000;
            jitterCount += 1;
          }
        }
      });

      if (inboundSnap) {
        const prev = prevSnapshots.get(pc);
        const { packetLossPct, inboundKbps } = deltaInboundMetrics(prev, inboundSnap);
        prevSnapshots.set(pc, inboundSnap);
        if (inboundKbps > 0 || packetLossPct > 0) {
          lossSum += packetLossPct;
          lossCount += 1;
          kbpsSum += inboundKbps;
          kbpsCount += 1;
        }
      }
    } catch {
      // ignore per-peer stat failures
    }
  }

  if (rttCount === 0 && lossCount === 0 && jitterCount === 0) return null;

  return {
    rttMs: rttCount > 0 ? rttSum / rttCount : 0,
    packetLossPct: lossCount > 0 ? lossSum / lossCount : 0,
    jitterMs: jitterCount > 0 ? jitterSum / jitterCount : 0,
    inboundKbps: kbpsCount > 0 ? kbpsSum / kbpsCount : 0,
  };
}

export function qualityLevelFromMetrics(
  rttMs: number,
  packetLossPct: number
): 'high' | 'medium' | 'low' | 'potato' {
  if (rttMs > 300 || packetLossPct > 5) return 'potato';
  if (rttMs > 200 || packetLossPct > 3) return 'low';
  if (rttMs > 100 || packetLossPct > 1) return 'medium';
  return 'high';
}
