-- Public scheduling: secure RPCs for anonymous booking pages

CREATE OR REPLACE FUNCTION public.get_scheduling_busy_times(
  p_slug text,
  p_from timestamptz DEFAULT now(),
  p_to timestamptz DEFAULT (now() + interval '14 days')
)
RETURNS TABLE(start_time timestamptz, end_time timestamptz)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
BEGIN
  SELECT l.user_id INTO v_user_id
  FROM public.calendar_scheduling_links l
  WHERE l.slug = p_slug AND l.is_active = true;

  IF v_user_id IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT ce.start_time, ce.end_time
  FROM public.calendar_events ce
  WHERE ce.user_id = v_user_id
    AND ce.end_time > p_from
    AND ce.start_time < p_to
  ORDER BY ce.start_time;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_scheduling_work_hours(p_slug text)
RETURNS TABLE(work_start time, work_end time, work_days integer[])
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
BEGIN
  SELECT l.user_id INTO v_user_id
  FROM public.calendar_scheduling_links l
  WHERE l.slug = p_slug AND l.is_active = true;

  IF v_user_id IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    COALESCE(p.work_start, '09:00'::time),
    COALESCE(p.work_end, '17:00'::time),
    COALESCE(p.work_days, ARRAY[1,2,3,4,5])
  FROM public.calendar_user_preferences p
  WHERE p.user_id = v_user_id
  UNION ALL
  SELECT '09:00'::time, '17:00'::time, ARRAY[1,2,3,4,5]
  WHERE NOT EXISTS (
    SELECT 1 FROM public.calendar_user_preferences p2 WHERE p2.user_id = v_user_id
  )
  LIMIT 1;
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

  INSERT INTO public.calendar_events (
    user_id, title, start_time, end_time, color, attendees, location
  ) VALUES (
    v_link.user_id,
    v_link.title || ' with ' || trim(p_guest_name),
    p_start_time,
    v_end_time,
    'orange',
    ARRAY[v_email],
    NULL
  )
  RETURNING id INTO v_event_id;

  RETURN v_event_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_scheduling_busy_times(text, timestamptz, timestamptz) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_scheduling_work_hours(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.book_scheduling_slot(text, text, text, timestamptz) TO anon, authenticated;
