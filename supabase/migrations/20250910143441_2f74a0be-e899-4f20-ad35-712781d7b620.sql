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

-- Storage policies for recordings
CREATE POLICY "Hosts can upload recordings" 
ON storage.objects 
FOR INSERT 
WITH CHECK (
    bucket_id = 'meeting-recordings' AND
    auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Meeting participants can view recordings" 
ON storage.objects 
FOR SELECT 
USING (
    bucket_id = 'meeting-recordings' AND
    EXISTS (
        SELECT 1 FROM meeting_recordings mr
        JOIN meeting_participants mp ON mp.meeting_id = mr.meeting_id
        WHERE storage.foldername(name)[1] = mr.host_id::text
        AND mp.user_id = auth.uid()
    )
);

-- Indexes for performance
CREATE INDEX idx_meeting_recordings_meeting_id ON public.meeting_recordings(meeting_id);
CREATE INDEX idx_meeting_recordings_host_id ON public.meeting_recordings(host_id);

-- Trigger for updated_at
CREATE TRIGGER update_meeting_recordings_updated_at
    BEFORE UPDATE ON public.meeting_recordings
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();