
-- Fix the infinite recursion by completely restructuring the policies
-- First, drop all existing policies that might be causing issues
DROP POLICY IF EXISTS "Users can view meetings they host or participate in" ON meetings;
DROP POLICY IF EXISTS "Users can view participants in meetings they're part of" ON meeting_participants;

-- Create a simple policy for meetings that only checks host ownership
-- We'll handle participant access through application logic instead of RLS
CREATE POLICY "Users can view their hosted meetings" 
ON meetings 
FOR SELECT 
USING (host_id = auth.uid());

-- Create a simple policy for meeting_participants that only allows users to see their own participation
CREATE POLICY "Users can view their own participation" 
ON meeting_participants 
FOR SELECT 
USING (user_id = auth.uid());

-- Also add a policy for hosts to see all participants in their meetings
CREATE POLICY "Hosts can view all participants in their meetings" 
ON meeting_participants 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM meetings 
    WHERE meetings.id = meeting_participants.meeting_id 
    AND meetings.host_id = auth.uid()
  )
);
