-- Create scheduled_meetings table
CREATE TABLE IF NOT EXISTS public.scheduled_meetings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  meeting_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  host_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  scheduled_time TIMESTAMP WITH TIME ZONE NOT NULL,
  duration_minutes INTEGER NOT NULL DEFAULT 60,
  is_recurring BOOLEAN NOT NULL DEFAULT false,
  recurrence_pattern TEXT, -- daily, weekly, monthly
  recurrence_end_date TIMESTAMP WITH TIME ZONE,
  timezone TEXT NOT NULL DEFAULT 'UTC',
  meeting_link TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  status TEXT NOT NULL DEFAULT 'scheduled' -- scheduled, cancelled, completed
);

-- Create meeting_invitations table
CREATE TABLE IF NOT EXISTS public.meeting_invitations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  scheduled_meeting_id UUID NOT NULL REFERENCES public.scheduled_meetings(id) ON DELETE CASCADE,
  invitee_email TEXT NOT NULL,
  invitee_name TEXT,
  status TEXT NOT NULL DEFAULT 'pending', -- pending, accepted, declined
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.scheduled_meetings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meeting_invitations ENABLE ROW LEVEL SECURITY;

-- RLS Policies for scheduled_meetings
CREATE POLICY "Hosts can manage their scheduled meetings"
ON public.scheduled_meetings
FOR ALL
USING (host_id = auth.uid());

CREATE POLICY "Users can view scheduled meetings they're invited to"
ON public.scheduled_meetings
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.meeting_invitations
    WHERE scheduled_meeting_id = scheduled_meetings.id
    AND invitee_email = (SELECT email FROM auth.users WHERE id = auth.uid())
  )
);

-- RLS Policies for meeting_invitations
CREATE POLICY "Hosts can manage invitations for their meetings"
ON public.meeting_invitations
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.scheduled_meetings
    WHERE id = scheduled_meeting_id
    AND host_id = auth.uid()
  )
);

CREATE POLICY "Users can view their own invitations"
ON public.meeting_invitations
FOR SELECT
USING (
  invitee_email = (SELECT email FROM auth.users WHERE id = auth.uid())
);

CREATE POLICY "Users can update their own invitations"
ON public.meeting_invitations
FOR UPDATE
USING (
  invitee_email = (SELECT email FROM auth.users WHERE id = auth.uid())
);

-- Create indexes for performance
CREATE INDEX idx_scheduled_meetings_host_id ON public.scheduled_meetings(host_id);
CREATE INDEX idx_scheduled_meetings_scheduled_time ON public.scheduled_meetings(scheduled_time);
CREATE INDEX idx_meeting_invitations_scheduled_meeting_id ON public.meeting_invitations(scheduled_meeting_id);
CREATE INDEX idx_meeting_invitations_invitee_email ON public.meeting_invitations(invitee_email);

-- Create trigger for updated_at
CREATE TRIGGER update_scheduled_meetings_updated_at
BEFORE UPDATE ON public.scheduled_meetings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_meeting_invitations_updated_at
BEFORE UPDATE ON public.meeting_invitations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();