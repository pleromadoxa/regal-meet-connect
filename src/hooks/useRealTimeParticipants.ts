import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { fetchMeetingByCode, fetchProfileDisplayNames } from '@/lib/meetingLookup';
import { parseMeetingCodeFromInput } from '@/lib/meeting';
import { sendBroadcastWithRetry } from '@/lib/meetingBroadcast';

export interface Participant {
  id: string;
  user_id: string;
  user_name: string;
  is_host: boolean;
  is_muted: boolean;
  joined_at: string;
  left_at?: string | null;
  is_video_enabled: boolean;
  is_audio_enabled: boolean;
  connection_quality: 'good' | 'poor' | 'disconnected';
  location?: string;
  /** When the row last heartbeaten from a live client (absent on old deployments). */
  last_seen?: string;
}

/**
 * Deployed databases may predate the `left_at` column. Probe the schema once
 * and fall back when it is missing — a single unknown column must never abort
 * the participant query, otherwise the panel silently renders nobody (that is
 * exactly what used to happen: the whole fetch failed and only the local user
 * was drawn, so the host appeared to be the only participant).
 */
let leftAtColumnSupported: boolean | null = null;
let lastSeenColumnSupported: boolean | null = null;

/** How often a connected client re-publishes its own presence row. */
const PRESENCE_HEARTBEAT_MS = 20_000;
/** Rows that have not heartbeaten for this long belong to a dead session. */
const PRESENCE_TTL_MS = 180_000;
/** Slack before a user without a live socket drops off the roster. */
const PRESENCE_ABSENT_GRACE_MS = 20_000;

/** Live signalling presence for the meeting, used to expire ghost rows. */
export interface MeetingPresenceSignal {
  /** User ids with a live socket (self is exempt and added automatically). */
  peerIds?: Iterable<string> | null;
  /** True once the presence channel has reported its state at least once. */
  synced?: boolean;
}

const isMissingColumn = (
  error: { code?: string; message?: string } | null | undefined,
  column: string
) =>
  Boolean(
    error && (error.code === 'PGRST204' || new RegExp(`\\b${column}\\b`).test(error.message ?? ''))
  );

const isMissingLeftAtColumn = (error: { code?: string; message?: string } | null | undefined) =>
  isMissingColumn(error, 'left_at');

const isMissingLastSeenColumn = (error: { code?: string; message?: string } | null | undefined) =>
  isMissingColumn(error, 'last_seen');

/**
 * A row whose client stopped heartbeating is a ghost, not a person. Deployments
 * without the `last_seen` column keep the old behaviour (never stale) so a
 * missing column can never blank the roster.
 */
const isStalePresence = (row: { last_seen?: string }) => {
  if (lastSeenColumnSupported === false) return false;
  const ts = row.last_seen ? Date.parse(row.last_seen) : NaN;
  if (Number.isNaN(ts)) return false;
  return Date.now() - ts > PRESENCE_TTL_MS;
};

/** Keep the roster in join order (rejoin updates move a row to the back). */
const sortRoster = (rows: Participant[]) =>
  [...rows].sort((a, b) => (a.joined_at ?? '').localeCompare(b.joined_at ?? ''));

function mapParticipantRow(
  p: Record<string, unknown>,
  displayNames?: Map<string, string>
): Participant {
  const userId = p.user_id as string;
  const storedName = (p.user_name as string) ?? '';
  const profileName = displayNames?.get(userId)?.trim();
  const resolvedName = profileName || storedName.trim();
  return {
    ...(p as Participant),
    left_at: (p.left_at as string | null) ?? null,
    user_name: resolvedName || `User ${userId.slice(0, 6)}`,
    is_video_enabled: true,
    is_audio_enabled: !(p.is_muted as boolean),
    connection_quality: 'good',
    last_seen: (p.last_seen as string | undefined) ?? undefined,
  };
}

export const useRealTimeParticipants = (
  meetingCode: string,
  currentUserId: string,
  userName: string,
  isHost = false,
  presence?: MeetingPresenceSignal | null
) => {
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [meetingUuid, setMeetingUuid] = useState<string | null>(null);
  const [meetingHostId, setMeetingHostId] = useState<string | null>(null);
  const [removedFromMeeting, setRemovedFromMeeting] = useState(false);
  const { toast } = useToast();
  const toastRef = useRef(toast);
  toastRef.current = toast;

  /** Row id of the current user's participant record (used to detect a kick). */
  const ownRowIdRef = useRef<string | null>(null);
  /** True while *we* are leaving, so our own cleanup never reads as a kick. */
  const selfLeaveRef = useRef(false);
  /** Local mute state mirrored into the DB (refreshed by the caller). */
  const localMutedRef = useRef(false);
  const kickChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  /** When each user was last seen with a live signalling socket. */
  const lastPresentAtRef = useRef<Map<string, number>>(new Map());

  const normalizedCode = parseMeetingCodeFromInput(meetingCode);

  useEffect(() => {
    let cancelled = false;
    const code = normalizedCode;
    if (!code) {
      setMeetingUuid(null);
      setMeetingHostId(null);
      setIsLoading(false);
      return;
    }

    void fetchMeetingByCode(code)
      .then((row) => {
        if (!cancelled) {
          setMeetingUuid(row?.id ?? null);
          setMeetingHostId(row?.host_id ?? null);
        }
      })
      .catch((err) => {
        console.error('Failed to resolve meeting:', err);
        if (!cancelled) {
          setMeetingUuid(null);
          setMeetingHostId(null);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [normalizedCode]);

  const presencePeerIds = useMemo(() => new Set(presence?.peerIds ?? []), [presence?.peerIds]);
  const presenceSynced = Boolean(presence?.synced);

  // Live mirrors so the fetch/realtime callbacks below keep their identity
  // (and their effects) while still seeing the latest presence snapshot.
  const presencePeerIdsRef = useRef(presencePeerIds);
  presencePeerIdsRef.current = presencePeerIds;
  const presenceSyncedRef = useRef(presenceSynced);
  presenceSyncedRef.current = presenceSynced;

  const fetchParticipants = useCallback(async () => {
    if (!meetingUuid) return;

    try {
      const { data, error } = await supabase
        .from('meeting_participants')
        .select('*')
        .eq('meeting_id', meetingUuid)
        .order('joined_at', { ascending: true });

      if (error) {
        console.error('Error fetching participants:', error);
        return;
      }

      const rows = (data ?? []) as Participant[];
      if (rows.length > 0) {
        leftAtColumnSupported = 'left_at' in rows[0];
        if (lastSeenColumnSupported !== false) {
          lastSeenColumnSupported = rows.some((row) => 'last_seen' in row);
        }
      }
      // Still in the meeting = never recorded a leave time (or the column does
      // not exist on this deployment, in which case every row counts).
      const activeRows = rows.filter((row) => !row.left_at);
      // Never retire ourselves, and never retire anyone whose socket is alive:
      // presence is the stronger signal (it also covers deployments whose old
      // clients cannot heartbeat because `last_seen` does not exist yet).
      const staleRows = activeRows.filter(
        (row) =>
          isStalePresence(row) &&
          row.user_id !== currentUserId &&
          !presencePeerIdsRef.current.has(row.user_id)
      );
      const liveRows = activeRows.filter((row) => !isStalePresence(row));

      // Sessions that died without writing `left_at` (closed tab, crashed
      // webview, an expired anonymous session) used to sit here forever — a
      // solo host saw ghosts of people who had long gone. Retire them so every
      // consumer (roster, header count, plan limits) agrees nobody is home.
      // RLS only lets the rows we are allowed to touch actually change.
      if (staleRows.length > 0) {
        const staleIds = new Set(staleRows.map((row) => row.id));
        setParticipants((prev) => sortRoster(prev.filter((p) => !staleIds.has(p.id))));
        const { error: retireError } = await supabase
          .from('meeting_participants')
          .update({ left_at: new Date().toISOString() })
          .in(
            'id',
            staleRows.map((row) => row.id)
          )
          .is('left_at', null);
        if (retireError && !isMissingLeftAtColumn(retireError)) {
          console.warn('Failed to retire stale participants:', retireError.message);
        }
      }

      // Defensive: exactly one visible entry per user (deployments missing the
      // (meeting_id, user_id) unique index can hold several rows per person).
      const byUser = new Map<string, Participant>();
      for (const row of liveRows) {
        const current = byUser.get(row.user_id);
        const seen = row.last_seen ?? row.joined_at;
        const currentSeen = current?.last_seen ?? current?.joined_at;
        if (!current || !currentSeen || seen >= currentSeen) byUser.set(row.user_id, row);
      }
      const rosterRows = sortRoster([...byUser.values()]);

      const userIds = [...new Set(rosterRows.map((p) => p.user_id))];
      let displayNames = new Map<string, string>();

      if (userIds.length > 0) {
        displayNames = await fetchProfileDisplayNames(userIds);
      }

      setParticipants(
        rosterRows.map((p) => mapParticipantRow(p as Record<string, unknown>, displayNames))
      );
    } catch (error) {
      console.error('Failed to fetch participants:', error);
    } finally {
      setIsLoading(false);
    }
  }, [meetingUuid, currentUserId]);

  const ensureCurrentUserParticipant = useCallback(async () => {
    if (!meetingUuid || !currentUserId || !userName) return;

    try {
      // A previous version of this function failed its `left_at` lookup and
      // then inserted a fresh row on every mount, so clean up duplicates too.
      const readOwnRows = async (): Promise<Participant[] | null> => {
        const columns = leftAtColumnSupported === false ? 'id, joined_at' : 'id, left_at, joined_at';
        const { data, error } = await supabase
          .from('meeting_participants')
          .select(columns)
          .eq('meeting_id', meetingUuid)
          .eq('user_id', currentUserId)
          .order('joined_at', { ascending: false });

        if (error && isMissingLeftAtColumn(error)) {
          leftAtColumnSupported = false;
          const retry = await supabase
            .from('meeting_participants')
            .select('id, joined_at')
            .eq('meeting_id', meetingUuid)
            .eq('user_id', currentUserId)
            .order('joined_at', { ascending: false });
          if (retry.error) {
            console.error('Error reading participant row:', retry.error);
            return null;
          }
          return (retry.data ?? []) as unknown as Participant[];
        }

        if (error) {
          console.error('Error reading participant row:', error);
          return null;
        }
        return (data ?? []) as unknown as Participant[];
      };

      const rows = (await readOwnRows()) ?? [];

      if (rows.length === 0) {
        const { data, error } = await supabase
          .from('meeting_participants')
          .insert({
            meeting_id: meetingUuid,
            user_id: currentUserId,
            user_name: userName,
            is_host: isHost,
            is_muted: localMutedRef.current,
          })
          .select('id')
          .single();

        if (error) {
          // 23505 = another tab already inserted this user's row.
          if (error.code !== '23505') console.error('Error adding current user as participant:', error);
          return;
        }
        ownRowIdRef.current = data.id;
        selfLeaveRef.current = false;
        return;
      }

      const [keep, ...duplicates] = rows;
      ownRowIdRef.current = keep.id;
      selfLeaveRef.current = false;

      if (duplicates.length > 0) {
        const { error } = await supabase
          .from('meeting_participants')
          .delete()
          .in('id', duplicates.map((d) => d.id));
        if (error) console.error('Error cleaning duplicate participant rows:', error);
      }

      const updates: Record<string, unknown> = {
        user_name: userName,
        is_host: isHost,
        is_muted: localMutedRef.current,
      };
      if (leftAtColumnSupported !== false) updates.left_at = null;
      if (keep.left_at) updates.joined_at = new Date().toISOString();

      let { error } = await supabase
        .from('meeting_participants')
        .update(updates)
        .eq('id', keep.id);

      if (error && isMissingLeftAtColumn(error)) {
        leftAtColumnSupported = false;
        delete updates.left_at;
        ({ error } = await supabase
          .from('meeting_participants')
          .update(updates)
          .eq('id', keep.id));
      }
      if (error) console.error('Error updating participant row:', error);
    } catch (error) {
      console.error('Failed to add current user as participant:', error);
    }
  }, [meetingUuid, currentUserId, userName, isHost]);

  const updateParticipantStatus = useCallback(
    async (updates: Partial<Participant>) => {
      if (!meetingUuid || !currentUserId) return;

      const updateData: Record<string, unknown> = {};
      if (updates.is_muted !== undefined) updateData.is_muted = updates.is_muted;
      if (updates.is_host !== undefined) updateData.is_host = updates.is_host;

      if (Object.keys(updateData).length === 0) return;

      try {
        const { error } = await supabase
          .from('meeting_participants')
          .update(updateData)
          .eq('meeting_id', meetingUuid)
          .eq('user_id', currentUserId);

        if (error) console.error('Error updating participant status:', error);
      } catch (error) {
        console.error('Error updating participant status:', error);
      }
    },
    [meetingUuid, currentUserId]
  );

  /** Mirror the local microphone state into this user's participant row. */
  const syncLocalMute = useCallback(
    async (muted: boolean) => {
      localMutedRef.current = muted;
      await updateParticipantStatus({ is_muted: muted });
    },
    [updateParticipantStatus]
  );

  /** Host action: flip `is_muted` for someone and actually mute their mic. */
  const setParticipantMuted = useCallback(
    async (targetUserId: string, muted: boolean) => {
      if (!meetingUuid || !currentUserId) return false;

      const { error } = await supabase
        .from('meeting_participants')
        .update({ is_muted: muted })
        .eq('meeting_id', meetingUuid)
        .eq('user_id', targetUserId);

      if (error) {
        console.error('Error updating participant mute status:', error);
        return false;
      }

      setParticipants((prev) =>
        prev.map((p) => (p.user_id === targetUserId ? { ...p, is_muted: muted } : p))
      );

      // Their client listens on `meeting-mute-{userId}`.
      const channel = supabase.channel(`meeting-mute-${targetUserId}`);
      try {
        await sendBroadcastWithRetry(channel, 'mute-toggle', {
          participantId: targetUserId,
          isMuted: muted,
          fromHost: true,
        });
      } finally {
        void supabase.removeChannel(channel);
      }
      return true;
    },
    [meetingUuid, currentUserId]
  );

  /** Host action: drop someone from the roster and tell their client to leave. */
  const kickParticipant = useCallback(
    async (targetUserId: string) => {
      if (!meetingUuid || !currentUserId || !normalizedCode) return false;
      if (targetUserId === currentUserId) return false;

      const { error } = await supabase
        .from('meeting_participants')
        .delete()
        .eq('meeting_id', meetingUuid)
        .eq('user_id', targetUserId);

      if (error) {
        console.error('Error removing participant:', error);
        return false;
      }

      const payload = { userId: targetUserId, by: currentUserId };
      const channel = kickChannelRef.current;
      if (channel) {
        await sendBroadcastWithRetry(channel, 'kick', payload);
      } else {
        const ephemeral = supabase.channel(`meeting-kick-${normalizedCode}`);
        try {
          await sendBroadcastWithRetry(ephemeral, 'kick', payload);
        } finally {
          void supabase.removeChannel(ephemeral);
        }
      }
      return true;
    },
    [meetingUuid, currentUserId, normalizedCode]
  );

  /** Mark *this* user as gone. Falls back to deleting the row when the
   *  deployment has no `left_at` column yet. */
  const removeParticipant = useCallback(async () => {
    if (!meetingUuid || !currentUserId) return;
    selfLeaveRef.current = true;

    if (leftAtColumnSupported !== false) {
      const { error } = await supabase
        .from('meeting_participants')
        .update({ left_at: new Date().toISOString() })
        .eq('meeting_id', meetingUuid)
        .eq('user_id', currentUserId)
        .is('left_at', null);

      if (!error) return;
      if (!isMissingLeftAtColumn(error)) {
        console.error('Error marking participant leave:', error);
        return;
      }
      leftAtColumnSupported = false;
    }

    const { error: deleteError } = await supabase
      .from('meeting_participants')
      .delete()
      .eq('meeting_id', meetingUuid)
      .eq('user_id', currentUserId);

    if (deleteError) console.error('Error clearing participant row:', deleteError);
  }, [meetingUuid, currentUserId]);

  /**
   * Re-publish our own presence row. `last_seen` is what keeps us visible on
   * the roster; `left_at` is cleared so a sweep (or the presence repair
   * migration) that raced us can never erase a live client; `is_muted` keeps
   * the roster's mic state honest — this replaces the old mute keep-alive.
   */
  const heartbeat = useCallback(async () => {
    if (!meetingUuid || !currentUserId || selfLeaveRef.current) return;

    // Row unknown yet — let the ensure path find/create it (it also clears a
    // `left_at` left behind by a previous session or the repair migration).
    if (!ownRowIdRef.current) {
      await ensureCurrentUserParticipant();
      return;
    }

    const payload: Record<string, unknown> = {
      last_seen: new Date().toISOString(),
      is_muted: localMutedRef.current,
    };
    if (leftAtColumnSupported !== false) payload.left_at = null;

    const send = () =>
      supabase
        .from('meeting_participants')
        .update(payload)
        .eq('id', ownRowIdRef.current as string);

    let { error } = await send();
    if (error && isMissingLastSeenColumn(error)) {
      lastSeenColumnSupported = false;
      delete payload.last_seen;
      ({ error } = await send());
    }
    if (error && isMissingLeftAtColumn(error)) {
      leftAtColumnSupported = false;
      delete payload.left_at;
      ({ error } = await send());
    }
    if (error) console.warn('Presence heartbeat failed:', error.message);
  }, [meetingUuid, currentUserId, ensureCurrentUserParticipant]);

  const heartbeatRef = useRef(heartbeat);
  heartbeatRef.current = heartbeat;

  useEffect(() => {
    if (!meetingUuid) return;

    const bootstrap = async () => {
      await ensureCurrentUserParticipant();
      await fetchParticipants();
    };

    void bootstrap();
  }, [meetingUuid, fetchParticipants, ensureCurrentUserParticipant]);

  // Periodic resync — catches missed realtime events and stale display names
  useEffect(() => {
    if (!meetingUuid) return;
    const interval = setInterval(() => {
      void fetchParticipants();
    }, 12_000);
    return () => clearInterval(interval);
  }, [meetingUuid, fetchParticipants]);

  // Re-upsert display name when the user corrects it on join
  useEffect(() => {
    if (!meetingUuid || !currentUserId || !userName.trim()) return;
    void ensureCurrentUserParticipant();
  }, [meetingUuid, currentUserId, userName, ensureCurrentUserParticipant]);

  // Listen for the host kicking *this* user out of the meeting.
  useEffect(() => {
    if (!normalizedCode || !currentUserId) return;

    const channel = supabase.channel(`meeting-kick-${normalizedCode}`);
    channel
      .on('broadcast', { event: 'kick' }, ({ payload }) => {
        const data = payload as { userId?: string };
        if (data?.userId && data.userId === currentUserId) {
          setRemovedFromMeeting(true);
        }
      })
      .subscribe();
    kickChannelRef.current = channel;

    return () => {
      kickChannelRef.current = null;
      supabase.removeChannel(channel);
    };
  }, [normalizedCode, currentUserId]);

  useEffect(() => {
    if (!meetingUuid) return;

    const channel = supabase
      .channel(`meeting-participants-${meetingUuid}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'meeting_participants',
          filter: `meeting_id=eq.${meetingUuid}`,
        },
        (payload) => {
          void (async () => {
            const row = payload.new as Record<string, unknown>;
            const userId = row.user_id as string;
            let displayNames = new Map<string, string>();
            if (userId) {
              displayNames = await fetchProfileDisplayNames([userId]);
            }
            const incoming = mapParticipantRow(row, displayNames);
            if (incoming.user_id === currentUserId && !incoming.left_at) {
              ownRowIdRef.current = incoming.id;
            }
            setParticipants((prev) => {
              if (prev.some((p) => p.id === incoming.id)) return prev;
              // A row that is already gone, or that belongs to a dead session,
              // never enters the roster — this is how ghost rows used to pile up.
              if (incoming.left_at || isStalePresence(incoming)) return prev;

              const alreadyListed = prev.some((p) => p.user_id === incoming.user_id);
              const enriched = prev.find((p) => p.user_id === incoming.user_id);
              const participant = enriched
                ? { ...incoming, user_name: enriched.user_name || incoming.user_name }
                : incoming;
              if (!alreadyListed && participant.user_id !== currentUserId) {
                toastRef.current({
                  title: 'Participant joined',
                  description: `${participant.user_name} joined the meeting`,
                  duration: 3000,
                });
              }
              // One entry per user: a rejoin replaces the previous row instead
              // of stacking a second copy of the same person.
              return sortRoster([
                ...prev.filter((p) => p.user_id !== incoming.user_id),
                participant,
              ]);
            });
          })();
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'meeting_participants',
          filter: `meeting_id=eq.${meetingUuid}`,
        },
        (payload) => {
          void (async () => {
            const row = payload.new as Record<string, unknown>;
            const userId = row.user_id as string;
            let displayNames = new Map<string, string>();
            if (userId) {
              displayNames = await fetchProfileDisplayNames([userId]);
            }
            const updated = mapParticipantRow(row, displayNames);
            const isGone = Boolean(updated.left_at) || isStalePresence(updated);

            // Our own row was retired while we are still here (a sweep, or the
            // presence repair migration) — re-publish immediately instead of
            // waiting for the next heartbeat tick.
            if (updated.user_id === currentUserId && isGone && !selfLeaveRef.current) {
              void heartbeatRef.current();
            }

            setParticipants((prev) => {
              const wasListed = prev.some(
                (p) => p.id === updated.id || p.user_id === updated.user_id
              );
              const others = prev.filter(
                (p) => p.id !== updated.id && p.user_id !== updated.user_id
              );

              if (isGone) {
                // Only announce a departure for someone who was actually on the
                // roster — retiring a ghost row is not an event.
                if (wasListed && updated.user_id !== currentUserId) {
                  toastRef.current({
                    title: 'Participant left',
                    description: `${updated.user_name} left the meeting`,
                    duration: 3000,
                  });
                }
                return sortRoster(others);
              }

              const enriched = prev.find((p) => p.user_id === updated.user_id);
              const participant = enriched
                ? { ...updated, user_name: updated.user_name || enriched.user_name }
                : updated;
              if (!wasListed && participant.user_id !== currentUserId) {
                toastRef.current({
                  title: 'Participant joined',
                  description: `${participant.user_name} joined the meeting`,
                  duration: 3000,
                });
              }
              return sortRoster([...others, participant]);
            });
          })();
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'meeting_participants',
          filter: `meeting_id=eq.${meetingUuid}`,
        },
        (payload) => {
          const left = payload.old as Participant;
          // Backstop for the kick broadcast: our own row disappearing while we
          // are not leaving on our own means the host removed us. Confirm
          // against the roster first — another tab of the same account may
          // have cleaned up a duplicate row, in which case we are still here.
          if (left?.id && left.id === ownRowIdRef.current && !selfLeaveRef.current) {
            window.setTimeout(() => {
              void (async () => {
                const { data, error } = await supabase
                  .from('meeting_participants')
                  .select('id')
                  .eq('meeting_id', meetingUuid)
                  .eq('user_id', currentUserId)
                  .limit(1);
                if (error) return;
                if (!data || data.length === 0) setRemovedFromMeeting(true);
              })();
            }, 700);
          }
          setParticipants((prev) => {
            const next = prev.filter((p) => p.id !== left.id);
            if (left.user_id && left.user_id !== currentUserId) {
              toastRef.current({
                title: 'Participant left',
                description: `${left.user_name} left the meeting`,
                duration: 3000,
              });
            }
            return next;
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [meetingUuid, currentUserId]);

  // Presence heartbeat — every live client re-publishes its row so abandoned
  // sessions (closed tab, crashed webview, an expired anonymous session) stop
  // haunting the roster as ghost participants. Also fires when the tab returns
  // to the foreground so a throttled background tab re-publishes at once.
  useEffect(() => {
    if (!meetingUuid || !currentUserId) return;

    const beat = () => void heartbeatRef.current();
    void heartbeat();
    const interval = window.setInterval(beat, PRESENCE_HEARTBEAT_MS);
    document.addEventListener('visibilitychange', beat);

    return () => {
      window.clearInterval(interval);
      document.removeEventListener('visibilitychange', beat);
    };
  }, [meetingUuid, currentUserId, heartbeat]);

  /**
   * The roster that actually renders: our own row plus rows whose user has a
   * live signalling socket. Rows left behind by dead sessions have no socket,
   * so ghost participants disappear even on deployments whose schema predates
   * the `last_seen` column. Fresh joiners and brief reconnects get a grace
   * window so nobody flickers in and out.
   */
  const visibleParticipants = useMemo(() => {
    if (!presenceSynced) return participants;

    const now = Date.now();
    const nextLastPresent = new Map<string, number>();

    const visible = participants.filter((row) => {
      if (row.user_id === currentUserId || presencePeerIds.has(row.user_id)) {
        nextLastPresent.set(row.user_id, now);
        return true;
      }

      const remembered = lastPresentAtRef.current.get(row.user_id);
      const joinedAt = Date.parse(row.joined_at);
      const baseline = remembered ?? (Number.isNaN(joinedAt) ? now : joinedAt);
      nextLastPresent.set(row.user_id, baseline);
      return now - baseline < PRESENCE_ABSENT_GRACE_MS;
    });

    lastPresentAtRef.current = nextLastPresent;
    return visible;
  }, [participants, presencePeerIds, presenceSynced, currentUserId]);

  return {
    participants: visibleParticipants,
    isLoading,
    meetingUuid,
    meetingHostId,
    removedFromMeeting,
    updateParticipantStatus,
    syncLocalMute,
    setParticipantMuted,
    kickParticipant,
    removeParticipant,
    ensureCurrentUserParticipant,
    refetchParticipants: fetchParticipants,
  };
};
