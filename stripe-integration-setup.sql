-- Stripe Integration Database Setup
-- Run this after the main database-updates.sql

-- 1. Add Stripe-specific columns to profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS stripe_price_id TEXT,
ADD COLUMN IF NOT EXISTS subscription_status TEXT CHECK (subscription_status IN ('active', 'canceled', 'past_due', 'unpaid', 'incomplete', 'incomplete_expired', 'trialing'));

-- 2. Create subscription_events table for audit trail
CREATE TABLE IF NOT EXISTS subscription_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL CHECK (event_type IN ('created', 'updated', 'canceled', 'payment_failed', 'payment_succeeded')),
    stripe_event_id TEXT,
    subscription_tier TEXT,
    amount_cents INTEGER,
    currency TEXT DEFAULT 'usd',
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_profiles_stripe_customer_id ON profiles(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_profiles_stripe_subscription_id ON profiles(stripe_subscription_id);
CREATE INDEX IF NOT EXISTS idx_subscription_events_user_id ON subscription_events(user_id);
CREATE INDEX IF NOT EXISTS idx_subscription_events_created_at ON subscription_events(created_at);
CREATE INDEX IF NOT EXISTS idx_subscription_events_stripe_event_id ON subscription_events(stripe_event_id);

-- 4. Enable RLS for subscription_events
ALTER TABLE subscription_events ENABLE ROW LEVEL SECURITY;

-- 5. RLS policies for subscription_events
DROP POLICY IF EXISTS "Users can view their own subscription events" ON subscription_events;
DROP POLICY IF EXISTS "Admins can view all subscription events" ON subscription_events;

-- Users can only view their own subscription events
CREATE POLICY "Users can view their own subscription events" ON subscription_events
    FOR SELECT USING (auth.uid() = user_id);

-- Admins can view all subscription events  
CREATE POLICY "Admins can view all subscription events" ON subscription_events
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role = 'admin'
        )
    );

-- 6. Function to handle subscription status updates
CREATE OR REPLACE FUNCTION handle_subscription_update()
RETURNS TRIGGER AS $$
BEGIN
    -- Log subscription changes
    IF OLD.subscription_tier IS DISTINCT FROM NEW.subscription_tier OR 
       OLD.subscription_status IS DISTINCT FROM NEW.subscription_status THEN
        
        INSERT INTO subscription_events (
            user_id,
            event_type,
            subscription_tier,
            metadata
        ) VALUES (
            NEW.id,
            CASE 
                WHEN NEW.subscription_tier = 'pro' AND OLD.subscription_tier IS NULL THEN 'created'
                WHEN NEW.subscription_tier IS NULL AND OLD.subscription_tier = 'pro' THEN 'canceled'
                ELSE 'updated'
            END,
            NEW.subscription_tier,
            jsonb_build_object(
                'old_tier', OLD.subscription_tier,
                'new_tier', NEW.subscription_tier,
                'old_status', OLD.subscription_status,
                'new_status', NEW.subscription_status
            )
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 7. Create trigger for subscription updates
DROP TRIGGER IF EXISTS subscription_update_trigger ON profiles;
CREATE TRIGGER subscription_update_trigger
    AFTER UPDATE ON profiles
    FOR EACH ROW
    EXECUTE FUNCTION handle_subscription_update();

-- 8. Create Stripe webhook events table (for production use)
CREATE TABLE IF NOT EXISTS stripe_webhook_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    stripe_event_id TEXT UNIQUE NOT NULL,
    event_type TEXT NOT NULL,
    processed BOOLEAN DEFAULT FALSE,
    data JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    processed_at TIMESTAMP WITH TIME ZONE
);

-- 9. Add index for webhook processing
CREATE INDEX IF NOT EXISTS idx_stripe_webhook_events_stripe_event_id ON stripe_webhook_events(stripe_event_id);
CREATE INDEX IF NOT EXISTS idx_stripe_webhook_events_processed ON stripe_webhook_events(processed);
CREATE INDEX IF NOT EXISTS idx_stripe_webhook_events_created_at ON stripe_webhook_events(created_at);

-- 10. Sample query to check subscription status distribution
SELECT 
    subscription_tier,
    subscription_status,
    COUNT(*) as user_count
FROM profiles 
GROUP BY subscription_tier, subscription_status
ORDER BY subscription_tier NULLS FIRST, subscription_status;

-- 11. Sample query to check recent subscription events
SELECT 
    se.event_type,
    se.subscription_tier,
    se.created_at,
    p.email
FROM subscription_events se
JOIN profiles p ON se.user_id = p.id
ORDER BY se.created_at DESC
LIMIT 10;

-- 12. View for subscription analytics (for admin dashboard)
CREATE OR REPLACE VIEW subscription_analytics AS
SELECT 
    DATE_TRUNC('month', created_at) as month,
    subscription_tier,
    COUNT(*) as count,
    SUM(CASE WHEN event_type = 'created' THEN 1 ELSE 0 END) as new_subscriptions,
    SUM(CASE WHEN event_type = 'canceled' THEN 1 ELSE 0 END) as cancellations
FROM subscription_events
WHERE subscription_tier IS NOT NULL
GROUP BY DATE_TRUNC('month', created_at), subscription_tier
ORDER BY month DESC, subscription_tier;

-- 13. Grant permissions for the view
GRANT SELECT ON subscription_analytics TO authenticated;

COMMENT ON TABLE subscription_events IS 'Audit trail for subscription changes';
COMMENT ON TABLE stripe_webhook_events IS 'Store Stripe webhook events for processing';
COMMENT ON VIEW subscription_analytics IS 'Monthly subscription analytics for admin dashboard';
