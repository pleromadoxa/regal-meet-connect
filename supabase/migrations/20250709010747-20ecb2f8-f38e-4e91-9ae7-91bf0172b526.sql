
-- Add a column to track meeting status and validation
ALTER TABLE meetings ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active' CHECK (status IN ('active', 'ended', 'cancelled'));

-- Add index for faster meeting ID lookups
CREATE INDEX IF NOT EXISTS idx_meetings_meeting_id ON meetings(meeting_id) WHERE is_active = true;

-- Update the meetings table to ensure proper validation
ALTER TABLE meetings ALTER COLUMN meeting_id SET NOT NULL;
ALTER TABLE meetings ADD CONSTRAINT unique_active_meeting_id UNIQUE (meeting_id) DEFERRABLE INITIALLY DEFERRED;
