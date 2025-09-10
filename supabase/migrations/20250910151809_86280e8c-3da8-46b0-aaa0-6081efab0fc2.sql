-- Fix security warning by setting search_path for the duration calculation function
CREATE OR REPLACE FUNCTION public.calculate_participation_duration(
  p_joined_at timestamp with time zone,
  p_left_at timestamp with time zone DEFAULT NULL
)
RETURNS interval
LANGUAGE plpgsql
IMMUTABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- If left_at is null, calculate duration until now
  -- If left_at is provided, calculate duration between joined_at and left_at
  RETURN COALESCE(p_left_at, now()) - p_joined_at;
END;
$$;