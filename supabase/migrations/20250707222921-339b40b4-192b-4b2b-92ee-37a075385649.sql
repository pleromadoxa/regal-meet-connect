
-- Add foreign key constraint to link platform_usage_logs to profiles
ALTER TABLE public.platform_usage_logs 
ADD CONSTRAINT platform_usage_logs_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE SET NULL;
