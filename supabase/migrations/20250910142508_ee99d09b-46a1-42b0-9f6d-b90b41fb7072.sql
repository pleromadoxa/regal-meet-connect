-- Create enum for application roles
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

-- Create user_roles table
CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL,
    assigned_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE (user_id, role)
);

-- Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check user roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

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

-- RLS Policies for user_roles
CREATE POLICY "Admins can manage user roles" 
ON public.user_roles 
FOR ALL
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can view all user roles" 
ON public.user_roles 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'));

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
CREATE INDEX idx_user_roles_user_id ON public.user_roles(user_id);
CREATE INDEX idx_user_roles_role ON public.user_roles(role);
CREATE INDEX idx_meeting_admins_meeting_id ON public.meeting_admins(meeting_id);
CREATE INDEX idx_meeting_admins_user_id ON public.meeting_admins(user_id);