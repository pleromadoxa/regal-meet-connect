-- Add location columns to meeting_participants table
ALTER TABLE public.meeting_participants 
ADD COLUMN IF NOT EXISTS country TEXT,
ADD COLUMN IF NOT EXISTS city TEXT,
ADD COLUMN IF NOT EXISTS ip_address TEXT;