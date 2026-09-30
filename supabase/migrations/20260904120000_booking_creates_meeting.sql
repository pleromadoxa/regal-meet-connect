-- Booking with Regal Meeting: atomically create scheduled_meeting + join link

CREATE OR REPLACE FUNCTION public.generate_meeting_code()
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  chars text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  result text := '';
  i int;
  attempts int := 0;
BEGIN
  LOOP
    result := '';
    FOR i IN 1..8 LOOP
      result := result || substr(chars, floor(random() * length(chars) + 1)::int, 1);
    END LOOP;
    EXIT WHEN NOT EXISTS (
      SELECT 1 FROM public.scheduled_meetings sm WHERE sm.meeting_id = result
    );
    attempts := attempts + 1;
    IF attempts > 20 THEN
      RAISE EXCEPTION 'Could not generate unique meeting code';
    END IF;
  END LOOP;
  RETURN result;
END;
$$;

CREATE OR REPLACE FUNCTION public.book_scheduling_slot(
  p_slug text,
  p_guest_name text,
  p_guest_email text,
  p_start_time timestamptz
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_link public.calendar_scheduling_links%ROWTYPE;
  v_end_time timestamptz;
  v_event_id uuid;
  v_email text;
  v_meeting_code text;
  v_meeting_link text;
  v_scheduled_id uuid;
BEGIN
  v_email := lower(trim(p_guest_email));
  IF p_guest_name IS NULL OR trim(p_guest_name) = '' OR v_email = '' OR v_email !~ '^[^@]+@[^@]+\.[^@]+$' THEN
    RAISE EXCEPTION 'Invalid guest details';
  END IF;

  SELECT * INTO v_link
  FROM public.calendar_scheduling_links
  WHERE slug = p_slug AND is_active = true;

  IF v_link.id IS NULL THEN
    RAISE EXCEPTION 'Scheduling link not found';
  END IF;

  IF p_start_time < now() THEN
    RAISE EXCEPTION 'Cannot book a time in the past';
  END IF;

  v_end_time := p_start_time + (v_link.duration_minutes || ' minutes')::interval;

  IF EXISTS (
    SELECT 1 FROM public.calendar_events ce
    WHERE ce.user_id = v_link.user_id
      AND ce.start_time < v_end_time + (v_link.buffer_minutes || ' minutes')::interval
      AND ce.end_time > p_start_time - (v_link.buffer_minutes || ' minutes')::interval
  ) THEN
    RAISE EXCEPTION 'Time slot is no longer available';
  END IF;

  v_meeting_link := NULL;
  IF v_link.create_meeting THEN
    v_meeting_code := public.generate_meeting_code();
    v_meeting_link := 'https://meet.regalmesh.com/meeting/' || v_meeting_code;

    INSERT INTO public.scheduled_meetings (
      meeting_id, title, host_id, scheduled_time, duration_minutes,
      meeting_link, status, timezone
    ) VALUES (
      v_meeting_code,
      v_link.title || ' with ' || trim(p_guest_name),
      v_link.user_id,
      p_start_time,
      v_link.duration_minutes,
      v_meeting_link,
      'scheduled',
      'UTC'
    )
    RETURNING id INTO v_scheduled_id;

    INSERT INTO public.meeting_invitations (
      scheduled_meeting_id, invitee_email, invitee_name, status
    ) VALUES (
      v_scheduled_id, v_email, trim(p_guest_name), 'accepted'
    );
  END IF;

  INSERT INTO public.calendar_events (
    user_id, title, start_time, end_time, color, attendees, location
  ) VALUES (
    v_link.user_id,
    v_link.title || ' with ' || trim(p_guest_name),
    p_start_time,
    v_end_time,
    'orange',
    ARRAY[v_email],
    v_meeting_link
  )
  RETURNING id INTO v_event_id;

  RETURN v_event_id;
END;
$$;
