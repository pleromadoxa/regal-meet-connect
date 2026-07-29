-- Regal Meeting schema on shared Regal Mail Supabase (xexnwcmqnelgzuqhkvtx)
-- ADDITIVE ONLY on profiles: does not change Regal Mail / Buzz / Flysend profile RLS or triggers.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS display_name text,
  ADD COLUMN IF NOT EXISTS bio text;

UPDATE public.profiles
SET display_name = COALESCE(display_name, full_name)
WHERE display_name IS NULL AND full_name IS NOT NULL;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS public.meetings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id text NOT NULL UNIQUE,
  host_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.meeting_participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id uuid NOT NULL REFERENCES public.meetings(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_name text NOT NULL,
  is_host boolean NOT NULL DEFAULT false,
  is_muted boolean NOT NULL DEFAULT false,
  joined_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (meeting_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.meeting_captions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id uuid NOT NULL REFERENCES public.meetings(id) ON DELETE CASCADE,
  participant_id uuid NOT NULL REFERENCES public.meeting_participants(id) ON DELETE CASCADE,
  content text NOT NULL,
  timestamp timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.meeting_file_shares (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id text NOT NULL,
  uploaded_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  file_name text NOT NULL,
  file_path text NOT NULL,
  file_size bigint NOT NULL,
  file_type text NOT NULL,
  uploaded_at timestamptz NOT NULL DEFAULT now(),
  is_visible boolean NOT NULL DEFAULT true
);

CREATE TABLE IF NOT EXISTS public.scheduled_meetings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id text NOT NULL,
  title text NOT NULL,
  description text,
  host_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  scheduled_time timestamptz NOT NULL,
  duration_minutes integer NOT NULL DEFAULT 60,
  is_recurring boolean NOT NULL DEFAULT false,
  recurrence_pattern text,
  recurrence_end_date timestamptz,
  timezone text NOT NULL DEFAULT 'UTC',
  meeting_link text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  status text NOT NULL DEFAULT 'scheduled'
);

CREATE TABLE IF NOT EXISTS public.meeting_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scheduled_meeting_id uuid NOT NULL REFERENCES public.scheduled_meetings(id) ON DELETE CASCADE,
  invitee_email text NOT NULL,
  invitee_name text,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.user_recent_meetings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  meeting_id text NOT NULL,
  meeting_title text,
  joined_at timestamptz NOT NULL DEFAULT now(),
  last_accessed timestamptz NOT NULL DEFAULT now(),
  is_host boolean NOT NULL DEFAULT false
);

CREATE TABLE IF NOT EXISTS public.meeting_recordings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id text NOT NULL,
  host_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  file_path text NOT NULL,
  file_size bigint,
  duration_seconds integer,
  started_at timestamptz NOT NULL DEFAULT now(),
  ended_at timestamptz,
  status text NOT NULL DEFAULT 'recording',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL DEFAULT 'user',
  assigned_at timestamptz DEFAULT now(),
  assigned_by uuid REFERENCES auth.users(id),
  UNIQUE (user_id, role)
);

CREATE TABLE IF NOT EXISTS public.platform_usage_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  action text NOT NULL,
  ip_address text,
  user_agent text,
  country text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.user_settings (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email_notifications boolean NOT NULL DEFAULT true,
  push_notifications boolean NOT NULL DEFAULT true,
  meeting_reminders boolean NOT NULL DEFAULT true,
  sound_enabled boolean NOT NULL DEFAULT true,
  camera_default_on boolean NOT NULL DEFAULT true,
  microphone_default_on boolean NOT NULL DEFAULT true,
  theme text NOT NULL DEFAULT 'dark',
  language text NOT NULL DEFAULT 'en',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

CREATE OR REPLACE FUNCTION public.is_meeting_participant(_meeting_id uuid, _uid uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.meeting_participants WHERE meeting_id = _meeting_id AND user_id = _uid);
$$;

CREATE OR REPLACE FUNCTION public.is_meeting_host(_meeting_id uuid, _uid uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.meetings WHERE id = _meeting_id AND host_id = _uid);
$$;

CREATE OR REPLACE FUNCTION public.is_meeting_participant_by_code(_code text, _uid uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.meetings m
    JOIN public.meeting_participants mp ON mp.meeting_id = m.id
    WHERE m.meeting_id = _code AND (mp.user_id = _uid OR m.host_id = _uid)
  );
$$;

CREATE OR REPLACE FUNCTION public.current_user_email()
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT lower(trim((auth.jwt() ->> 'email')::text));
$$;

ALTER TABLE public.meetings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meeting_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meeting_captions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meeting_file_shares ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scheduled_meetings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meeting_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_recent_meetings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meeting_recordings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_usage_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;

INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('avatars', 'avatars', true, 5242880)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('meeting-files', 'meeting-files', false, 52428800)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('meeting-recordings', 'meeting-recordings', false)
ON CONFLICT (id) DO NOTHING;

-- RLS policies (idempotent)
DROP POLICY IF EXISTS meetings_select_host_or_participant ON public.meetings;
CREATE POLICY meetings_select_host_or_participant ON public.meetings FOR SELECT TO authenticated
  USING (auth.uid() = host_id OR public.is_meeting_participant(id, auth.uid()));
DROP POLICY IF EXISTS meetings_insert_host ON public.meetings;
CREATE POLICY meetings_insert_host ON public.meetings FOR INSERT TO authenticated WITH CHECK (auth.uid() = host_id);
DROP POLICY IF EXISTS meetings_update_host ON public.meetings;
CREATE POLICY meetings_update_host ON public.meetings FOR UPDATE TO authenticated USING (auth.uid() = host_id) WITH CHECK (auth.uid() = host_id);
DROP POLICY IF EXISTS meetings_delete_host ON public.meetings;
CREATE POLICY meetings_delete_host ON public.meetings FOR DELETE TO authenticated USING (auth.uid() = host_id);

DROP POLICY IF EXISTS mp_select_co_participants ON public.meeting_participants;
CREATE POLICY mp_select_co_participants ON public.meeting_participants FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_meeting_host(meeting_id, auth.uid()) OR public.is_meeting_participant(meeting_id, auth.uid()));
DROP POLICY IF EXISTS mp_insert_self ON public.meeting_participants;
CREATE POLICY mp_insert_self ON public.meeting_participants FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS mp_update_self_or_host ON public.meeting_participants;
CREATE POLICY mp_update_self_or_host ON public.meeting_participants FOR UPDATE TO authenticated
  USING (auth.uid() = user_id OR public.is_meeting_host(meeting_id, auth.uid()))
  WITH CHECK (auth.uid() = user_id OR public.is_meeting_host(meeting_id, auth.uid()));
DROP POLICY IF EXISTS mp_delete_self_or_host ON public.meeting_participants;
CREATE POLICY mp_delete_self_or_host ON public.meeting_participants FOR DELETE TO authenticated
  USING (auth.uid() = user_id OR public.is_meeting_host(meeting_id, auth.uid()));

DROP POLICY IF EXISTS meeting_file_shares_select_participant ON public.meeting_file_shares;
CREATE POLICY meeting_file_shares_select_participant ON public.meeting_file_shares FOR SELECT TO authenticated
  USING (is_visible = true AND (uploaded_by = auth.uid() OR public.is_meeting_participant_by_code(meeting_id, auth.uid())));
DROP POLICY IF EXISTS meeting_file_shares_insert_participant ON public.meeting_file_shares;
CREATE POLICY meeting_file_shares_insert_participant ON public.meeting_file_shares FOR INSERT TO authenticated
  WITH CHECK (uploaded_by = auth.uid() AND public.is_meeting_participant_by_code(meeting_id, auth.uid()));

DROP POLICY IF EXISTS "Users can manage their own recent meetings" ON public.user_recent_meetings;
CREATE POLICY user_recent_meetings_own ON public.user_recent_meetings FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS sched_select_host_or_invited ON public.scheduled_meetings;
CREATE POLICY sched_select_host_or_invited ON public.scheduled_meetings FOR SELECT TO authenticated
  USING (auth.uid() = host_id OR EXISTS (
    SELECT 1 FROM public.meeting_invitations mi
    WHERE mi.scheduled_meeting_id = scheduled_meetings.id AND lower(trim(mi.invitee_email)) = public.current_user_email()
  ));
DROP POLICY IF EXISTS sched_insert_host ON public.scheduled_meetings;
CREATE POLICY sched_insert_host ON public.scheduled_meetings FOR INSERT TO authenticated WITH CHECK (auth.uid() = host_id);
DROP POLICY IF EXISTS sched_update_host ON public.scheduled_meetings;
CREATE POLICY sched_update_host ON public.scheduled_meetings FOR UPDATE TO authenticated USING (auth.uid() = host_id) WITH CHECK (auth.uid() = host_id);
DROP POLICY IF EXISTS sched_delete_host ON public.scheduled_meetings;
CREATE POLICY sched_delete_host ON public.scheduled_meetings FOR DELETE TO authenticated USING (auth.uid() = host_id);

DROP POLICY IF EXISTS settings_own_select ON public.user_settings;
CREATE POLICY settings_own_select ON public.user_settings FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS settings_own_insert ON public.user_settings;
CREATE POLICY settings_own_insert ON public.user_settings FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS settings_own_update ON public.user_settings;
CREATE POLICY settings_own_update ON public.user_settings FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS platform_logs_insert_own ON public.platform_usage_logs;
CREATE POLICY platform_logs_insert_own ON public.platform_usage_logs FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Admins can view all logs" ON public.platform_usage_logs;
CREATE POLICY platform_logs_admin_select ON public.platform_usage_logs FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;
CREATE POLICY user_roles_own_select ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE INDEX IF NOT EXISTS idx_meetings_meeting_id ON public.meetings(meeting_id);
CREATE INDEX IF NOT EXISTS idx_meeting_file_shares_meeting_id ON public.meeting_file_shares(meeting_id);
CREATE INDEX IF NOT EXISTS idx_user_recent_meetings_user_id ON public.user_recent_meetings(user_id);
