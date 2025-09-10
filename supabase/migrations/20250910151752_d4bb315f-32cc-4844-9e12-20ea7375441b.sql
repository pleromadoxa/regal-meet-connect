-- Add left_at column to track when participants leave meetings
ALTER TABLE public.meeting_participants 
ADD COLUMN left_at timestamp with time zone;

-- Create a function to calculate participation duration
CREATE OR REPLACE FUNCTION public.calculate_participation_duration(
  p_joined_at timestamp with time zone,
  p_left_at timestamp with time zone DEFAULT NULL
)
RETURNS interval
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  -- If left_at is null, calculate duration until now
  -- If left_at is provided, calculate duration between joined_at and left_at
  RETURN COALESCE(p_left_at, now()) - p_joined_at;
END;
$$;

-- Create index for better performance on meeting participation queries
CREATE INDEX idx_meeting_participants_meeting_joined ON public.meeting_participants(meeting_id, joined_at);
CREATE INDEX idx_meeting_participants_user_joined ON public.meeting_participants(user_id, joined_at);