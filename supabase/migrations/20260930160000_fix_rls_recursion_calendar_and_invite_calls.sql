-- Break RLS recursion (SQLSTATE 42P17) on team calendars, calendar events and
-- meeting invite calls.
--
-- Observed while probing every RLS table as an authenticated user:
--   team_calendar_members  -> sub-queries itself           (self recursion)
--   team_calendars         -> team_calendar_members       (via the policy above)
--   calendar_events        -> team_calendar_members       (via the policy above)
--   meeting_invite_calls   <-> meeting_invite_call_recipients (mutual recursion)
-- Any authenticated SELECT against them failed with
--   "infinite recursion detected in policy for relation ..."
-- which surfaces in the app as empty/failed calendar and invite-call loads.
--
-- Fix: replace the cross-table sub-queries with SECURITY DEFINER helpers owned
-- by postgres, which read the tables directly and therefore skip their RLS.

CREATE OR REPLACE FUNCTION public.is_team_calendar_owner(p_calendar_id uuid, p_uid uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.team_calendars tc
    WHERE tc.id = p_calendar_id
      AND tc.owner_id = p_uid
  );
$$;

CREATE OR REPLACE FUNCTION public.is_team_calendar_member(p_calendar_id uuid, p_uid uuid, p_email text)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT public.is_team_calendar_owner(p_calendar_id, p_uid)
      OR EXISTS (
        SELECT 1 FROM public.team_calendar_members m
        WHERE m.team_calendar_id = p_calendar_id
          AND (
            (p_uid IS NOT NULL AND m.user_id = p_uid)
            OR (p_email IS NOT NULL AND lower(trim(m.email)) = lower(trim(p_email)))
          )
      );
$$;

CREATE OR REPLACE FUNCTION public.is_meeting_invite_call_host(p_call_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.meeting_invite_calls c
    WHERE c.id = p_call_id
      AND c.host_id = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION public.is_meeting_invite_call_recipient(p_call_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.meeting_invite_call_recipients r
    WHERE r.call_id = p_call_id
      AND lower(trim(r.invitee_email)) = current_user_email()
  );
$$;

-- team_calendar_members --------------------------------------------------
DROP POLICY IF EXISTS team_calendar_members_select ON public.team_calendar_members;
CREATE POLICY team_calendar_members_select
ON public.team_calendar_members
FOR SELECT
TO authenticated
USING (
  public.is_team_calendar_member(team_calendar_id, auth.uid(), auth.jwt() ->> 'email')
);

DROP POLICY IF EXISTS team_calendar_members_manage ON public.team_calendar_members;
CREATE POLICY team_calendar_members_manage
ON public.team_calendar_members
FOR ALL
TO authenticated
USING (
  public.is_team_calendar_owner(team_calendar_id, auth.uid())
)
WITH CHECK (
  public.is_team_calendar_owner(team_calendar_id, auth.uid())
);

-- team_calendars ---------------------------------------------------------
DROP POLICY IF EXISTS team_calendars_select ON public.team_calendars;
CREATE POLICY team_calendars_select
ON public.team_calendars
FOR SELECT
TO authenticated
USING (
  owner_id = auth.uid()
  OR public.is_team_calendar_member(id, auth.uid(), auth.jwt() ->> 'email')
);

-- calendar_events --------------------------------------------------------
DROP POLICY IF EXISTS calendar_events_select ON public.calendar_events;
CREATE POLICY calendar_events_select
ON public.calendar_events
FOR SELECT
TO authenticated
USING (
  auth.uid() = user_id
  OR (auth.jwt() ->> 'email') = ANY (attendees)
  OR (
    team_calendar_id IS NOT NULL
    AND public.is_team_calendar_member(team_calendar_id, auth.uid(), auth.jwt() ->> 'email')
  )
);

-- meeting_invite_calls ---------------------------------------------------
DROP POLICY IF EXISTS invite_calls_select ON public.meeting_invite_calls;
CREATE POLICY invite_calls_select
ON public.meeting_invite_calls
FOR SELECT
TO authenticated
USING (
  auth.uid() = host_id
  OR public.is_meeting_invite_call_recipient(id)
);

-- meeting_invite_call_recipients ----------------------------------------
DROP POLICY IF EXISTS icr_select ON public.meeting_invite_call_recipients;
CREATE POLICY icr_select
ON public.meeting_invite_call_recipients
FOR SELECT
TO authenticated
USING (
  lower(trim(invitee_email)) = current_user_email()
  OR public.is_meeting_invite_call_host(call_id)
);

DROP POLICY IF EXISTS icr_insert_host ON public.meeting_invite_call_recipients;
CREATE POLICY icr_insert_host
ON public.meeting_invite_call_recipients
FOR INSERT
TO authenticated
WITH CHECK (
  public.is_meeting_invite_call_host(call_id)
);

DROP POLICY IF EXISTS icr_update_host_or_invitee ON public.meeting_invite_call_recipients;
CREATE POLICY icr_update_host_or_invitee
ON public.meeting_invite_call_recipients
FOR UPDATE
TO authenticated
USING (
  lower(trim(invitee_email)) = current_user_email()
  OR public.is_meeting_invite_call_host(call_id)
)
WITH CHECK (
  lower(trim(invitee_email)) = current_user_email()
  OR public.is_meeting_invite_call_host(call_id)
);

DROP POLICY IF EXISTS icr_delete_host ON public.meeting_invite_call_recipients;
CREATE POLICY icr_delete_host
ON public.meeting_invite_call_recipients
FOR DELETE
TO authenticated
USING (
  public.is_meeting_invite_call_host(call_id)
);
