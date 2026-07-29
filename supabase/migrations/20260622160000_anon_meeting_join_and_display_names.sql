-- Allow join-by-code before sign-in; expose display names for meeting participants.

CREATE OR REPLACE FUNCTION public.get_meeting_by_code(p_code text)
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
    AND m.is_active = true
    AND COALESCE(m.status, 'active') NOT IN ('ended', 'cancelled')
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.get_meeting_by_code(text) FROM public;
GRANT EXECUTE ON FUNCTION public.get_meeting_by_code(text) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.get_profile_display_names(p_user_ids uuid[])
RETURNS TABLE (id uuid, display_name text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.id, NULLIF(trim(p.display_name), '') AS display_name
  FROM public.profiles p
  WHERE p.id = ANY (p_user_ids)
    AND NULLIF(trim(p.display_name), '') IS NOT NULL;
$$;

REVOKE ALL ON FUNCTION public.get_profile_display_names(uuid[]) FROM public;
GRANT EXECUTE ON FUNCTION public.get_profile_display_names(uuid[]) TO authenticated;
