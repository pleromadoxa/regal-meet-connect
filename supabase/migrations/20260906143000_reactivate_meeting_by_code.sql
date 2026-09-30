-- Mirror mobile: host can reopen ended meeting codes from Recents / join again.
CREATE OR REPLACE FUNCTION public.get_hosted_meeting_by_code(p_code text)
RETURNS TABLE (
  id uuid,
  meeting_id text,
  host_id uuid,
  title text,
  is_active boolean,
  status text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT m.id, m.meeting_id, m.host_id, m.title, m.is_active, m.status
  FROM public.meetings m
  WHERE upper(trim(m.meeting_id)) = upper(trim(p_code))
    AND auth.uid() IS NOT NULL
    AND m.host_id = auth.uid()
  ORDER BY m.created_at DESC NULLS LAST
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.get_hosted_meeting_by_code(text) FROM public;
GRANT EXECUTE ON FUNCTION public.get_hosted_meeting_by_code(text) TO authenticated;

CREATE OR REPLACE FUNCTION public.reactivate_meeting_by_code(p_code text)
RETURNS TABLE (
  id uuid,
  meeting_id text,
  host_id uuid,
  title text,
  is_active boolean,
  status text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  row_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  UPDATE public.meetings m
  SET
    is_active = true,
    status = 'live'
  WHERE upper(trim(m.meeting_id)) = upper(trim(p_code))
    AND m.host_id = auth.uid()
  RETURNING m.id INTO row_id;

  IF row_id IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT m.id, m.meeting_id, m.host_id, m.title, m.is_active, m.status
  FROM public.meetings m
  WHERE m.id = row_id;
END;
$$;

REVOKE ALL ON FUNCTION public.reactivate_meeting_by_code(text) FROM public;
GRANT EXECUTE ON FUNCTION public.reactivate_meeting_by_code(text) TO authenticated;
