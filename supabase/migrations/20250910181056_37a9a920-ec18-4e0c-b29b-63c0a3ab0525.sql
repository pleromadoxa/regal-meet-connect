-- Add location columns to meeting_participants table
ALTER TABLE public.meeting_participants 
ADD COLUMN country TEXT,
ADD COLUMN city TEXT,
ADD COLUMN ip_address TEXT;