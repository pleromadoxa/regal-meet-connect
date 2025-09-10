-- Add meeting-level admin roles for meeting-specific permissions
CREATE TABLE public.meeting_admins (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    meeting_id TEXT NOT NULL,
    user_id UUID NOT NULL,
    promoted_by UUID NOT NULL,
    promoted_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on meeting_admins
ALTER TABLE public.meeting_admins ENABLE ROW LEVEL SECURITY;

-- RLS Policies for meeting_admins
CREATE POLICY "Meeting hosts and admins can manage meeting admins" 
ON public.meeting_admins 
FOR INSERT 
WITH CHECK (
    EXISTS (
        SELECT 1 FROM meetings 
        WHERE meetings.meeting_id = meeting_admins.meeting_id 
        AND meetings.host_id = auth.uid()
    ) OR
    EXISTS (
        SELECT 1 FROM meeting_admins ma 
        WHERE ma.meeting_id = meeting_admins.meeting_id 
        AND ma.user_id = auth.uid()
    )
);

CREATE POLICY "Users can view meeting admins in their meetings" 
ON public.meeting_admins 
FOR SELECT 
USING (
    EXISTS (
        SELECT 1 FROM meeting_participants 
        WHERE meeting_participants.meeting_id = meeting_admins.meeting_id 
        AND meeting_participants.user_id = auth.uid()
    )
);

CREATE POLICY "Meeting hosts and admins can remove meeting admins" 
ON public.meeting_admins 
FOR DELETE 
USING (
    EXISTS (
        SELECT 1 FROM meetings 
        WHERE meetings.meeting_id = meeting_admins.meeting_id 
        AND meetings.host_id = auth.uid()
    ) OR
    EXISTS (
        SELECT 1 FROM meeting_admins ma 
        WHERE ma.meeting_id = meeting_admins.meeting_id 
        AND ma.user_id = auth.uid()
    )
);

-- Create indexes for performance
CREATE INDEX idx_meeting_admins_meeting_id ON public.meeting_admins(meeting_id);
CREATE INDEX idx_meeting_admins_user_id ON public.meeting_admins(user_id);