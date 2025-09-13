-- Database updates for IdeaVibes improvements

-- 1. Add missing columns to meetings table
ALTER TABLE meetings ADD COLUMN IF NOT EXISTS ai_summary TEXT;
ALTER TABLE meetings ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- 2. Create function to auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 3. Create trigger for meetings table
DROP TRIGGER IF EXISTS update_meetings_updated_at ON meetings;
CREATE TRIGGER update_meetings_updated_at
    BEFORE UPDATE ON meetings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 4. Create meetup_feedback table for per-user feedback
CREATE TABLE IF NOT EXISTS meetup_feedback (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    meetup_id UUID NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    responses JSONB NOT NULL,
    submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(meetup_id, user_id)
);

-- 4b. If table already exists, add user_id column
DO $$ 
BEGIN
    -- Check if user_id column exists, if not add it
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'meetup_feedback' AND column_name = 'user_id') THEN
        ALTER TABLE meetup_feedback ADD COLUMN user_id UUID REFERENCES profiles(id) ON DELETE CASCADE;
    END IF;
    
    -- Add unique constraint if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints 
                   WHERE table_name = 'meetup_feedback' AND constraint_name = 'meetup_feedback_meetup_id_user_id_key') THEN
        ALTER TABLE meetup_feedback ADD CONSTRAINT meetup_feedback_meetup_id_user_id_key UNIQUE(meetup_id, user_id);
    END IF;
END $$;

-- 5. Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_meetup_feedback_meetup_id ON meetup_feedback(meetup_id);
CREATE INDEX IF NOT EXISTS idx_meetup_feedback_user_id ON meetup_feedback(user_id);
CREATE INDEX IF NOT EXISTS idx_meetup_feedback_submitted_at ON meetup_feedback(submitted_at);

-- 6. Add RLS (Row Level Security) for feedback table
ALTER TABLE meetup_feedback ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can manage their own feedback" ON meetup_feedback;
DROP POLICY IF EXISTS "Admins can read all feedback" ON meetup_feedback;
DROP POLICY IF EXISTS "Anyone can submit feedback" ON meetup_feedback;

-- Users can only insert/update their own feedback
CREATE POLICY "Users can manage their own feedback" ON meetup_feedback
    FOR ALL USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Admins/moderators can read all feedback
CREATE POLICY "Admins can read all feedback" ON meetup_feedback
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role IN ('admin', 'moderator')
        )
    );

-- 7. Add pricing tier to profiles table for subscription management
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS subscription_tier TEXT DEFAULT 'free' CHECK (subscription_tier IN ('free', 'pro', 'enterprise'));
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS subscription_expires_at TIMESTAMP WITH TIME ZONE;

-- 8. Create usage tracking table for free tier limits
CREATE TABLE IF NOT EXISTS usage_tracking (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    month_year TEXT NOT NULL, -- Format: 'YYYY-MM'
    meetings_created INTEGER DEFAULT 0,
    ai_summaries_generated INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, month_year)
);

-- 9. Create index for usage tracking
CREATE INDEX IF NOT EXISTS idx_usage_tracking_user_month ON usage_tracking(user_id, month_year);

-- 10. Verify all columns exist
SELECT 
    table_name,
    column_name, 
    data_type, 
    is_nullable 
FROM information_schema.columns 
WHERE table_name IN ('meetings', 'meetup_feedback', 'profiles', 'usage_tracking')
ORDER BY table_name, ordinal_position;

-- 11. Sample query to check meetup feedback structure
SELECT 
    m.date as meetup_date,
    COUNT(mf.id) as feedback_count,
    mf.responses->'q4' as best_part_responses
FROM meetings m
LEFT JOIN meetup_feedback mf ON m.id = mf.meetup_id
GROUP BY m.id, m.date, mf.responses
ORDER BY m.date DESC
LIMIT 5;
