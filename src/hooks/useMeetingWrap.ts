import { useCallback, useState } from 'react';
import { addDays, setHours, setMinutes } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { buildMeetingLink, generateMeetingCode } from '@/lib/meeting';

export interface SaveWrapParams {
  meetingCode: string;
  notes: string;
  agendaCheckedLines?: string[];
  scheduleFollowUp?: {
    title: string;
    scheduledTime: Date;
    durationMinutes?: number;
  };
}

export interface SaveWrapResult {
  ok: boolean;
  followUpMeetingId?: string;
  followUpLink?: string;
  error?: string;
}

/** Default follow-up: tomorrow at the same clock time as now (rounded to hour). */
export function defaultFollowUpTime(from = new Date()): Date {
  const tomorrow = addDays(from, 1);
  return setMinutes(setHours(tomorrow, from.getHours()), 0);
}

/**
 * Persist Regal Wrap notes and optionally create a calendar follow-up meeting.
 */
export const useMeetingWrap = () => {
  const { user } = useAuth();
  const [saving, setSaving] = useState(false);

  const saveWrap = useCallback(
    async (params: SaveWrapParams): Promise<SaveWrapResult> => {
      if (!user) return { ok: false, error: 'Not signed in' };

      setSaving(true);
      try {
        const notesParts = [params.notes.trim()];
        if (params.agendaCheckedLines?.length) {
          notesParts.push(
            '',
            'Agenda progress:',
            ...params.agendaCheckedLines.map((line) => `✓ ${line}`)
          );
        }
        const notes = notesParts.filter(Boolean).join('\n').trim();

        const { error: wrapError } = await supabase.rpc('save_meeting_wrap', {
          p_meeting_code: params.meetingCode,
          p_notes: notes || '',
        });

        // Fallback if RPC not migrated yet: host-only update
        if (wrapError) {
          const { error: directError } = await supabase
            .from('meetings')
            .update({
              wrap_notes: notes || null,
              wrap_completed_at: new Date().toISOString(),
            })
            .ilike('meeting_id', params.meetingCode)
            .eq('host_id', user.id);

          if (directError) {
            console.warn('Wrap save failed:', wrapError, directError);
          }
        }

        if (!params.scheduleFollowUp) {
          return { ok: true };
        }

        const followCode = generateMeetingCode();
        const link = buildMeetingLink(followCode);
        const duration = params.scheduleFollowUp.durationMinutes ?? 30;

        const { data: scheduled, error: schedError } = await supabase
          .from('scheduled_meetings')
          .insert({
            meeting_id: followCode,
            title: params.scheduleFollowUp.title,
            host_id: user.id,
            scheduled_time: params.scheduleFollowUp.scheduledTime.toISOString(),
            duration_minutes: duration,
            is_recurring: false,
            meeting_link: link,
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            follow_up_of_meeting_id: params.meetingCode.toUpperCase(),
            brief_agenda: params.agendaCheckedLines?.length
              ? `Follow-up from ${params.meetingCode}\n\nOpen items:\n${params.agendaCheckedLines
                  .filter((l) => !l.startsWith('✓'))
                  .join('\n')}`
              : `Follow-up from meeting ${params.meetingCode}`,
          })
          .select('meeting_id, meeting_link')
          .single();

        if (schedError) throw schedError;

        return {
          ok: true,
          followUpMeetingId: scheduled.meeting_id,
          followUpLink: scheduled.meeting_link ?? link,
        };
      } catch (err) {
        console.error('saveWrap:', err);
        return {
          ok: false,
          error: err instanceof Error ? err.message : 'Could not save wrap',
        };
      } finally {
        setSaving(false);
      }
    },
    [user]
  );

  return { saveWrap, saving, defaultFollowUpTime };
};
