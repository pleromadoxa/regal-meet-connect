import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { buildMeetingLink } from '@/lib/meeting';

export interface RegalBriefInvitee {
  invitee_email: string;
  invitee_name: string | null;
  status: string;
}

export interface RegalBriefData {
  meetingCode: string;
  title: string;
  scheduledMeetingId: string | null;
  hostId: string | null;
  agenda: string;
  invitees: RegalBriefInvitee[];
  joinLink: string;
  startTime: string | null;
  endTime: string | null;
  wrapNotes: string | null;
  isFollowUp: boolean;
  followUpOfMeetingId: string | null;
}

interface UseRegalBriefOptions {
  meetingCode?: string | null;
  scheduledMeetingId?: string | null;
  enabled?: boolean;
}

/**
 * Shared Brief data for Calendar drawer and in-meeting panel.
 * Resolves by meeting code and/or scheduled meeting id.
 */
export const useRegalBrief = ({
  meetingCode,
  scheduledMeetingId,
  enabled = true,
}: UseRegalBriefOptions) => {
  const { user } = useAuth();
  const [data, setData] = useState<RegalBriefData | null>(null);
  const [loading, setLoading] = useState(false);
  const [savingAgenda, setSavingAgenda] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const code = meetingCode?.trim().toUpperCase() || null;

  const canEditAgenda = Boolean(
    user && data?.scheduledMeetingId && data.hostId === user.id
  );

  const refetch = useCallback(async () => {
    if (!enabled || (!code && !scheduledMeetingId)) {
      setData(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      let schedId = scheduledMeetingId ?? null;
      let meetingRow: {
        meeting_id: string;
        title: string;
        brief_agenda: string | null;
        host_id: string;
        scheduled_time: string;
        duration_minutes: number;
        meeting_link: string | null;
        follow_up_of_meeting_id: string | null;
      } | null = null;

      if (schedId) {
        const { data: row } = await supabase
          .from('scheduled_meetings')
          .select(
            'meeting_id, title, brief_agenda, host_id, scheduled_time, duration_minutes, meeting_link, follow_up_of_meeting_id'
          )
          .eq('id', schedId)
          .maybeSingle();
        meetingRow = row;
      } else if (code) {
        const { data: row } = await supabase
          .from('scheduled_meetings')
          .select(
            'id, meeting_id, title, brief_agenda, host_id, scheduled_time, duration_minutes, meeting_link, follow_up_of_meeting_id'
          )
          .ilike('meeting_id', code)
          .order('scheduled_time', { ascending: false })
          .limit(1)
          .maybeSingle();
        if (row) {
          schedId = row.id;
          meetingRow = row;
        }
      }

      let wrapNotes: string | null = null;
      let liveTitle: string | null = null;
      const lookupCode = meetingRow?.meeting_id?.toUpperCase() ?? code;

      if (lookupCode) {
        const { data: live } = await supabase
          .from('meetings')
          .select('title, wrap_notes')
          .ilike('meeting_id', lookupCode)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        wrapNotes = live?.wrap_notes ?? null;
        liveTitle = live?.title ?? null;
      }

      let invitees: RegalBriefInvitee[] = [];
      if (schedId) {
        const { data: inv } = await supabase
          .from('meeting_invitations')
          .select('invitee_email, invitee_name, status')
          .eq('scheduled_meeting_id', schedId);
        invitees = inv ?? [];
      }

      if (!meetingRow && !lookupCode) {
        setData(null);
        return;
      }

      const start = meetingRow ? new Date(meetingRow.scheduled_time) : null;
      const end =
        meetingRow && start
          ? new Date(start.getTime() + meetingRow.duration_minutes * 60_000)
          : null;

      const resolvedCode = (meetingRow?.meeting_id ?? lookupCode ?? '').toUpperCase();

      setData({
        meetingCode: resolvedCode,
        title: meetingRow?.title ?? liveTitle ?? 'Regal Meeting',
        scheduledMeetingId: schedId,
        hostId: meetingRow?.host_id ?? null,
        agenda: meetingRow?.brief_agenda ?? '',
        invitees,
        joinLink:
          meetingRow?.meeting_link ?? (resolvedCode ? buildMeetingLink(resolvedCode) : ''),
        startTime: start?.toISOString() ?? null,
        endTime: end?.toISOString() ?? null,
        wrapNotes,
        isFollowUp: Boolean(meetingRow?.follow_up_of_meeting_id),
        followUpOfMeetingId: meetingRow?.follow_up_of_meeting_id ?? null,
      });
    } catch (err) {
      console.error('useRegalBrief:', err);
      setError(err instanceof Error ? err.message : 'Failed to load Brief');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [code, enabled, scheduledMeetingId]);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  const saveAgenda = useCallback(
    async (agenda: string) => {
      if (!data?.scheduledMeetingId || !canEditAgenda) return false;
      setSavingAgenda(true);
      try {
        const { error: updateError } = await supabase
          .from('scheduled_meetings')
          .update({ brief_agenda: agenda.trim() || null })
          .eq('id', data.scheduledMeetingId);
        if (updateError) throw updateError;
        setData((prev) => (prev ? { ...prev, agenda: agenda.trim() } : prev));
        return true;
      } catch (err) {
        console.error('saveAgenda:', err);
        return false;
      } finally {
        setSavingAgenda(false);
      }
    },
    [canEditAgenda, data?.scheduledMeetingId]
  );

  return {
    data,
    loading,
    error,
    canEditAgenda,
    savingAgenda,
    saveAgenda,
    refetch,
    setLocalAgenda: (agenda: string) =>
      setData((prev) => (prev ? { ...prev, agenda } : prev)),
  };
};
