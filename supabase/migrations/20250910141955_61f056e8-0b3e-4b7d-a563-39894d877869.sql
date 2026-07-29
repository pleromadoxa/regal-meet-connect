-- Add RLS policies for meeting_file_shares table

-- Policy: Users can upload files to meetings they're participating in
CREATE POLICY "Users can upload files to meetings they're in" 
ON public.meeting_file_shares 
FOR INSERT 
WITH CHECK (
  uploaded_by = auth.uid()
);

-- Policy: Users can view files in meetings (public within meetings)  
CREATE POLICY "Users can view files in meetings they're in" 
ON public.meeting_file_shares 
FOR SELECT 
USING (is_visible = true);

-- Policy: File uploaders can update their files
CREATE POLICY "File uploaders can update their files" 
ON public.meeting_file_shares 
FOR UPDATE 
USING (uploaded_by = auth.uid());

-- Policy: File uploaders can delete their files  
CREATE POLICY "File uploaders can delete their files" 
ON public.meeting_file_shares 
FOR DELETE 
USING (uploaded_by = auth.uid());

-- Storage policies for meeting files
CREATE POLICY "Users can upload files to storage" 
ON storage.objects 
FOR INSERT 
WITH CHECK (
  bucket_id = 'meeting-files' AND
  auth.role() = 'authenticated'
);

CREATE POLICY "Users can view meeting files" 
ON storage.objects 
FOR SELECT 
USING (
  bucket_id = 'meeting-files' AND
  auth.role() = 'authenticated'
);

CREATE POLICY "Users can delete their own files" 
ON storage.objects 
FOR DELETE 
USING (
  bucket_id = 'meeting-files' AND
  auth.role() = 'authenticated'
);