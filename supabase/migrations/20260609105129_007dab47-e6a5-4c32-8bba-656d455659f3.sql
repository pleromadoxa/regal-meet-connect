
DROP VIEW IF EXISTS public.users_view;

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

REVOKE EXECUTE ON FUNCTION public.is_meeting_participant(uuid, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_meeting_host(uuid, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_meeting_participant_by_code(text, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.current_user_email() FROM anon;

-- PHONE NUMBERS
DROP POLICY IF EXISTS authenticated_lookup_phone ON public.user_phone_numbers;

-- PUSH TOKENS
DROP POLICY IF EXISTS tokens_auth_all ON public.user_push_tokens;
CREATE POLICY tokens_own_select ON public.user_push_tokens FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY tokens_own_insert ON public.user_push_tokens FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY tokens_own_update ON public.user_push_tokens FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY tokens_own_delete ON public.user_push_tokens FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- USER SETTINGS
DROP POLICY IF EXISTS settings_auth_all ON public.user_settings;
CREATE POLICY settings_own_select ON public.user_settings FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY settings_own_insert ON public.user_settings FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY settings_own_update ON public.user_settings FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY settings_own_delete ON public.user_settings FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- PROFILES
DROP POLICY IF EXISTS profiles_auth_all ON public.profiles;
CREATE POLICY profiles_select_authenticated ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY profiles_insert_own ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY profiles_update_own ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
CREATE POLICY profiles_delete_own ON public.profiles FOR DELETE TO authenticated USING (auth.uid() = id);

-- MEETINGS
DROP POLICY IF EXISTS allow_authenticated_all ON public.meetings;
CREATE POLICY meetings_select_host_or_participant ON public.meetings FOR SELECT TO authenticated
  USING (auth.uid() = host_id OR public.is_meeting_participant(id, auth.uid()));
CREATE POLICY meetings_insert_host ON public.meetings FOR INSERT TO authenticated WITH CHECK (auth.uid() = host_id);
CREATE POLICY meetings_update_host ON public.meetings FOR UPDATE TO authenticated USING (auth.uid() = host_id) WITH CHECK (auth.uid() = host_id);
CREATE POLICY meetings_delete_host ON public.meetings FOR DELETE TO authenticated USING (auth.uid() = host_id);

-- MEETING PARTICIPANTS
DROP POLICY IF EXISTS mp_auth_all ON public.meeting_participants;
CREATE POLICY mp_select_co_participants ON public.meeting_participants FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR public.is_meeting_host(meeting_id, auth.uid())
    OR public.is_meeting_participant(meeting_id, auth.uid())
  );
CREATE POLICY mp_insert_self ON public.meeting_participants FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY mp_update_self_or_host ON public.meeting_participants FOR UPDATE TO authenticated
  USING (auth.uid() = user_id OR public.is_meeting_host(meeting_id, auth.uid()))
  WITH CHECK (auth.uid() = user_id OR public.is_meeting_host(meeting_id, auth.uid()));
CREATE POLICY mp_delete_self_or_host ON public.meeting_participants FOR DELETE TO authenticated
  USING (auth.uid() = user_id OR public.is_meeting_host(meeting_id, auth.uid()));

-- SCHEDULED MEETINGS
DROP POLICY IF EXISTS sched_auth_all ON public.scheduled_meetings;
CREATE POLICY sched_select_host_or_invited ON public.scheduled_meetings FOR SELECT TO authenticated
  USING (
    auth.uid() = host_id
    OR EXISTS (
      SELECT 1 FROM public.meeting_invitations mi
      WHERE mi.scheduled_meeting_id = scheduled_meetings.id
        AND lower(trim(mi.invitee_email)) = public.current_user_email()
    )
  );
CREATE POLICY sched_insert_host ON public.scheduled_meetings FOR INSERT TO authenticated WITH CHECK (auth.uid() = host_id);
CREATE POLICY sched_update_host ON public.scheduled_meetings FOR UPDATE TO authenticated USING (auth.uid() = host_id) WITH CHECK (auth.uid() = host_id);
CREATE POLICY sched_delete_host ON public.scheduled_meetings FOR DELETE TO authenticated USING (auth.uid() = host_id);

-- MEETING INVITATIONS
DROP POLICY IF EXISTS invitations_auth_all ON public.meeting_invitations;
CREATE POLICY invitations_select ON public.meeting_invitations FOR SELECT TO authenticated
  USING (
    lower(trim(invitee_email)) = public.current_user_email()
    OR EXISTS (SELECT 1 FROM public.scheduled_meetings sm WHERE sm.id = meeting_invitations.scheduled_meeting_id AND sm.host_id = auth.uid())
  );
CREATE POLICY invitations_insert_host ON public.meeting_invitations FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.scheduled_meetings sm WHERE sm.id = scheduled_meeting_id AND sm.host_id = auth.uid()));
CREATE POLICY invitations_update_host_or_invitee ON public.meeting_invitations FOR UPDATE TO authenticated
  USING (
    lower(trim(invitee_email)) = public.current_user_email()
    OR EXISTS (SELECT 1 FROM public.scheduled_meetings sm WHERE sm.id = scheduled_meeting_id AND sm.host_id = auth.uid())
  )
  WITH CHECK (
    lower(trim(invitee_email)) = public.current_user_email()
    OR EXISTS (SELECT 1 FROM public.scheduled_meetings sm WHERE sm.id = scheduled_meeting_id AND sm.host_id = auth.uid())
  );
CREATE POLICY invitations_delete_host ON public.meeting_invitations FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.scheduled_meetings sm WHERE sm.id = scheduled_meeting_id AND sm.host_id = auth.uid()));

-- MEETING INVITE CALLS
DROP POLICY IF EXISTS invite_calls_auth_all ON public.meeting_invite_calls;
CREATE POLICY invite_calls_select ON public.meeting_invite_calls FOR SELECT TO authenticated
  USING (
    auth.uid() = host_id
    OR EXISTS (
      SELECT 1 FROM public.meeting_invite_call_recipients r
      WHERE r.call_id = meeting_invite_calls.id
        AND lower(trim(r.invitee_email)) = public.current_user_email()
    )
  );
CREATE POLICY invite_calls_insert_host ON public.meeting_invite_calls FOR INSERT TO authenticated WITH CHECK (auth.uid() = host_id);
CREATE POLICY invite_calls_update_host ON public.meeting_invite_calls FOR UPDATE TO authenticated USING (auth.uid() = host_id) WITH CHECK (auth.uid() = host_id);
CREATE POLICY invite_calls_delete_host ON public.meeting_invite_calls FOR DELETE TO authenticated USING (auth.uid() = host_id);

-- INVITE CALL RECIPIENTS
DROP POLICY IF EXISTS invite_call_recipients_auth_all ON public.meeting_invite_call_recipients;
CREATE POLICY icr_select ON public.meeting_invite_call_recipients FOR SELECT TO authenticated
  USING (
    lower(trim(invitee_email)) = public.current_user_email()
    OR EXISTS (SELECT 1 FROM public.meeting_invite_calls c WHERE c.id = call_id AND c.host_id = auth.uid())
  );
CREATE POLICY icr_insert_host ON public.meeting_invite_call_recipients FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.meeting_invite_calls c WHERE c.id = call_id AND c.host_id = auth.uid()));
CREATE POLICY icr_update_host_or_invitee ON public.meeting_invite_call_recipients FOR UPDATE TO authenticated
  USING (
    lower(trim(invitee_email)) = public.current_user_email()
    OR EXISTS (SELECT 1 FROM public.meeting_invite_calls c WHERE c.id = call_id AND c.host_id = auth.uid())
  )
  WITH CHECK (
    lower(trim(invitee_email)) = public.current_user_email()
    OR EXISTS (SELECT 1 FROM public.meeting_invite_calls c WHERE c.id = call_id AND c.host_id = auth.uid())
  );
CREATE POLICY icr_delete_host ON public.meeting_invite_call_recipients FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.meeting_invite_calls c WHERE c.id = call_id AND c.host_id = auth.uid()));

-- MEETING FILE SHARES (meeting_id is TEXT code -> use by_code helper)
DROP POLICY IF EXISTS "Users can view files in meetings they're in" ON public.meeting_file_shares;
CREATE POLICY meeting_file_shares_select_participant ON public.meeting_file_shares FOR SELECT TO authenticated
  USING (
    is_visible = true
    AND (
      uploaded_by = auth.uid()
      OR public.is_meeting_participant_by_code(meeting_id, auth.uid())
    )
  );

-- PLATFORM USAGE LOGS
DROP POLICY IF EXISTS "System can insert logs" ON public.platform_usage_logs;
CREATE POLICY platform_logs_insert_own ON public.platform_usage_logs FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- STORAGE: meeting-recordings
DROP POLICY IF EXISTS "Authenticated users can view recordings" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload recordings" ON storage.objects;
CREATE POLICY recordings_owner_select ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'meeting-recordings' AND (auth.uid())::text = (storage.foldername(name))[1]);
CREATE POLICY recordings_owner_insert ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'meeting-recordings' AND (auth.uid())::text = (storage.foldername(name))[1]);
CREATE POLICY recordings_owner_update ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'meeting-recordings' AND (auth.uid())::text = (storage.foldername(name))[1]);
CREATE POLICY recordings_owner_delete ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'meeting-recordings' AND (auth.uid())::text = (storage.foldername(name))[1]);

-- STORAGE: meeting-files DELETE restricted to uploader
DROP POLICY IF EXISTS "Users can delete their own files" ON storage.objects;
CREATE POLICY meeting_files_delete_uploader ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'meeting-files'
    AND EXISTS (SELECT 1 FROM public.meeting_file_shares mfs WHERE mfs.file_path = name AND mfs.uploaded_by = auth.uid())
  );

-- FIX function search_path
ALTER FUNCTION public.update_last_accessed_column() SET search_path = public;
ALTER FUNCTION public.update_updated_at_column() SET search_path = public;
ALTER FUNCTION public.log_platform_usage(uuid, text, text) SET search_path = public;
ALTER FUNCTION public.has_role(uuid, public.app_role) SET search_path = public;
ALTER FUNCTION public.generate_unique_phone_number() SET search_path = public;
