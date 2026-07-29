
-- Create user roles enum
CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');

-- Create user_roles table
CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL DEFAULT 'user',
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    assigned_by UUID REFERENCES auth.users(id),
    UNIQUE (user_id, role)
);

-- Create platform usage logs table
CREATE TABLE public.platform_usage_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    ip_address INET,
    user_agent TEXT,
    country TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create meeting analytics table
CREATE TABLE public.meeting_analytics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    meeting_id UUID REFERENCES public.meetings(id) ON DELETE CASCADE,
    participant_count INTEGER DEFAULT 0,
    duration_minutes INTEGER,
    started_at TIMESTAMP WITH TIME ZONE,
    ended_at TIMESTAMP WITH TIME ZONE,
    country TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on new tables
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_usage_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meeting_analytics ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check user roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- RLS policies for user_roles (only admins can manage roles)
CREATE POLICY "Admins can manage all user roles" ON public.user_roles
FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can view their own roles" ON public.user_roles
FOR SELECT TO authenticated
USING (user_id = auth.uid());

-- RLS policies for platform_usage_logs (only admins can view)
CREATE POLICY "Admins can view all logs" ON public.platform_usage_logs
FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "System can insert logs" ON public.platform_usage_logs
FOR INSERT TO authenticated
WITH CHECK (true);

-- RLS policies for meeting_analytics (only admins can view)
CREATE POLICY "Admins can view all analytics" ON public.meeting_analytics
FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Function to assign admin role to specific user
CREATE OR REPLACE FUNCTION public.assign_admin_role(_email TEXT)
RETURNS VOID
LANGUAGE PLPGSQL
SECURITY DEFINER
AS $$
DECLARE
    _user_id UUID;
BEGIN
    -- Find user by email
    SELECT id INTO _user_id 
    FROM auth.users 
    WHERE email = _email;
    
    IF _user_id IS NOT NULL THEN
        -- Insert admin role if it doesn't exist
        INSERT INTO public.user_roles (user_id, role)
        VALUES (_user_id, 'admin')
        ON CONFLICT (user_id, role) DO NOTHING;
    END IF;
END;
$$;

-- Assign admin role to pleromadoxa@gmail.com (will work once user signs up)
SELECT public.assign_admin_role('pleromadoxa@gmail.com');

-- Create function to log platform usage
CREATE OR REPLACE FUNCTION public.log_platform_usage(
    _user_id UUID,
    _action TEXT,
    _ip_address INET DEFAULT NULL,
    _user_agent TEXT DEFAULT NULL,
    _country TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE PLPGSQL
SECURITY DEFINER
AS $$
BEGIN
    INSERT INTO public.platform_usage_logs (user_id, action, ip_address, user_agent, country)
    VALUES (_user_id, _action, _ip_address, _user_agent, _country);
END;
$$;
