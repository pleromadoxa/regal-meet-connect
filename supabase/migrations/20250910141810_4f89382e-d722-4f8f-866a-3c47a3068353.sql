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

-- RLS Policies for meeting_file_shares
CREATE POLICY "Users can upload files to meetings they're in" 
ON public.meeting_file_shares 
FOR INSERT 
WITH CHECK (
  uploaded_by = auth.uid() AND
  EXISTS (
    SELECT 1 FROM meeting_participants 
    WHERE meeting_participants.meeting_id = meeting_file_shares.meeting_id 
    AND meeting_participants.user_id = auth.uid()
  )
);

CREATE POLICY "Users can view files in meetings they're in" 
ON public.meeting_file_shares 
FOR SELECT 
USING (
  is_visible = true AND
  EXISTS (
    SELECT 1 FROM meeting_participants 
    WHERE meeting_participants.meeting_id = meeting_file_shares.meeting_id 
    AND meeting_participants.user_id = auth.uid()
  )
);

CREATE POLICY "File uploaders and hosts can update file visibility" 
ON public.meeting_file_shares 
FOR UPDATE 
USING (
  uploaded_by = auth.uid() OR
  EXISTS (
    SELECT 1 FROM meetings 
    WHERE meetings.meeting_id = meeting_file_shares.meeting_id 
    AND meetings.host_id = auth.uid()
  )
);

CREATE POLICY "File uploaders and hosts can delete files" 
ON public.meeting_file_shares 
FOR DELETE 
USING (
  uploaded_by = auth.uid() OR
  EXISTS (
    SELECT 1 FROM meetings 
    WHERE meetings.meeting_id = meeting_file_shares.meeting_id 
    AND meetings.host_id = auth.uid()
  )
);

-- Storage policies for meeting files
CREATE POLICY "Users can upload files to meetings they're in" 
ON storage.objects 
FOR INSERT 
WITH CHECK (
  bucket_id = 'meeting-files' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can view files in meetings they're in" 
ON storage.objects 
FOR SELECT 
USING (
  bucket_id = 'meeting-files' AND
  EXISTS (
    SELECT 1 FROM meeting_participants 
    WHERE meeting_participants.meeting_id = (storage.foldername(name))[2]
    AND meeting_participants.user_id = auth.uid()
  )
);

CREATE POLICY "File owners and hosts can delete files" 
ON storage.objects 
FOR DELETE 
USING (
  bucket_id = 'meeting-files' AND (
    (storage.foldername(name))[1] = auth.uid()::text OR
    EXISTS (
      SELECT 1 FROM meetings 
      WHERE meetings.meeting_id = (storage.foldername(name))[2]
      AND meetings.host_id = auth.uid()
    )
  )
);

-- Create index for better performance
CREATE INDEX idx_meeting_file_shares_meeting_id ON public.meeting_file_shares(meeting_id);
CREATE INDEX idx_meeting_file_shares_uploaded_by ON public.meeting_file_shares(uploaded_by);
CREATE INDEX idx_meeting_file_shares_uploaded_at ON public.meeting_file_shares(uploaded_at DESC);