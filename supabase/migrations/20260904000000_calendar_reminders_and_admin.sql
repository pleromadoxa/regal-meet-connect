-- Calendar email reminders + admin analytics

CREATE TABLE IF NOT EXISTS public.calendar_reminder_sent (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_type text NOT NULL CHECK (source_type IN ('calendar_event', 'scheduled_meeting')),
  source_id uuid NOT NULL,
  recipient_email text NOT NULL,
  reminder_minutes integer NOT NULL,
  sent_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (source_type, source_id, recipient_email, reminder_minutes)
);

CREATE INDEX IF NOT EXISTS idx_calendar_reminder_sent_source
  ON public.calendar_reminder_sent (source_type, source_id);

ALTER TABLE public.calendar_reminder_sent ENABLE ROW LEVEL SECURITY;

-- Only service role / edge functions write; no client access needed
DROP POLICY IF EXISTS calendar_reminder_sent_deny ON public.calendar_reminder_sent;
CREATE POLICY calendar_reminder_sent_deny ON public.calendar_reminder_sent
  FOR ALL TO authenticated, anon USING (false);

CREATE OR REPLACE FUNCTION public.get_due_calendar_reminders(p_window_minutes integer DEFAULT 5)
RETURNS TABLE (
  source_type text,
  source_id uuid,
  recipient_email text,
  recipient_name text,
  title text,
  start_time timestamptz,
  end_time timestamptz,
  location text,
  description text,
  reminder_minutes integer,
  host_email text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  -- Calendar event owners
  SELECT
    'calendar_event'::text,
    ce.id,
    lower(u.email::text),
    COALESCE(p.display_name, split_part(u.email, '@', 1)),
    ce.title,
    ce.start_time,
    ce.end_time,
    ce.location,
    ce.description,
    COALESCE(ce.reminder_minutes, cp.default_reminder_minutes, 15),
    lower(u.email::text)
  FROM public.calendar_events ce
  JOIN auth.users u ON u.id = ce.user_id
  LEFT JOIN public.profiles p ON p.id = ce.user_id
  LEFT JOIN public.calendar_user_preferences cp ON cp.user_id = ce.user_id
  LEFT JOIN public.user_settings us ON us.user_id = ce.user_id
  WHERE COALESCE(ce.reminder_minutes, cp.default_reminder_minutes, 15) > 0
    AND ce.start_time > now()
    AND COALESCE(us.email_notifications, true) = true
    AND COALESCE(us.meeting_reminders, true) = true
    AND ce.start_time - (COALESCE(ce.reminder_minutes, cp.default_reminder_minutes, 15) || ' minutes')::interval
        BETWEEN now() AND now() + (p_window_minutes || ' minutes')::interval
    AND NOT EXISTS (
      SELECT 1 FROM public.calendar_reminder_sent crs
      WHERE crs.source_type = 'calendar_event'
        AND crs.source_id = ce.id
        AND crs.recipient_email = lower(u.email::text)
        AND crs.reminder_minutes = COALESCE(ce.reminder_minutes, cp.default_reminder_minutes, 15)
    )

  UNION ALL

  -- Calendar event attendees
  SELECT
    'calendar_event'::text,
    ce.id,
    lower(trim(att.email)),
    split_part(trim(att.email), '@', 1),
    ce.title,
    ce.start_time,
    ce.end_time,
    ce.location,
    ce.description,
    COALESCE(ce.reminder_minutes, cp.default_reminder_minutes, 15),
    lower(host.email::text)
  FROM public.calendar_events ce
  JOIN auth.users host ON host.id = ce.user_id
  LEFT JOIN public.calendar_user_preferences cp ON cp.user_id = ce.user_id
  CROSS JOIN LATERAL unnest(ce.attendees) AS att(email)
  WHERE trim(att.email) <> ''
    AND COALESCE(ce.reminder_minutes, cp.default_reminder_minutes, 15) > 0
    AND ce.start_time > now()
    AND ce.start_time - (COALESCE(ce.reminder_minutes, cp.default_reminder_minutes, 15) || ' minutes')::interval
        BETWEEN now() AND now() + (p_window_minutes || ' minutes')::interval
    AND NOT EXISTS (
      SELECT 1 FROM public.calendar_reminder_sent crs
      WHERE crs.source_type = 'calendar_event'
        AND crs.source_id = ce.id
        AND crs.recipient_email = lower(trim(att.email))
        AND crs.reminder_minutes = COALESCE(ce.reminder_minutes, cp.default_reminder_minutes, 15)
    )

  UNION ALL

  -- Scheduled meeting hosts
  SELECT
    'scheduled_meeting'::text,
    sm.id,
    lower(u.email::text),
    COALESCE(p.display_name, split_part(u.email, '@', 1)),
    sm.title,
    sm.scheduled_time,
    sm.scheduled_time + (sm.duration_minutes || ' minutes')::interval,
    sm.meeting_link,
    sm.description,
    15,
    lower(u.email::text)
  FROM public.scheduled_meetings sm
  JOIN auth.users u ON u.id = sm.host_id
  LEFT JOIN public.profiles p ON p.id = sm.host_id
  LEFT JOIN public.user_settings us ON us.user_id = sm.host_id
  WHERE sm.status = 'scheduled'
    AND sm.scheduled_time > now()
    AND COALESCE(us.email_notifications, true) = true
    AND COALESCE(us.meeting_reminders, true) = true
    AND sm.scheduled_time - interval '15 minutes'
        BETWEEN now() AND now() + (p_window_minutes || ' minutes')::interval
    AND NOT EXISTS (
      SELECT 1 FROM public.calendar_reminder_sent crs
      WHERE crs.source_type = 'scheduled_meeting'
        AND crs.source_id = sm.id
        AND crs.recipient_email = lower(u.email::text)
        AND crs.reminder_minutes = 15
    )

  UNION ALL

  -- Scheduled meeting invitees
  SELECT
    'scheduled_meeting'::text,
    sm.id,
    lower(mi.invitee_email),
    COALESCE(mi.invitee_name, split_part(mi.invitee_email, '@', 1)),
    sm.title,
    sm.scheduled_time,
    sm.scheduled_time + (sm.duration_minutes || ' minutes')::interval,
    sm.meeting_link,
    sm.description,
    15,
    lower(host.email::text)
  FROM public.scheduled_meetings sm
  JOIN auth.users host ON host.id = sm.host_id
  JOIN public.meeting_invitations mi ON mi.scheduled_meeting_id = sm.id
  WHERE sm.status = 'scheduled'
    AND sm.scheduled_time > now()
    AND trim(mi.invitee_email) <> ''
    AND sm.scheduled_time - interval '15 minutes'
        BETWEEN now() AND now() + (p_window_minutes || ' minutes')::interval
    AND NOT EXISTS (
      SELECT 1 FROM public.calendar_reminder_sent crs
      WHERE crs.source_type = 'scheduled_meeting'
        AND crs.source_id = sm.id
        AND crs.recipient_email = lower(mi.invitee_email)
        AND crs.reminder_minutes = 15
    );
END;
$$;

CREATE OR REPLACE FUNCTION public.mark_calendar_reminder_sent(
  p_source_type text,
  p_source_id uuid,
  p_recipient_email text,
  p_reminder_minutes integer
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.calendar_reminder_sent (source_type, source_id, recipient_email, reminder_minutes)
  VALUES (p_source_type, p_source_id, lower(trim(p_recipient_email)), p_reminder_minutes)
  ON CONFLICT (source_type, source_id, recipient_email, reminder_minutes) DO NOTHING;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_calendar_admin_stats()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result json;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'Access denied. Admin role required.';
  END IF;

  SELECT json_build_object(
    'total_team_calendars', (SELECT count(*)::int FROM public.team_calendars),
    'total_team_members', (SELECT count(*)::int FROM public.team_calendar_members),
    'total_calendar_events', (SELECT count(*)::int FROM public.calendar_events),
    'team_calendar_events', (SELECT count(*)::int FROM public.calendar_events WHERE team_calendar_id IS NOT NULL),
    'total_scheduling_links', (SELECT count(*)::int FROM public.calendar_scheduling_links),
    'active_scheduling_links', (SELECT count(*)::int FROM public.calendar_scheduling_links WHERE is_active = true),
    'events_this_week', (
      SELECT count(*)::int FROM public.calendar_events
      WHERE start_time >= date_trunc('week', now())
        AND start_time < date_trunc('week', now()) + interval '1 week'
    ),
    'reminders_sent_30d', (
      SELECT count(*)::int FROM public.calendar_reminder_sent
      WHERE sent_at >= now() - interval '30 days'
    ),
    'public_bookings_30d', (
      SELECT count(*)::int FROM public.calendar_events
      WHERE created_at >= now() - interval '30 days'
        AND cardinality(attendees) > 0
        AND title LIKE '% with %'
    ),
    'team_calendars', COALESCE((
      SELECT json_agg(row_to_json(t) ORDER BY t.event_count DESC, t.created_at DESC)
      FROM (
        SELECT
          tc.id,
          tc.name,
          tc.color,
          tc.created_at,
          u.email AS owner_email,
          p.display_name AS owner_name,
          (SELECT count(*)::int FROM public.team_calendar_members m WHERE m.team_calendar_id = tc.id) AS member_count,
          (SELECT count(*)::int FROM public.calendar_events e WHERE e.team_calendar_id = tc.id) AS event_count
        FROM public.team_calendars tc
        JOIN auth.users u ON u.id = tc.owner_id
        LEFT JOIN public.profiles p ON p.id = tc.owner_id
        ORDER BY tc.created_at DESC
        LIMIT 50
      ) t
    ), '[]'::json),
    'scheduling_links', COALESCE((
      SELECT json_agg(row_to_json(l) ORDER BY l.created_at DESC)
      FROM (
        SELECT
          sl.id,
          sl.slug,
          sl.title,
          sl.duration_minutes,
          sl.is_active,
          sl.create_meeting,
          sl.created_at,
          u.email AS owner_email
        FROM public.calendar_scheduling_links sl
        JOIN auth.users u ON u.id = sl.user_id
        ORDER BY sl.created_at DESC
        LIMIT 30
      ) l
    ), '[]'::json)
  ) INTO result;

  RETURN result;
END;
$$;

REVOKE ALL ON FUNCTION public.get_due_calendar_reminders(integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.mark_calendar_reminder_sent(text, uuid, text, integer) FROM PUBLIC;
