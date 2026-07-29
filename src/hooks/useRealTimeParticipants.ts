import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { fetchMeetingByCode, fetchProfileDisplayNames } from '@/lib/meetingLookup';
import { parseMeetingCodeFromInput } from '@/lib/meeting';

export interface Participant {
  id: string;
  user_id: string;
  user_name: string;
  is_host: boolean;
  is_muted: boolean;
  joined_at: string;
  is_video_enabled: boolean;
  is_audio_enabled: boolean;
  connection_quality: 'good' | 'poor' | 'disconnected';
  location?: string;
  last_seen: string;
}

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
    user_name: resolvedName || `User ${userId.slice(0, 6)}`,
    is_video_enabled: true,
    is_audio_enabled: !(p.is_muted as boolean),
    connection_quality: 'good',
    last_seen: (p.joined_at as string) ?? new Date().toISOString(),
  };
}

export const useRealTimeParticipants = (
  meetingCode: string,
  currentUserId: string,
  userName: string,
  isHost = false
) => {
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [meetingUuid, setMeetingUuid] = useState<string | null>(null);
  const [meetingHostId, setMeetingHostId] = useState<string | null>(null);
  const { toast } = useToast();
  const toastRef = useRef(toast);
  toastRef.current = toast;

  useEffect(() => {
    let cancelled = false;
    const code = parseMeetingCodeFromInput(meetingCode);
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
  }, [meetingCode]);

  const fetchParticipants = useCallback(async () => {
    if (!meetingUuid) return;

    try {
      const { data, error } = await supabase
        .from('meeting_participants')
        .select('*')
        .eq('meeting_id', meetingUuid)
        .is('left_at', null)
        .order('joined_at', { ascending: true });

      if (error) {
        console.error('Error fetching participants:', error);
        return;
      }

      const rows = data ?? [];
      const userIds = [...new Set(rows.map((p) => p.user_id as string))];
      let displayNames = new Map<string, string>();

      if (userIds.length > 0) {
        displayNames = await fetchProfileDisplayNames(userIds);
      }

      setParticipants(rows.map((p) => mapParticipantRow(p as Record<string, unknown>, displayNames)));
    } catch (error) {
      console.error('Failed to fetch participants:', error);
    } finally {
      setIsLoading(false);
    }
  }, [meetingUuid]);

  const ensureCurrentUserParticipant = useCallback(async () => {
    if (!meetingUuid || !currentUserId || !userName) return;

    try {
      const { data: existing } = await supabase
        .from('meeting_participants')
        .select('id, left_at')
        .eq('meeting_id', meetingUuid)
        .eq('user_id', currentUserId)
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from('meeting_participants')
          .update({
            user_name: userName,
            ...(existing.left_at
              ? { left_at: null, joined_at: new Date().toISOString() }
              : {}),
          })
          .eq('id', existing.id);
        if (error) console.error('Error updating participant row:', error);
        return;
      }

      const { error } = await supabase.from('meeting_participants').insert({
        meeting_id: meetingUuid,
        user_id: currentUserId,
        user_name: userName,
        is_host: isHost,
        is_muted: false,
      });

      if (error) {
        console.error('Error adding current user as participant:', error);
      }
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
        console.error('Failed to update participant status:', error);
      }
    },
    [meetingUuid, currentUserId]
  );

  const removeParticipant = useCallback(async () => {
    if (!meetingUuid || !currentUserId) return;

    try {
      const { error } = await supabase
        .from('meeting_participants')
        .update({ left_at: new Date().toISOString() })
        .eq('meeting_id', meetingUuid)
        .eq('user_id', currentUserId);

      if (error) console.error('Error marking participant leave:', error);
    } catch (error) {
      console.error('Failed to mark participant leave:', error);
    }
  }, [meetingUuid, currentUserId]);

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
            const newParticipant = mapParticipantRow(row, displayNames);
            setParticipants((prev) => {
              if (prev.some((p) => p.id === newParticipant.id)) return prev;
              const enriched = prev.find((p) => p.user_id === newParticipant.user_id);
              const participant = enriched
                ? { ...newParticipant, user_name: enriched.user_name || newParticipant.user_name }
                : newParticipant;
              if (participant.user_id !== currentUserId) {
                toastRef.current({
                  title: 'Participant joined',
                  description: `${participant.user_name} joined the meeting`,
                  duration: 3000,
                });
              }
              return [...prev, participant];
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
            setParticipants((prev) =>
              prev
                .map((p) =>
                  p.id === updated.id
                    ? {
                        ...updated,
                        user_name: updated.user_name || p.user_name,
                      }
                    : p
                )
                .filter((p) => !(payload.new as { left_at?: string | null }).left_at)
            );
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
          setParticipants((prev) => {
            const next = prev.filter((p) => p.id !== left.id);
            if (left.user_id !== currentUserId) {
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

  useEffect(() => {
    if (!meetingUuid || !currentUserId) return;

    const keepAlive = setInterval(() => {
      void updateParticipantStatus({ is_muted: false });
    }, 30_000);

    return () => clearInterval(keepAlive);
  }, [meetingUuid, currentUserId, updateParticipantStatus]);

  return {
    participants,
    isLoading,
    meetingUuid,
    meetingHostId,
    updateParticipantStatus,
    removeParticipant,
    ensureCurrentUserParticipant,
    refetchParticipants: fetchParticipants,
  };
};
