/** When participant count exceeds this, meetings auto-switch to SFU (or host-hub fallback). */
export const SFU_AUTO_THRESHOLD = 50;

/** Below this count everyone uses full mesh WebRTC. */
export const MESH_MAX_PARTICIPANTS = SFU_AUTO_THRESHOLD;

export type MeetingMediaMode = 'mesh' | 'sfu' | 'host-hub';
export type ParticipantMediaRole = 'publisher' | 'listener';

export interface MeetingTopologyState {
  mediaMode: MeetingMediaMode;
  mediaRole: ParticipantMediaRole;
  hostUserId: string | null;
  publisherIds: string[];
  participantCount: number;
  isLargeMeeting: boolean;
  sfuAvailable: boolean;
}

export interface TopologyBroadcastPayload {
  mediaMode: MeetingMediaMode;
  participantCount: number;
  hostUserId: string | null;
  publisherIds: string[];
  switchedAt: string;
}

export function resolveMediaMode(
  participantCount: number,
  sfuAvailable: boolean,
  sfuThreshold: number = SFU_AUTO_THRESHOLD
): MeetingMediaMode {
  if (participantCount <= SFU_AUTO_THRESHOLD) return 'mesh';
  if (!Number.isFinite(sfuThreshold) || sfuThreshold > SFU_AUTO_THRESHOLD) {
    return 'host-hub';
  }
  return sfuAvailable ? 'sfu' : 'host-hub';
}

export function resolveMediaRole(
  mediaMode: MeetingMediaMode,
  userId: string,
  isHost: boolean,
  publisherIds: string[]
): ParticipantMediaRole {
  if (mediaMode === 'mesh') return 'publisher';
  if (isHost || publisherIds.includes(userId)) return 'publisher';
  return 'listener';
}

export function shouldMeshWithPeer(
  mediaMode: MeetingMediaMode,
  mediaRole: ParticipantMediaRole,
  selfUserId: string,
  peerId: string,
  hostUserId: string | null
): boolean {
  if (mediaMode === 'sfu') return false;
  if (mediaMode === 'mesh') return peerId !== selfUserId;

  // host-hub: listeners only connect to host; host connects to all peers
  if (!hostUserId) return false;
  if (mediaRole === 'listener') return peerId === hostUserId;
  if (selfUserId === hostUserId) return peerId !== selfUserId;
  return peerId === hostUserId;
}

export function useMeshConnections(mediaMode: MeetingMediaMode): boolean {
  return mediaMode === 'mesh' || mediaMode === 'host-hub';
}

export function useSfuConnections(mediaMode: MeetingMediaMode): boolean {
  return mediaMode === 'sfu';
}

export interface MeetingMediaRoutingOptions {
  useMesh: boolean;
  shouldConnectToPeer: (peerId: string) => boolean;
  publishToMesh?: boolean;
}

export const defaultMediaRouting: MeetingMediaRoutingOptions = {
  useMesh: true,
  shouldConnectToPeer: () => true,
  publishToMesh: true,
};
