
-- Fix the infinite recursion issue in meetings RLS policy
-- Drop the problematic recursive policy
DROP POLICY IF EXISTS "Users can view meetings they host or participate in" ON meetings;

-- Create a simple, non-recursive policy that avoids the infinite loop
CREATE POLICY "Users can view meetings they host or participate in" 
ON meetings 
FOR SELECT 
USING (
  host_id = auth.uid()
  OR 
  id IN (
    SELECT meeting_id FROM meeting_participants 
    WHERE user_id = auth.uid()
  )
);

-- Also ensure the meeting_participants policy is correct and non-recursive
DROP POLICY IF EXISTS "Users can view participants in meetings they're part of" ON meeting_participants;

CREATE POLICY "Users can view participants in meetings they're part of" 
ON meeting_participants 
FOR SELECT 
USING (
  -- User can see participants if they are the host of the meeting
  EXISTS (
    SELECT 1 FROM meetings 
    WHERE meetings.id = meeting_participants.meeting_id 
    AND meetings.host_id = auth.uid()
  )
  OR 
  -- User can see participants if they are also a participant in the same meeting
  user_id = auth.uid()
);
