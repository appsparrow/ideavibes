-- Fix subscription columns - run this to ensure columns exist
-- Run this if you're getting subscription_tier errors

-- 1. Add subscription columns if they don't exist
DO $$ 
BEGIN
    -- Check if subscription_tier column exists, if not add it
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'profiles' AND column_name = 'subscription_tier') THEN
        ALTER TABLE profiles ADD COLUMN subscription_tier TEXT;
    END IF;
    
    -- Check if subscription_expires_at column exists, if not add it
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'profiles' AND column_name = 'subscription_expires_at') THEN
        ALTER TABLE profiles ADD COLUMN subscription_expires_at TIMESTAMP WITH TIME ZONE;
    END IF;
END $$;

-- 2. Create usage_tracking table if it doesn't exist
CREATE TABLE IF NOT EXISTS usage_tracking (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    feature_type TEXT NOT NULL,
    meetup_id UUID REFERENCES meetings(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Create index for usage tracking
CREATE INDEX IF NOT EXISTS idx_usage_tracking_user_feature ON usage_tracking(user_id, feature_type);
CREATE INDEX IF NOT EXISTS idx_usage_tracking_created_at ON usage_tracking(created_at);

-- 4. Enable RLS for usage_tracking
ALTER TABLE usage_tracking ENABLE ROW LEVEL SECURITY;

-- 5. RLS policies for usage_tracking
DROP POLICY IF EXISTS "Users can view their own usage" ON usage_tracking;
CREATE POLICY "Users can view their own usage" ON usage_tracking
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "System can insert usage" ON usage_tracking;
CREATE POLICY "System can insert usage" ON usage_tracking
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 6. Verify columns exist
SELECT 
    column_name, 
    data_type, 
    is_nullable 
FROM information_schema.columns 
WHERE table_name = 'profiles' 
AND column_name IN ('subscription_tier', 'subscription_expires_at')
ORDER BY column_name;
