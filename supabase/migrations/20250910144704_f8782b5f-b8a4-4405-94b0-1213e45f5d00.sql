-- Create table for meeting recordings
CREATE TABLE public.meeting_recordings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    meeting_id TEXT NOT NULL,
    host_id UUID NOT NULL,
    file_path TEXT NOT NULL,
    file_size BIGINT,
    duration_seconds INTEGER,
    started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    ended_at TIMESTAMP WITH TIME ZONE,
    status TEXT NOT NULL DEFAULT 'recording' CHECK (status IN ('recording', 'completed', 'failed')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.meeting_recordings ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Hosts can manage their meeting recordings" 
ON public.meeting_recordings 
FOR ALL 
USING (host_id = auth.uid())
WITH CHECK (host_id = auth.uid());

CREATE POLICY "Meeting participants can view recordings" 
ON public.meeting_recordings 
FOR SELECT 
USING (
    EXISTS (
        SELECT 1 FROM meeting_participants 
        WHERE meeting_participants.meeting_id = meeting_recordings.meeting_id 
        AND meeting_participants.user_id = auth.uid()
    )
);

-- Create storage bucket for recordings
INSERT INTO storage.buckets (id, name, public) 
VALUES ('meeting-recordings', 'meeting-recordings', false);

-- Storage policies for recordings (simple approach)
CREATE POLICY "Authenticated users can upload to meeting-recordings" 
ON storage.objects 
FOR INSERT 
WITH CHECK (
    bucket_id = 'meeting-recordings' AND
    auth.role() = 'authenticated'
);

CREATE POLICY "Authenticated users can view meeting recordings" 
ON storage.objects 
FOR SELECT 
USING (
    bucket_id = 'meeting-recordings' AND
    auth.role() = 'authenticated'
);

-- Indexes for performance
CREATE INDEX idx_meeting_recordings_meeting_id ON public.meeting_recordings(meeting_id);
CREATE INDEX idx_meeting_recordings_host_id ON public.meeting_recordings(host_id);

-- Trigger for updated_at
CREATE TRIGGER update_meeting_recordings_updated_at
    BEFORE UPDATE ON public.meeting_recordings
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();