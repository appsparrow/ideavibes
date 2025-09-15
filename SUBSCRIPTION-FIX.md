# 🔧 Quick Fix: Subscription Error

## ⚠️ Error Message
```
Error upgrading subscription: Error: Database error: new row violates row-level security policy for table "subscription_events". Please run the database updates first.
```

## 🚀 **Solution**

The error occurs because the `subscription_events` table doesn't exist yet. Run these SQL commands in your **Supabase SQL Editor**:

### **Step 1: Run Stripe Integration Setup**

Copy and paste this entire SQL script:

```sql
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

-- Allow users to insert their own subscription events
CREATE POLICY "Users can insert their own subscription events" ON subscription_events
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Allow system to update subscription events (for webhooks)
CREATE POLICY "System can update subscription events" ON subscription_events
    FOR UPDATE USING (true);

-- 6. Verify the table was created
SELECT 
    table_name,
    column_name, 
    data_type, 
    is_nullable 
FROM information_schema.columns 
WHERE table_name = 'subscription_events'
ORDER BY ordinal_position;
```

### **Step 2: Verify Setup**

After running the SQL, check that the table exists:

```sql
SELECT * FROM subscription_events LIMIT 1;
```

You should see an empty result (no error).

### **Step 3: Test Subscription**

1. Go to the **Billing** page in your app
2. Try upgrading to Pro
3. The subscription should work without errors

## ✅ **What This Fixes**

- ✅ Creates the missing `subscription_events` table
- ✅ Sets up proper RLS policies
- ✅ Adds Stripe-specific columns to profiles
- ✅ Enables subscription tracking and audit trail
- ✅ Fixes the "violates row-level security policy" error

## 🔍 **Why This Happened**

The subscription system was partially implemented but the database tables weren't created yet. The Billing component tries to insert into `subscription_events` table which didn't exist, causing the RLS policy violation.

After running this fix, all subscription features will work correctly! 🎉
