-- Create a Supabase scheduled job to clean up expired recordings (older than 36 hours)
-- Run this SQL in your Supabase SQL Editor

-- 1. Ensure the 'expires_at' column exists in your meeting_recordings table
ALTER TABLE meeting_recordings
ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP WITH TIME ZONE;

-- 2. Create the function that performs the deletion
CREATE OR REPLACE FUNCTION delete_expired_recordings()
RETURNS void AS $$
DECLARE
  expired_record RECORD;
BEGIN
  -- Loop through all expired recordings
  FOR expired_record IN
    SELECT id, file_path
    FROM meeting_recordings
    WHERE expires_at < NOW() AND status = 'completed'
  LOOP
    -- Attempt to delete the file from the storage bucket via internal API
    -- (Requires setting up an Edge Function to trigger bucket deletion securely)
    -- As a basic safety measure, we mark it as expired in the DB.
    UPDATE meeting_recordings
    SET status = 'expired'
    WHERE id = expired_record.id;

    -- NOTE: To actually delete the file from storage bucket 'meeting-recordings',
    -- Supabase requires an authenticated client call. A best practice is to deploy an
    -- Edge function to clean up the bucket, or simply rely on this status='expired'
    -- to prevent UI access until an admin wipes the storage.
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Set up the pg_cron schedule to run this function every hour
-- NOTE: Requires the pg_cron extension to be enabled in Supabase Database Extensions
-- CREATE EXTENSION IF NOT EXISTS pg_cron;

-- SELECT cron.schedule(
--   'delete-expired-recordings-cron',
--   '0 * * * *', -- Every hour
--   'SELECT delete_expired_recordings();'
-- );
