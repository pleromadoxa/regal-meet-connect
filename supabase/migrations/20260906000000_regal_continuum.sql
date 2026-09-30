-- Regal Continuum: Wrap notes + follow-up links between Meeting and Calendar

ALTER TABLE public.meetings
  ADD COLUMN IF NOT EXISTS wrap_notes text,
  ADD COLUMN IF NOT EXISTS wrap_completed_at timestamptz;

ALTER TABLE public.scheduled_meetings
  ADD COLUMN IF NOT EXISTS follow_up_of_meeting_id text;

CREATE INDEX IF NOT EXISTS idx_scheduled_meetings_follow_up
  ON public.scheduled_meetings (follow_up_of_meeting_id)
  WHERE follow_up_of_meeting_id IS NOT NULL;

COMMENT ON COLUMN public.meetings.wrap_notes IS 'Regal Wrap notes captured when leaving a meeting';
COMMENT ON COLUMN public.meetings.wrap_completed_at IS 'When Regal Wrap was completed';
COMMENT ON COLUMN public.scheduled_meetings.follow_up_of_meeting_id IS 'Meeting code this scheduled meet follows up from';

-- Participants (or host) can save wrap notes without updating other meeting fields
CREATE OR REPLACE FUNCTION public.save_meeting_wrap(
  p_meeting_code text,
  p_notes text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_meeting_uuid uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT m.id INTO v_meeting_uuid
  FROM public.meetings m
  WHERE upper(m.meeting_id) = upper(trim(p_meeting_code))
  ORDER BY m.created_at DESC
  LIMIT 1;

  IF v_meeting_uuid IS NULL THEN
    RAISE EXCEPTION 'Meeting not found';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.meetings m
    WHERE m.id = v_meeting_uuid AND m.host_id = auth.uid()
  ) AND NOT EXISTS (
    SELECT 1 FROM public.meeting_participants mp
    WHERE mp.meeting_id = v_meeting_uuid AND mp.user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Not a participant';
  END IF;

  UPDATE public.meetings
  SET
    wrap_notes = nullif(trim(p_notes), ''),
    wrap_completed_at = now(),
    updated_at = now()
  WHERE id = v_meeting_uuid;
END;
$$;

GRANT EXECUTE ON FUNCTION public.save_meeting_wrap(text, text) TO authenticated;
