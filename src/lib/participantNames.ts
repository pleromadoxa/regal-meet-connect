export interface ParticipantNameSource {
  user_id: string;
  user_name: string;
}

/** Resolve the best display name for a remote peer (DB row, signaling map, or fallback). */
export function resolveParticipantDisplayName(
  userId: string,
  participants: ParticipantNameSource[],
  peerUserNames: Map<string, string> | Record<string, string> | undefined,
  fallback = 'Guest'
): string {
  const fromDb = participants.find((p) => p.user_id === userId)?.user_name?.trim();
  if (fromDb) return fromDb;

  const fromSignal =
    peerUserNames instanceof Map
      ? peerUserNames.get(userId)?.trim()
      : peerUserNames?.[userId]?.trim();
  if (fromSignal) return fromSignal;

  return fallback;
}

/** Apply signaling + DB fallbacks so every participant row has a display name. */
export function enrichParticipantNames<T extends ParticipantNameSource>(
  participants: T[],
  peerUserNames: Map<string, string> | Record<string, string> | undefined
): T[] {
  return participants.map((p) => {
    const resolved = resolveParticipantDisplayName(
      p.user_id,
      participants,
      peerUserNames,
      ''
    );
    const fallback =
      p.user_name?.trim() ||
      resolved ||
      `User ${p.user_id.slice(0, 6)}`;
    return {
      ...p,
      user_name: resolved || fallback,
    };
  });
}
