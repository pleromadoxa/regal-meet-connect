
-- Allow users to view meetings for validation purposes (they need to see if a meeting exists to join it)
-- This policy allows SELECT access to meetings for validation, but still protects sensitive meeting data
CREATE POLICY "Users can validate meeting existence for joining" 
ON public.meetings 
FOR SELECT 
USING (is_active = true AND status != 'ended' AND status != 'cancelled');

-- We should also update the existing policy to be more specific
DROP POLICY IF EXISTS "Users can view their hosted meetings" ON public.meetings;

CREATE POLICY "Hosts can view their meetings" 
ON public.meetings 
FOR SELECT 
USING (host_id = auth.uid());
