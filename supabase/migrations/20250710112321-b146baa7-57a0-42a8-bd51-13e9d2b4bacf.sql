
-- Fix the infinite recursion issue in meeting_participants RLS policy
-- Drop the problematic recursive policy
DROP POLICY IF EXISTS "Users can view participants in meetings they're part of" ON meeting_participants;

-- Create a simpler, non-recursive policy that avoids the infinite loop
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

-- Also ensure the captions policies work correctly with the meeting_id reference
-- Update the foreign key constraint for meeting_captions to reference meetings.meeting_id (text) instead of meetings.id (uuid)
ALTER TABLE meeting_captions DROP CONSTRAINT IF EXISTS meeting_captions_meeting_id_fkey;

-- Update the meeting_captions table to use text meeting_id that matches meetings.meeting_id
ALTER TABLE meeting_captions 
ALTER COLUMN meeting_id TYPE text;

-- Add proper foreign key constraint
ALTER TABLE meeting_captions 
ADD CONSTRAINT meeting_captions_meeting_id_fkey 
FOREIGN KEY (meeting_id) REFERENCES meetings(meeting_id);

-- Update captions RLS policy to work with text meeting_id
DROP POLICY IF EXISTS "Users can view captions in meetings they're part of" ON meeting_captions;

CREATE POLICY "Users can view captions in meetings they're part of" 
ON meeting_captions 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM meetings m
    INNER JOIN meeting_participants mp ON m.id = mp.meeting_id
    WHERE m.meeting_id = meeting_captions.meeting_id
    AND mp.user_id = auth.uid()
  )
);

-- Update captions insert policy
DROP POLICY IF EXISTS "Participants can create captions" ON meeting_captions;

CREATE POLICY "Participants can create captions" 
ON meeting_captions 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM meeting_participants mp
    INNER JOIN meetings m ON m.id = mp.meeting_id
    WHERE mp.id = meeting_captions.participant_id
    AND mp.user_id = auth.uid()
    AND m.meeting_id = meeting_captions.meeting_id
  )
);
