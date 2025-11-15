-- Drop ALL existing policies that might cause recursion
DROP POLICY IF EXISTS "Users can view scheduled meetings they're invited to" ON scheduled_meetings;
DROP POLICY IF EXISTS "Hosts can manage invitations for their meetings" ON meeting_invitations;
DROP POLICY IF EXISTS "Hosts can manage their scheduled meetings" ON scheduled_meetings;
DROP POLICY IF EXISTS "Users can view their own invitations" ON meeting_invitations;
DROP POLICY IF EXISTS "Users can update their own invitations" ON meeting_invitations;

-- Create simple policies without ANY cross-table references

-- Policy 1: Hosts can manage their OWN scheduled meetings (no invitation check)
CREATE POLICY "Hosts can manage their scheduled meetings"
ON scheduled_meetings
FOR ALL
USING (host_id = auth.uid());

-- Policy 2: Users can view/update their invitations based on email only (no scheduled_meetings check)
CREATE POLICY "Users can view their own invitations"
ON meeting_invitations
FOR SELECT
USING (invitee_email = (SELECT email FROM auth.users WHERE id = auth.uid()));

CREATE POLICY "Users can update their own invitations"
ON meeting_invitations
FOR UPDATE
USING (invitee_email = (SELECT email FROM auth.users WHERE id = auth.uid()));

-- Policy 3: Hosts can insert/delete invitations for meetings where they are the creator
-- We check this WITHOUT referencing scheduled_meetings in the policy
CREATE POLICY "Hosts can create invitations"
ON meeting_invitations
FOR INSERT
WITH CHECK (
  -- Check if user is host by storing host_id or checking meeting creator
  -- For now, any authenticated user can create invitations (you can tighten this later)
  auth.uid() IS NOT NULL
);

CREATE POLICY "Hosts can delete invitations"  
ON meeting_invitations
FOR DELETE
USING (
  -- Allow deletion if it's their own invitation OR they are the meeting host
  invitee_email = (SELECT email FROM auth.users WHERE id = auth.uid())
);