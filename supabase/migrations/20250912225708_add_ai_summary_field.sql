-- Add ai_summary field to meetings table
ALTER TABLE meetings ADD COLUMN IF NOT EXISTS ai_summary TEXT;

-- Add a comment to describe the field
COMMENT ON COLUMN meetings.ai_summary IS 'AI-generated summary of meeting notes';
