-- Mobile-only features + cross-platform meeting join on shared Regal Mail Supabase

ALTER TABLE public.meetings
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active';

ALTER TABLE public.user_settings
  ADD COLUMN IF NOT EXISTS biometrics_enabled boolean DEFAULT false;

-- Guests join via get_meeting_by_code() RPC — no broad SELECT on all active meetings
-- (see 20260622150000_meeting_shared_db_isolation.sql)

-- ========== Mobile-only: Regal Number ==========
CREATE TABLE IF NOT EXISTS public.user_phone_numbers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  phone_number text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_user_phone_numbers_phone ON public.user_phone_numbers(phone_number);
ALTER TABLE public.user_phone_numbers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS users_read_own_phone ON public.user_phone_numbers;
CREATE POLICY users_read_own_phone ON public.user_phone_numbers FOR SELECT USING (auth.uid() = user_id);
-- No authenticated_lookup_phone — use lookup_regal_number_for_call() RPC (isolation migration)
DROP POLICY IF EXISTS authenticated_lookup_phone ON public.user_phone_numbers;
DROP POLICY IF EXISTS system_insert_phone ON public.user_phone_numbers;
CREATE POLICY system_insert_phone ON public.user_phone_numbers FOR INSERT WITH CHECK (false);
GRANT SELECT ON public.user_phone_numbers TO authenticated;

CREATE OR REPLACE FUNCTION public.generate_unique_phone_number()
RETURNS text LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE candidate text; attempts int := 0;
BEGIN
  LOOP
    candidate := lpad(floor(random() * 900000000 + 100000000)::bigint::text, 9, '0');
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.user_phone_numbers WHERE phone_number = candidate);
    attempts := attempts + 1;
    IF attempts > 100 THEN RAISE EXCEPTION 'Could not generate unique phone number'; END IF;
  END LOOP;
  RETURN candidate;
END;
$$;

CREATE OR REPLACE FUNCTION public.assign_phone_number_on_signup()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.user_phone_numbers (user_id, phone_number)
  VALUES (NEW.id, public.generate_unique_phone_number())
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;
-- Phone numbers assigned on demand via ensure_meeting_regal_number() — not on every auth signup
-- (see 20260622150000_meeting_shared_db_isolation.sql)

-- ========== Mobile-only: encrypted P2P calls ==========
CREATE TABLE IF NOT EXISTS public.app_calls (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  caller_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  callee_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  caller_phone text NOT NULL,
  callee_phone text NOT NULL,
  status text NOT NULL DEFAULT 'ringing',
  caller_platform text NOT NULL DEFAULT 'mobile',
  started_at timestamptz NOT NULL DEFAULT now(),
  answered_at timestamptz,
  ended_at timestamptz,
  duration_seconds int,
  caller_display_name text,
  callee_display_name text,
  is_video boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_app_calls_callee_status ON public.app_calls(callee_id, status);
ALTER TABLE public.app_calls ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS users_read_own_calls ON public.app_calls;
CREATE POLICY users_read_own_calls ON public.app_calls FOR SELECT USING (auth.uid() = caller_id OR auth.uid() = callee_id);
DROP POLICY IF EXISTS users_insert_own_calls ON public.app_calls;
CREATE POLICY users_insert_own_calls ON public.app_calls FOR INSERT WITH CHECK (auth.uid() = caller_id);
DROP POLICY IF EXISTS users_update_own_calls ON public.app_calls;
CREATE POLICY users_update_own_calls ON public.app_calls FOR UPDATE USING (auth.uid() = caller_id OR auth.uid() = callee_id);
GRANT SELECT, INSERT, UPDATE ON public.app_calls TO authenticated;

-- ========== Mobile-only: saved contacts ==========
CREATE TABLE IF NOT EXISTS public.saved_contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  contact_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  phone_number text NOT NULL,
  display_name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_saved_contacts_owner_phone ON public.saved_contacts(owner_id, phone_number);
ALTER TABLE public.saved_contacts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS users_read_own_contacts ON public.saved_contacts;
CREATE POLICY users_read_own_contacts ON public.saved_contacts FOR SELECT USING (auth.uid() = owner_id);
DROP POLICY IF EXISTS users_insert_own_contacts ON public.saved_contacts;
CREATE POLICY users_insert_own_contacts ON public.saved_contacts FOR INSERT WITH CHECK (auth.uid() = owner_id);
DROP POLICY IF EXISTS users_update_own_contacts ON public.saved_contacts;
CREATE POLICY users_update_own_contacts ON public.saved_contacts FOR UPDATE USING (auth.uid() = owner_id);
DROP POLICY IF EXISTS users_delete_own_contacts ON public.saved_contacts;
CREATE POLICY users_delete_own_contacts ON public.saved_contacts FOR DELETE USING (auth.uid() = owner_id);

-- ========== Mobile push tokens ==========
CREATE TABLE IF NOT EXISTS public.user_push_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  push_token text NOT NULL,
  platform text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS user_push_tokens_user_id_idx ON public.user_push_tokens(user_id);
ALTER TABLE public.user_push_tokens ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tokens_own_select ON public.user_push_tokens;
CREATE POLICY tokens_own_select ON public.user_push_tokens FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS tokens_own_insert ON public.user_push_tokens;
CREATE POLICY tokens_own_insert ON public.user_push_tokens FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS tokens_own_update ON public.user_push_tokens;
CREATE POLICY tokens_own_update ON public.user_push_tokens FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS tokens_own_delete ON public.user_push_tokens;
CREATE POLICY tokens_own_delete ON public.user_push_tokens FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- ========== Mobile meeting invite rings ==========
CREATE TABLE IF NOT EXISTS public.meeting_invite_calls (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scheduled_meeting_id uuid REFERENCES public.scheduled_meetings(id) ON DELETE SET NULL,
  meeting_id text NOT NULL,
  host_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  host_display_name text,
  title text NOT NULL,
  is_video boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL
);
CREATE TABLE IF NOT EXISTS public.meeting_invite_call_recipients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  call_id uuid NOT NULL REFERENCES public.meeting_invite_calls(id) ON DELETE CASCADE,
  invitee_email text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'answered', 'rejected', 'missed')),
  responded_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS meeting_invite_call_recipients_call_email_idx
  ON public.meeting_invite_call_recipients(call_id, lower(trim(invitee_email)));
ALTER TABLE public.meeting_invite_calls ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meeting_invite_call_recipients ENABLE ROW LEVEL SECURITY;

-- ========== Mobile notification inbox ==========
CREATE TABLE IF NOT EXISTS public.notification_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text,
  message text,
  type text,
  read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.notification_history ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS notification_history_own ON public.notification_history;
CREATE POLICY notification_history_own ON public.notification_history FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- RPC for push targeting invitees
CREATE OR REPLACE FUNCTION public.user_ids_for_invite_emails(emails text[])
RETURNS TABLE (user_id uuid, normalized_email text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT au.id AS user_id, lower(trim(au.email::text)) AS normalized_email
  FROM auth.users au
  WHERE lower(trim(au.email::text)) IN (SELECT lower(trim(x)) FROM unnest(emails) AS x);
$$;
REVOKE ALL ON FUNCTION public.user_ids_for_invite_emails(text[]) FROM public;
GRANT EXECUTE ON FUNCTION public.user_ids_for_invite_emails(text[]) TO service_role;

-- Meeting invite ring RLS (mobile-only)
DROP POLICY IF EXISTS invite_calls_select ON public.meeting_invite_calls;
CREATE POLICY invite_calls_select ON public.meeting_invite_calls FOR SELECT TO authenticated
  USING (
    auth.uid() = host_id
    OR EXISTS (
      SELECT 1 FROM public.meeting_invite_call_recipients r
      WHERE r.call_id = meeting_invite_calls.id
        AND lower(trim(r.invitee_email)) = public.current_user_email()
    )
  );
DROP POLICY IF EXISTS invite_calls_insert_host ON public.meeting_invite_calls;
CREATE POLICY invite_calls_insert_host ON public.meeting_invite_calls FOR INSERT TO authenticated WITH CHECK (auth.uid() = host_id);
DROP POLICY IF EXISTS invite_calls_update_host ON public.meeting_invite_calls;
CREATE POLICY invite_calls_update_host ON public.meeting_invite_calls FOR UPDATE TO authenticated USING (auth.uid() = host_id) WITH CHECK (auth.uid() = host_id);
DROP POLICY IF EXISTS invite_calls_delete_host ON public.meeting_invite_calls;
CREATE POLICY invite_calls_delete_host ON public.meeting_invite_calls FOR DELETE TO authenticated USING (auth.uid() = host_id);

DROP POLICY IF EXISTS icr_select ON public.meeting_invite_call_recipients;
CREATE POLICY icr_select ON public.meeting_invite_call_recipients FOR SELECT TO authenticated
  USING (
    lower(trim(invitee_email)) = public.current_user_email()
    OR EXISTS (SELECT 1 FROM public.meeting_invite_calls c WHERE c.id = call_id AND c.host_id = auth.uid())
  );
DROP POLICY IF EXISTS icr_insert_host ON public.meeting_invite_call_recipients;
CREATE POLICY icr_insert_host ON public.meeting_invite_call_recipients FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.meeting_invite_calls c WHERE c.id = call_id AND c.host_id = auth.uid()));
DROP POLICY IF EXISTS icr_update_host_or_invitee ON public.meeting_invite_call_recipients;
CREATE POLICY icr_update_host_or_invitee ON public.meeting_invite_call_recipients FOR UPDATE TO authenticated
  USING (
    lower(trim(invitee_email)) = public.current_user_email()
    OR EXISTS (SELECT 1 FROM public.meeting_invite_calls c WHERE c.id = call_id AND c.host_id = auth.uid())
  )
  WITH CHECK (
    lower(trim(invitee_email)) = public.current_user_email()
    OR EXISTS (SELECT 1 FROM public.meeting_invite_calls c WHERE c.id = call_id AND c.host_id = auth.uid())
  );
DROP POLICY IF EXISTS icr_delete_host ON public.meeting_invite_call_recipients;
CREATE POLICY icr_delete_host ON public.meeting_invite_call_recipients FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.meeting_invite_calls c WHERE c.id = call_id AND c.host_id = auth.uid()));

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.app_calls;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.meeting_invite_call_recipients;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.notification_history;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
