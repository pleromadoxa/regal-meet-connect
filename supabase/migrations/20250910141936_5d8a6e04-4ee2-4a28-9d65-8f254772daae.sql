-- Create storage bucket for meeting files
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'meeting-files', 
  'meeting-files', 
  false, 
  52428800, -- 50MB limit
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation', 'text/plain', 'text/csv']
);

-- Create table for meeting file shares
CREATE TABLE public.meeting_file_shares (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  meeting_id TEXT NOT NULL,
  uploaded_by UUID NOT NULL,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  file_type TEXT NOT NULL,
  uploaded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  is_visible BOOLEAN NOT NULL DEFAULT true
);

-- Enable RLS on meeting_file_shares
ALTER TABLE public.meeting_file_shares ENABLE ROW LEVEL SECURITY;

-- Create indexes for better performance
CREATE INDEX idx_meeting_file_shares_meeting_id ON public.meeting_file_shares(meeting_id);
CREATE INDEX idx_meeting_file_shares_uploaded_by ON public.meeting_file_shares(uploaded_by);
CREATE INDEX idx_meeting_file_shares_uploaded_at ON public.meeting_file_shares(uploaded_at DESC);