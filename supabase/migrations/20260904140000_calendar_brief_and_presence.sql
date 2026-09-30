-- Regal Brief agenda notes + team live presence RPC

ALTER TABLE public.scheduled_meetings
  ADD COLUMN IF NOT EXISTS brief_agenda text;

ALTER TABLE public.calendar_events
  ADD COLUMN IF NOT EXISTS brief_agenda text;

CREATE OR REPLACE FUNCTION public.get_team_live_presence()
RETURNS TABLE (
  member_email text,
  member_name text,
  meeting_code text,
  meeting_title text,
  is_host boolean,
  participant_count bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH my_teams AS (
    SELECT DISTINCT tcm.team_calendar_id, lower(tcm.email) AS member_email, tcm.user_id AS member_user_id
    FROM public.team_calendar_members tcm
    WHERE tcm.user_id = auth.uid()
       OR lower(tcm.email) = lower(auth.jwt() ->> 'email')
  ),
  team_roster AS (
    SELECT DISTINCT lower(tcm.email) AS email, tcm.user_id
    FROM public.team_calendar_members tcm
    WHERE tcm.team_calendar_id IN (SELECT team_calendar_id FROM my_teams)
  ),
  live_rooms AS (
    SELECT m.id, m.meeting_id, m.title
    FROM public.meetings m
    WHERE m.is_active = true
  ),
  live_counts AS (
    SELECT mp.meeting_id AS room_id, count(*)::bigint AS cnt
    FROM public.meeting_participants mp
    JOIN live_rooms lr ON lr.id = mp.meeting_id
    WHERE mp.left_at IS NULL
    GROUP BY mp.meeting_id
  )
  SELECT
    lower(u.email::text),
    coalesce(p.display_name, mp.user_name)::text,
    lr.meeting_id::text,
    lr.title::text,
    mp.is_host,
    coalesce(lc.cnt, 1::bigint)
  FROM live_rooms lr
  JOIN public.meeting_participants mp ON mp.meeting_id = lr.id AND mp.left_at IS NULL
  JOIN auth.users u ON u.id = mp.user_id
  LEFT JOIN public.profiles p ON p.id = mp.user_id
  LEFT JOIN live_counts lc ON lc.room_id = lr.id
  WHERE EXISTS (
    SELECT 1 FROM team_roster tr
    WHERE tr.user_id = mp.user_id OR tr.email = lower(u.email::text)
  )
  ORDER BY lr.title, mp.user_name;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_team_live_presence() TO authenticated;
