-- Enterprise calendar: team calendars, recurrence, scheduling links, preferences

-- Extend calendar_events
ALTER TABLE public.calendar_events
  ADD COLUMN IF NOT EXISTS recurrence_pattern text,
  ADD COLUMN IF NOT EXISTS recurrence_end_date timestamptz,
  ADD COLUMN IF NOT EXISTS team_calendar_id uuid,
  ADD COLUMN IF NOT EXISTS visibility text NOT NULL DEFAULT 'private',
  ADD COLUMN IF NOT EXISTS reminder_minutes integer;

-- Team shared calendars
CREATE TABLE IF NOT EXISTS public.team_calendars (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  color text NOT NULL DEFAULT 'purple',
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.team_calendar_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_calendar_id uuid NOT NULL REFERENCES public.team_calendars(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  email text NOT NULL,
  role text NOT NULL DEFAULT 'viewer' CHECK (role IN ('owner', 'editor', 'viewer')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (team_calendar_id, email)
);

ALTER TABLE public.calendar_events
  DROP CONSTRAINT IF EXISTS calendar_events_team_calendar_id_fkey;
ALTER TABLE public.calendar_events
  ADD CONSTRAINT calendar_events_team_calendar_id_fkey
  FOREIGN KEY (team_calendar_id) REFERENCES public.team_calendars(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_team_calendars_owner ON public.team_calendars(owner_id);
CREATE INDEX IF NOT EXISTS idx_team_calendar_members_calendar ON public.team_calendar_members(team_calendar_id);
CREATE INDEX IF NOT EXISTS idx_team_calendar_members_email ON public.team_calendar_members(email);
CREATE INDEX IF NOT EXISTS idx_calendar_events_team_calendar ON public.calendar_events(team_calendar_id);

-- Scheduling links (Calendly-style)
CREATE TABLE IF NOT EXISTS public.calendar_scheduling_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  slug text NOT NULL UNIQUE,
  title text NOT NULL,
  description text,
  duration_minutes integer NOT NULL DEFAULT 30,
  buffer_minutes integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  create_meeting boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_scheduling_links_user ON public.calendar_scheduling_links(user_id);

-- Per-user calendar preferences
CREATE TABLE IF NOT EXISTS public.calendar_user_preferences (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  timezone text NOT NULL DEFAULT 'UTC',
  work_start time NOT NULL DEFAULT '09:00',
  work_end time NOT NULL DEFAULT '17:00',
  work_days integer[] NOT NULL DEFAULT '{1,2,3,4,5}',
  default_reminder_minutes integer NOT NULL DEFAULT 15,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- RLS: team_calendars
ALTER TABLE public.team_calendars ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS team_calendars_select ON public.team_calendars;
CREATE POLICY team_calendars_select ON public.team_calendars FOR SELECT TO authenticated
  USING (
    owner_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.team_calendar_members m
      WHERE m.team_calendar_id = team_calendars.id
        AND (m.user_id = auth.uid() OR m.email = (auth.jwt() ->> 'email'))
    )
  );

DROP POLICY IF EXISTS team_calendars_insert ON public.team_calendars;
CREATE POLICY team_calendars_insert ON public.team_calendars FOR INSERT TO authenticated
  WITH CHECK (owner_id = auth.uid());

DROP POLICY IF EXISTS team_calendars_update ON public.team_calendars;
CREATE POLICY team_calendars_update ON public.team_calendars FOR UPDATE TO authenticated
  USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());

DROP POLICY IF EXISTS team_calendars_delete ON public.team_calendars;
CREATE POLICY team_calendars_delete ON public.team_calendars FOR DELETE TO authenticated
  USING (owner_id = auth.uid());

-- RLS: team_calendar_members
ALTER TABLE public.team_calendar_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS team_calendar_members_select ON public.team_calendar_members;
CREATE POLICY team_calendar_members_select ON public.team_calendar_members FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.team_calendars tc
      WHERE tc.id = team_calendar_members.team_calendar_id
        AND (
          tc.owner_id = auth.uid()
          OR EXISTS (
            SELECT 1 FROM public.team_calendar_members m2
            WHERE m2.team_calendar_id = tc.id
              AND (m2.user_id = auth.uid() OR m2.email = (auth.jwt() ->> 'email'))
          )
        )
    )
  );

DROP POLICY IF EXISTS team_calendar_members_manage ON public.team_calendar_members;
CREATE POLICY team_calendar_members_manage ON public.team_calendar_members FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.team_calendars tc
      WHERE tc.id = team_calendar_members.team_calendar_id AND tc.owner_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.team_calendars tc
      WHERE tc.id = team_calendar_members.team_calendar_id AND tc.owner_id = auth.uid()
    )
  );

-- Extend calendar_events SELECT for team calendar visibility
DROP POLICY IF EXISTS calendar_events_select ON public.calendar_events;
CREATE POLICY calendar_events_select ON public.calendar_events FOR SELECT TO authenticated
  USING (
    auth.uid() = user_id
    OR (auth.jwt() ->> 'email') = ANY(attendees)
    OR (
      team_calendar_id IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM public.team_calendar_members m
        WHERE m.team_calendar_id = calendar_events.team_calendar_id
          AND (m.user_id = auth.uid() OR m.email = (auth.jwt() ->> 'email'))
      )
    )
  );

-- RLS: scheduling links
ALTER TABLE public.calendar_scheduling_links ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS scheduling_links_select ON public.calendar_scheduling_links;
CREATE POLICY scheduling_links_select ON public.calendar_scheduling_links FOR SELECT TO authenticated, anon
  USING (is_active = true OR user_id = auth.uid());

DROP POLICY IF EXISTS scheduling_links_insert ON public.calendar_scheduling_links;
CREATE POLICY scheduling_links_insert ON public.calendar_scheduling_links FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS scheduling_links_update ON public.calendar_scheduling_links;
CREATE POLICY scheduling_links_update ON public.calendar_scheduling_links FOR UPDATE TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS scheduling_links_delete ON public.calendar_scheduling_links;
CREATE POLICY scheduling_links_delete ON public.calendar_scheduling_links FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- RLS: calendar preferences
ALTER TABLE public.calendar_user_preferences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS calendar_prefs_select ON public.calendar_user_preferences;
CREATE POLICY calendar_prefs_select ON public.calendar_user_preferences FOR SELECT TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS calendar_prefs_upsert ON public.calendar_user_preferences;
CREATE POLICY calendar_prefs_upsert ON public.calendar_user_preferences FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- Triggers
DROP TRIGGER IF EXISTS update_team_calendars_updated_at ON public.team_calendars;
CREATE TRIGGER update_team_calendars_updated_at
  BEFORE UPDATE ON public.team_calendars
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_scheduling_links_updated_at ON public.calendar_scheduling_links;
CREATE TRIGGER update_scheduling_links_updated_at
  BEFORE UPDATE ON public.calendar_scheduling_links
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_calendar_prefs_updated_at ON public.calendar_user_preferences;
CREATE TRIGGER update_calendar_prefs_updated_at
  BEFORE UPDATE ON public.calendar_user_preferences
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
