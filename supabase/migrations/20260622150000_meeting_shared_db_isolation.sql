-- Isolate Regal Meeting from other Regal apps on shared Supabase (xexnwcmqnelgzuqhkvtx).
-- Does NOT modify regal_*, buzz_*, flysend_*, regal_user_settings, or canonical profiles RLS.

-- 1. Stop assigning Regal Numbers on every ecosystem signup
DROP TRIGGER IF EXISTS trg_assign_phone_number ON auth.users;

-- 2. Opt-in Regal Number for Regal Meeting mobile only
CREATE OR REPLACE FUNCTION public.ensure_meeting_regal_number()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  existing text;
  new_phone text;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  SELECT phone_number INTO existing
  FROM public.user_phone_numbers
  WHERE user_id = auth.uid();
  IF existing IS NOT NULL THEN
    RETURN existing;
  END IF;
  new_phone := public.generate_unique_phone_number();
  INSERT INTO public.user_phone_numbers (user_id, phone_number)
  VALUES (auth.uid(), new_phone);
  RETURN new_phone;
END;
$$;
REVOKE ALL ON FUNCTION public.ensure_meeting_regal_number() FROM public;
GRANT EXECUTE ON FUNCTION public.ensure_meeting_regal_number() TO authenticated;

-- 3. Remove cross-user phone enumeration; dial uses RPC
DROP POLICY IF EXISTS authenticated_lookup_phone ON public.user_phone_numbers;

CREATE OR REPLACE FUNCTION public.lookup_regal_number_for_call(p_phone text)
RETURNS TABLE (user_id uuid, display_name text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    upn.user_id,
    COALESCE(p.display_name, p.full_name, split_part(au.email::text, '@', 1)) AS display_name
  FROM public.user_phone_numbers upn
  JOIN auth.users au ON au.id = upn.user_id
  LEFT JOIN public.profiles p ON p.id = upn.user_id
  WHERE upn.phone_number = regexp_replace(trim(p_phone), '[^0-9]', '', 'g')
    AND auth.uid() IS NOT NULL
    AND auth.uid() <> upn.user_id
  LIMIT 1;
$$;
REVOKE ALL ON FUNCTION public.lookup_regal_number_for_call(text) FROM public;
GRANT EXECUTE ON FUNCTION public.lookup_regal_number_for_call(text) TO authenticated;

-- 4. Join-by-code without listing all active meetings
DROP POLICY IF EXISTS meetings_select_active_for_join ON public.meetings;

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
    AND auth.uid() IS NOT NULL
  LIMIT 1;
$$;
REVOKE ALL ON FUNCTION public.get_meeting_by_code(text) FROM public;
GRANT EXECUTE ON FUNCTION public.get_meeting_by_code(text) TO authenticated;

COMMENT ON TABLE public.meetings IS 'Regal Meeting — isolated from Regal Mail/Buzz/Flysend apps';
COMMENT ON TABLE public.user_settings IS 'Regal Meeting prefs only — not regal_user_settings or buzz_user_settings';
COMMENT ON TABLE public.user_phone_numbers IS 'Regal Meeting mobile Regal Number — opt-in via ensure_meeting_regal_number()';
