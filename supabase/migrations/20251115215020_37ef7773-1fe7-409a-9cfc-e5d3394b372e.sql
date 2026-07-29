-- Drop the problematic policies that cause infinite recursion
DROP POLICY IF EXISTS "Users can view scheduled meetings they're invited to" ON scheduled_meetings;
DROP POLICY IF EXISTS "Hosts can manage invitations for their meetings" ON meeting_invitations;

-- Simplified policy for scheduled_meetings - only hosts can see their meetings
-- Invitees will need to access via a different method or public link
CREATE POLICY "Users can view scheduled meetings they're invited to"
ON scheduled_meetings
FOR SELECT
USING (
  id IN (
    SELECT scheduled_meeting_id 
    FROM meeting_invitations 
    WHERE invitee_email = (SELECT email FROM auth.users WHERE id = auth.uid())
  )
);

-- Simplified policy for meeting_invitations - hosts can manage based on direct host_id check
CREATE POLICY "Hosts can manage invitations for their meetings"
ON meeting_invitations
FOR ALL
USING (
  EXISTS (
    SELECT 1 
    FROM scheduled_meetings sm
    WHERE sm.id = meeting_invitations.scheduled_meeting_id 
    AND sm.host_id = auth.uid()
  )
);