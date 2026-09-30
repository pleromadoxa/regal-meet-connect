-- Reconcile public.meeting_participants with the schema the app expects.
--
-- This deployment never received 20250910151752 (ADD COLUMN left_at) and the
-- later location columns, so every query that filtered on `left_at` failed
-- outright. That is what emptied the in-meeting participants panel: the fetch
-- errored, nothing came back, and only the local user was rendered — which
-- looked like "only the host is in the meeting". Functions that reference the
-- column (e.g. public.get_team_live_presence) are broken for the same reason.
--
-- Everything here is idempotent so it is safe to run on any environment.

ALTER TABLE public.meeting_participants
  ADD COLUMN IF NOT EXISTS left_at timestamp with time zone;

ALTER TABLE public.meeting_participants
  ADD COLUMN IF NOT EXISTS country text;

ALTER TABLE public.meeting_participants
  ADD COLUMN IF NOT EXISTS city text;

ALTER TABLE public.meeting_participants
  ADD COLUMN IF NOT EXISTS ip_address text;

CREATE INDEX IF NOT EXISTS meeting_participants_meeting_id_idx
  ON public.meeting_participants (meeting_id);

-- Rows written before `left_at` existed can never be marked as left, so stale
-- entries from finished meetings would keep showing up in future sessions.
-- Only prune rows whose meeting is already over.
DELETE FROM public.meeting_participants mp
USING public.meetings m
WHERE m.id = mp.meeting_id
  AND mp.left_at IS NULL
  AND (m.status = 'ended' OR m.is_active = false);
