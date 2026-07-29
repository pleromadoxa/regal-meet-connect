-- Create table to track recent meetings for users
CREATE TABLE public.user_recent_meetings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  meeting_id text NOT NULL,
  meeting_title text,
  joined_at timestamp with time zone NOT NULL DEFAULT now(),
  last_accessed timestamp with time zone NOT NULL DEFAULT now(),
  is_host boolean NOT NULL DEFAULT false
);

-- Enable RLS
ALTER TABLE public.user_recent_meetings ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can manage their own recent meetings"
ON public.user_recent_meetings
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Add index for performance
CREATE INDEX idx_user_recent_meetings_user_id ON public.user_recent_meetings(user_id);
CREATE INDEX idx_user_recent_meetings_last_accessed ON public.user_recent_meetings(last_accessed DESC);

-- Create trigger for updating last_accessed timestamp
CREATE OR REPLACE FUNCTION public.update_last_accessed_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.last_accessed = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_recent_meetings_last_accessed
BEFORE UPDATE ON public.user_recent_meetings
FOR EACH ROW
EXECUTE FUNCTION public.update_last_accessed_column();