
-- Fix the meeting_captions table to properly reference meetings by meeting_id (text) instead of UUID
-- First, drop the existing foreign key constraint if it exists
ALTER TABLE meeting_captions DROP CONSTRAINT IF EXISTS meeting_captions_meeting_id_fkey;

-- Update the meeting_captions table to use text meeting_id that matches meetings.meeting_id
ALTER TABLE meeting_captions 
ALTER COLUMN meeting_id TYPE text;

-- Add proper foreign key constraint
ALTER TABLE meeting_captions 
ADD CONSTRAINT meeting_captions_meeting_id_fkey 
FOREIGN KEY (meeting_id) REFERENCES meetings(meeting_id);

-- Fix the RLS policy for meeting_participants to avoid infinite recursion
DROP POLICY IF EXISTS "Users can view participants in meetings they're part of" ON meeting_participants;

-- Create a simpler, non-recursive policy
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
  OR
  -- User can see other participants in meetings where they are a participant
  EXISTS (
    SELECT 1 FROM meetings m
    INNER JOIN meeting_participants mp ON m.id = mp.meeting_id
    WHERE m.id = meeting_participants.meeting_id 
    AND mp.user_id = auth.uid()
  )
);

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
