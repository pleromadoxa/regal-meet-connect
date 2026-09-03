import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useToast } from './use-toast';
import type { ScheduledMeeting } from './useScheduledMeetings';
import { expandRecurringEvents, type RecurrencePattern } from '@/lib/calendarRecurrence';
import { findConflicts } from '@/lib/calendarConflicts';

export interface CalendarEvent {
  id: string;
  user_id: string;
  title: string;
  description?: string | null;
  start_time: string;
  end_time: string;
  color: string;
  is_all_day: boolean;
  location?: string | null;
  attendees: string[];
  created_at: string;
  updated_at: string;
  recurrence_pattern?: string | null;
  recurrence_end_date?: string | null;
  team_calendar_id?: string | null;
  visibility?: string | null;
  reminder_minutes?: number | null;
  source?: 'event' | 'meeting';
  meeting_id?: string;
  is_invited?: boolean;
}

export interface CreateCalendarEventParams {
  title: string;
  description?: string;
  startTime: Date;
  endTime: Date;
  color?: string;
  isAllDay?: boolean;
  location?: string;
  attendees?: string[];
  recurrencePattern?: RecurrencePattern | null;
  recurrenceEndDate?: Date | null;
  teamCalendarId?: string | null;
  visibility?: 'private' | 'team' | 'public';
  reminderMinutes?: number | null;
  skipConflictCheck?: boolean;
}

export interface UpdateCalendarEventParams extends CreateCalendarEventParams {
  id: string;
}

const LOCAL_STORAGE_KEY = 'regal-calendar-events';

function loadLocalEvents(userId: string): CalendarEvent[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Record<string, CalendarEvent[]>;
    return parsed[userId] ?? [];
  } catch {
    return [];
  }
}

function saveLocalEvents(userId: string, events: CalendarEvent[]) {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    const parsed = raw ? (JSON.parse(raw) as Record<string, CalendarEvent[]>) : {};
    parsed[userId] = events;
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(parsed));
  } catch {
    /* ignore */
  }
}

function meetingToCalendarEvent(meeting: ScheduledMeeting, isInvited = false): CalendarEvent {
  const start = new Date(meeting.scheduled_time);
  const end = new Date(start.getTime() + meeting.duration_minutes * 60_000);
  return {
    id: `meeting-${meeting.id}`,
    user_id: meeting.host_id,
    title: meeting.title,
    description: meeting.description,
    start_time: start.toISOString(),
    end_time: end.toISOString(),
    color: 'orange',
    is_all_day: false,
    location: meeting.meeting_link,
    attendees: [],
    created_at: meeting.created_at,
    updated_at: meeting.updated_at,
    source: 'meeting',
    meeting_id: meeting.meeting_id,
    is_invited: isInvited,
  };
}

function dedupeMeetings(events: CalendarEvent[]): CalendarEvent[] {
  const seen = new Set<string>();
  return events.filter((ev) => {
    if (ev.source !== 'meeting') return true;
    const key = ev.id.replace(/^meeting-/, '');
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export const useCalendarEvents = () => {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [useLocalFallback, setUseLocalFallback] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  const fetchHostedMeetings = useCallback(async (): Promise<CalendarEvent[]> => {
    if (!user) return [];

    const { data, error } = await supabase
      .from('scheduled_meetings')
      .select('*')
      .eq('host_id', user.id)
      .neq('status', 'cancelled')
      .order('scheduled_time', { ascending: true });

    if (error) {
      console.error('Error fetching hosted meetings:', error);
      return [];
    }

    return (data ?? []).map((m) => meetingToCalendarEvent(m, false));
  }, [user]);

  const fetchInvitedMeetings = useCallback(async (): Promise<CalendarEvent[]> => {
    if (!user?.email) return [];

    const { data: invitations, error: invError } = await supabase
      .from('meeting_invitations')
      .select('scheduled_meeting_id, status')
      .eq('invitee_email', user.email)
      .in('status', ['pending', 'accepted']);

    if (invError || !invitations?.length) return [];

    const meetingIds = invitations.map((i) => i.scheduled_meeting_id);
    const { data: meetings, error } = await supabase
      .from('scheduled_meetings')
      .select('*')
      .in('id', meetingIds)
      .neq('status', 'cancelled');

    if (error) {
      console.error('Error fetching invited meetings:', error);
      return [];
    }

    return (meetings ?? [])
      .filter((m) => m.host_id !== user.id)
      .map((m) => meetingToCalendarEvent(m, true));
  }, [user]);

  const fetchCalendarEvents = useCallback(async (): Promise<CalendarEvent[]> => {
    if (!user) return [];

    const { data, error } = await supabase
      .from('calendar_events')
      .select('*')
      .order('start_time', { ascending: true });

    if (error) {
      if (error.code === '42P01' || error.message.includes('does not exist')) {
        setUseLocalFallback(true);
        return loadLocalEvents(user.id).map((e) => ({ ...e, source: 'event' as const }));
      }
      throw error;
    }

    setUseLocalFallback(false);
    return (data ?? []).map((e) => ({ ...e, source: 'event' as const }));
  }, [user]);

  const refetchAll = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [calendarEvents, hosted, invited] = await Promise.all([
        fetchCalendarEvents().catch(() => {
          setUseLocalFallback(true);
          return loadLocalEvents(user.id).map((e) => ({ ...e, source: 'event' as const }));
        }),
        fetchHostedMeetings(),
        fetchInvitedMeetings(),
      ]);
      const merged = dedupeMeetings([...calendarEvents, ...hosted, ...invited]);
      merged.sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());
      setEvents(merged);
    } catch (err) {
      console.error('Error fetching calendar:', err);
      const local = loadLocalEvents(user.id).map((e) => ({ ...e, source: 'event' as const }));
      const meetings = await fetchHostedMeetings();
      setEvents(dedupeMeetings([...local, ...meetings]));
      setUseLocalFallback(true);
    } finally {
      setLoading(false);
    }
  }, [user, fetchCalendarEvents, fetchHostedMeetings, fetchInvitedMeetings]);

  const createEvent = async (params: CreateCalendarEventParams) => {
    if (!user) throw new Error('Not authenticated');

    if (!params.skipConflictCheck) {
      const conflicts = findConflicts(events, params.startTime, params.endTime);
      if (conflicts.length > 0) {
        const names = conflicts.slice(0, 2).map((c) => c.event.title).join(', ');
        toast({
          title: 'Schedule conflict',
          description: `Overlaps with: ${names}${conflicts.length > 2 ? '…' : ''}`,
          variant: 'destructive',
        });
        throw new Error('conflict');
      }
    }

    const payload = {
      user_id: user.id,
      title: params.title,
      description: params.description ?? null,
      start_time: params.startTime.toISOString(),
      end_time: params.endTime.toISOString(),
      color: params.color ?? 'orange',
      is_all_day: params.isAllDay ?? false,
      location: params.location ?? null,
      attendees: params.attendees ?? [],
      recurrence_pattern: params.recurrencePattern ?? null,
      recurrence_end_date: params.recurrenceEndDate?.toISOString() ?? null,
      team_calendar_id: params.teamCalendarId ?? null,
      visibility: params.visibility ?? 'private',
      reminder_minutes: params.reminderMinutes ?? null,
    };

    if (useLocalFallback) {
      const newEvent: CalendarEvent = {
        id: crypto.randomUUID(),
        ...payload,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        source: 'event',
      };
      const updated = [...loadLocalEvents(user.id), newEvent];
      saveLocalEvents(user.id, updated);
      setEvents((prev) => [...prev, newEvent].sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime()));
      return newEvent;
    }

    const { data, error } = await supabase.from('calendar_events').insert(payload).select().single();
    if (error) throw error;
    const created = { ...data, source: 'event' as const };
    setEvents((prev) => [...prev, created].sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime()));
    return created;
  };

  const updateEvent = async (params: UpdateCalendarEventParams) => {
    if (!user) throw new Error('Not authenticated');
    if (params.id.startsWith('meeting-')) {
      toast({ title: 'Meeting event', description: 'Edit scheduled meetings from your dashboard.' });
      return;
    }

    const payload = {
      title: params.title,
      description: params.description ?? null,
      start_time: params.startTime.toISOString(),
      end_time: params.endTime.toISOString(),
      color: params.color ?? 'orange',
      is_all_day: params.isAllDay ?? false,
      location: params.location ?? null,
      attendees: params.attendees ?? [],
      recurrence_pattern: params.recurrencePattern ?? null,
      recurrence_end_date: params.recurrenceEndDate?.toISOString() ?? null,
      team_calendar_id: params.teamCalendarId ?? null,
      visibility: params.visibility ?? 'private',
      reminder_minutes: params.reminderMinutes ?? null,
    };

    if (useLocalFallback) {
      const updated = loadLocalEvents(user.id).map((e) =>
        e.id === params.id
          ? { ...e, ...payload, updated_at: new Date().toISOString(), source: 'event' as const }
          : e
      );
      saveLocalEvents(user.id, updated);
      setEvents((prev) =>
        prev
          .map((e) => (e.id === params.id ? { ...e, ...payload, source: 'event' as const } : e))
          .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())
      );
      return;
    }

    const { data, error } = await supabase
      .from('calendar_events')
      .update(payload)
      .eq('id', params.id)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) throw error;
    const updated = { ...data, source: 'event' as const };
    setEvents((prev) =>
      prev
        .map((e) => (e.id === params.id ? updated : e))
        .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())
    );
    return updated;
  };

  const deleteEvent = async (eventId: string) => {
    if (!user) return;
    if (eventId.startsWith('meeting-')) {
      toast({ title: 'Meeting event', description: 'Cancel the meeting from your dashboard.' });
      return;
    }

    if (useLocalFallback) {
      const updated = loadLocalEvents(user.id).filter((e) => e.id !== eventId);
      saveLocalEvents(user.id, updated);
      setEvents((prev) => prev.filter((e) => e.id !== eventId));
      return;
    }

    const { error } = await supabase.from('calendar_events').delete().eq('id', eventId).eq('user_id', user.id);
    if (error) throw error;
    setEvents((prev) => prev.filter((e) => e.id !== eventId));
  };

  useEffect(() => {
    if (user) refetchAll();
  }, [user, refetchAll]);

  const displayEvents = useMemo(() => expandRecurringEvents(events), [events]);

  const eventsByDate = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    for (const ev of displayEvents) {
      const key = ev.start_time.slice(0, 10);
      const list = map.get(key) ?? [];
      list.push(ev);
      map.set(key, list);
    }
    return map;
  }, [displayEvents]);

  const upcomingEvents = useMemo(() => {
    const now = Date.now();
    return displayEvents.filter((ev) => new Date(ev.end_time).getTime() >= now).slice(0, 5);
  }, [displayEvents]);

  const checkConflicts = useCallback(
    (start: Date, end: Date, excludeId?: string) => findConflicts(displayEvents, start, end, excludeId),
    [displayEvents]
  );

  return {
    events: displayEvents,
    rawEvents: events,
    eventsByDate,
    upcomingEvents,
    loading,
    createEvent,
    updateEvent,
    deleteEvent,
    refetch: refetchAll,
    checkConflicts,
    useLocalFallback,
  };
};
