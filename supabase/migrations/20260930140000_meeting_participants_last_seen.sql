-- Presence heartbeat for the in-meeting participant roster.
--
-- The roster used to treat "left_at IS NULL" as "this person is still here".
-- Any session that died without writing `left_at` (tab closed or refreshed,
-- browser/webview crashed, an expired anonymous session replaced by a fresh
-- user id on rejoin) therefore became a permanent ghost row: a solo host saw
-- themselves listed next to people who had left hours ago, the header count
-- and the participant tiles were inflated, and plan limits counted ghosts as
-- seats in use.
--
-- `last_seen` is re-published by every connected client every 20s; the client
-- hides (and retires) rows that have not been seen for 3 minutes.

ALTER TABLE public.meeting_participants
  ADD COLUMN IF NOT EXISTS last_seen timestamptz NOT NULL DEFAULT now();

CREATE INDEX IF NOT EXISTS meeting_participants_last_seen_idx
  ON public.meeting_participants (last_seen);

-- One-time repair: every row that is "active" at this moment predates this
-- migration, so none of them have ever heartbeaten — they are all ghosts of
-- sessions that never said goodbye. Stamp them out of the active roster.
-- Clients that are genuinely still connected re-publish their presence on
-- their next heartbeat (<= 20s) or immediately when they receive this very
-- UPDATE over realtime, so live participants barely flicker.
UPDATE public.meeting_participants
SET last_seen = now() - interval '10 minutes',
    left_at = COALESCE(left_at, now())
WHERE left_at IS NULL;
