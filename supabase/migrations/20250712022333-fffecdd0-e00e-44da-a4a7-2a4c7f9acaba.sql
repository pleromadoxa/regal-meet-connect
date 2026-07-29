
-- Fix the infinite recursion issue in meeting_participants RLS policy
-- Drop the problematic recursive policy
DROP POLICY IF EXISTS "Users can view participants in meetings they're part of" ON meeting_participants;

-- Create a simple, non-recursive policy that avoids the infinite loop
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

-- Also fix any potential issues with the meetings SELECT policy
DROP POLICY IF EXISTS "Users can view meetings they host or participate in" ON meetings;

CREATE POLICY "Users can view meetings they host or participate in" 
ON meetings 
FOR SELECT 
USING (
  host_id = auth.uid()
  OR 
  EXISTS (
    SELECT 1 FROM meeting_participants mp 
    WHERE mp.meeting_id = meetings.id 
    AND mp.user_id = auth.uid()
  )
);
