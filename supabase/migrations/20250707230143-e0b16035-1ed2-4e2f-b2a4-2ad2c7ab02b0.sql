
-- Create meetings table to store meeting information
CREATE TABLE public.meetings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  meeting_id TEXT NOT NULL UNIQUE,
  host_id UUID REFERENCES auth.users NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create meeting participants table to track who's in each meeting
CREATE TABLE public.meeting_participants (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  meeting_id UUID REFERENCES public.meetings(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users NOT NULL,
  user_name TEXT NOT NULL,
  is_host BOOLEAN NOT NULL DEFAULT false,
  is_muted BOOLEAN NOT NULL DEFAULT false,
  joined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(meeting_id, user_id)
);

-- Create captions table to store real-time captions
CREATE TABLE public.meeting_captions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  meeting_id UUID REFERENCES public.meetings(id) ON DELETE CASCADE NOT NULL,
  participant_id UUID REFERENCES public.meeting_participants(id) ON DELETE CASCADE NOT NULL,
  content TEXT NOT NULL,
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.meetings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meeting_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meeting_captions ENABLE ROW LEVEL SECURITY;

-- RLS policies for meetings
CREATE POLICY "Users can view meetings they host or participate in" 
  ON public.meetings 
  FOR SELECT 
  USING (
    host_id = auth.uid() OR 
    EXISTS (
      SELECT 1 FROM public.meeting_participants 
      WHERE meeting_participants.meeting_id = meetings.id 
      AND meeting_participants.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create their own meetings" 
  ON public.meetings 
  FOR INSERT 
  WITH CHECK (host_id = auth.uid());

CREATE POLICY "Hosts can update their meetings" 
  ON public.meetings 
  FOR UPDATE 
  USING (host_id = auth.uid());

CREATE POLICY "Hosts can delete their meetings" 
  ON public.meetings 
  FOR DELETE 
  USING (host_id = auth.uid());

-- RLS policies for meeting participants
CREATE POLICY "Users can view participants in meetings they're part of" 
  ON public.meeting_participants 
  FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM public.meetings 
      WHERE meetings.id = meeting_participants.meeting_id 
      AND (meetings.host_id = auth.uid() OR 
           EXISTS (SELECT 1 FROM public.meeting_participants mp2 
                  WHERE mp2.meeting_id = meetings.id AND mp2.user_id = auth.uid()))
    )
  );

CREATE POLICY "Users can join meetings" 
  ON public.meeting_participants 
  FOR INSERT 
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Hosts can manage participants" 
  ON public.meeting_participants 
  FOR UPDATE 
  USING (
    EXISTS (
      SELECT 1 FROM public.meetings 
      WHERE meetings.id = meeting_participants.meeting_id 
      AND meetings.host_id = auth.uid()
    )
  );

CREATE POLICY "Users can leave meetings" 
  ON public.meeting_participants 
  FOR DELETE 
  USING (
    user_id = auth.uid() OR 
    EXISTS (
      SELECT 1 FROM public.meetings 
      WHERE meetings.id = meeting_participants.meeting_id 
      AND meetings.host_id = auth.uid()
    )
  );

-- RLS policies for captions
CREATE POLICY "Users can view captions in meetings they're part of" 
  ON public.meeting_captions 
  FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM public.meeting_participants 
      WHERE meeting_participants.meeting_id = meeting_captions.meeting_id 
      AND meeting_participants.user_id = auth.uid()
    )
  );

CREATE POLICY "Participants can create captions" 
  ON public.meeting_captions 
  FOR INSERT 
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.meeting_participants 
      WHERE meeting_participants.id = participant_id 
      AND meeting_participants.user_id = auth.uid()
    )
  );

-- Enable realtime for all tables
ALTER TABLE public.meetings REPLICA IDENTITY FULL;
ALTER TABLE public.meeting_participants REPLICA IDENTITY FULL;
ALTER TABLE public.meeting_captions REPLICA IDENTITY FULL;

-- Add tables to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.meetings;
ALTER PUBLICATION supabase_realtime ADD TABLE public.meeting_participants;
ALTER PUBLICATION supabase_realtime ADD TABLE public.meeting_captions;
