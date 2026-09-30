-- Fix 42501 permission denied for table users on invitation and scheduled-meeting reads.
--
-- The invitation policies resolved the signed-in user email with
--   (SELECT email FROM auth.users WHERE id = auth.uid())
-- but the authenticated role has no SELECT grant on auth.users, so every
-- evaluation of those policies raised SQLSTATE 42501. That broke
--   * .from('meeting_invitations').select(...)
--   * .from('scheduled_meetings').select(...) because its SELECT policy
--     subqueries meeting_invitations, which re-applies these policies
-- Replace the subquery with the SECURITY DEFINER helper current_user_email()
-- (lower(trim(auth.jwt() ->> email))), which needs no table privileges.

DROP POLICY IF EXISTS "Users can view their own invitations" ON public.meeting_invitations;
CREATE POLICY "Users can view their own invitations"
ON public.meeting_invitations
FOR SELECT
TO authenticated
USING (
  lower(trim(invitee_email)) = current_user_email()
);

DROP POLICY IF EXISTS "Users can update their own invitations" ON public.meeting_invitations;
CREATE POLICY "Users can update their own invitations"
ON public.meeting_invitations
FOR UPDATE
TO authenticated
USING (
  lower(trim(invitee_email)) = current_user_email()
)
WITH CHECK (
  lower(trim(invitee_email)) = current_user_email()
);

DROP POLICY IF EXISTS "Hosts can delete invitations" ON public.meeting_invitations;
CREATE POLICY "Hosts can delete invitations"
ON public.meeting_invitations
FOR DELETE
TO authenticated
USING (
  lower(trim(invitee_email)) = current_user_email()
);
