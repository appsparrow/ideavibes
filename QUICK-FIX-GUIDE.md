# 🔧 Quick Fix Guide - Subscription Testing

## ⚠️ Database Error Solution

The error you're seeing means the subscription columns don't exist in your database yet. Here's how to fix it:

### **Step 1: Run Database Updates**

Connect to your Supabase database and run these SQL commands:

```sql
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

-- 4. Enable RLS for usage_tracking
ALTER TABLE usage_tracking ENABLE ROW LEVEL SECURITY;

-- 5. RLS policies for usage_tracking
CREATE POLICY "Users can view their own usage" ON usage_tracking
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "System can insert usage" ON usage_tracking
    FOR INSERT WITH CHECK (auth.uid() = user_id);
```

### **Step 2: Verify Database Update**

Check if the columns were added:

```sql
SELECT 
    column_name, 
    data_type, 
    is_nullable 
FROM information_schema.columns 
WHERE table_name = 'profiles' 
AND column_name IN ('subscription_tier', 'subscription_expires_at')
ORDER BY column_name;
```

You should see both columns listed.

### **Step 3: Make Yourself Admin**

```sql
UPDATE profiles SET role = 'admin' WHERE email = 'your-email@domain.com';
```

## 🧪 Testing the Subscription Features

### **Method 1: Using Admin Panel (Recommended)**

1. **Go to `/admin`** (link appears in user dropdown)
2. **Create test accounts**: Sign up with `free@streakzilla.com` and `paid@streakzilla.com`
3. **Use Quick Actions**: Click the buttons to instantly set subscription tiers
4. **Test features**: Switch between accounts to see differences

### **Method 2: Using Billing Page**

1. **Go to `/billing`** as any user
2. **Click "Upgrade to Pro"** in the Current Plan card
3. **Confirm the simulation** - account upgrades immediately
4. **Test Pro features**: AI summaries, feedback surveys, etc.

## 🎯 What You Should See

### **Free Users** 🆓
- ❌ No PRO badge in header or profile
- ❌ Limited to 2 AI summaries per month
- ❌ No Feedback tab in meetups
- ❌ Can only create 1 group

### **Pro Users** 💎
- ✅ **PRO badge** in header (purple/blue gradient)
- ✅ **PRO badge** on profile page
- ✅ Unlimited AI summaries
- ✅ Feedback tab visible in meetups
- ✅ Can create unlimited groups

## 🎨 Pro Badge Features Added

### **Header Badge**
- **Location**: Next to user avatar in top right
- **Style**: Purple to blue gradient with "PRO" text
- **Visibility**: Only shows for active Pro users

### **Profile Badge**
- **Location**: Next to "Enhanced Profile" title
- **Style**: Same gradient design
- **Condition**: Shows only for Pro users with valid subscription

## 🚀 Quick Test Steps

1. **Run the SQL above** in your Supabase SQL editor
2. **Refresh your app** - errors should be gone
3. **Go to `/admin`** and set up test accounts
4. **Switch between accounts** to see subscription differences
5. **Test Pro upgrade/downgrade** via billing page

## 🔍 Troubleshooting

### **Still seeing errors?**
- Double-check the SQL ran successfully
- Refresh your browser/app
- Check browser console for specific error messages

### **Pro badge not showing?**
- Verify user has `subscription_tier = 'pro'` in database
- Check `subscription_expires_at` is in the future (or null)
- Clear browser cache and reload

### **Admin panel not accessible?**
- Confirm your role is set to 'admin' in database
- Log out and log back in
- Check the admin link appears in user dropdown

## 📊 Database Verification Queries

```sql
-- Check user subscription status
SELECT email, subscription_tier, subscription_expires_at, role 
FROM profiles 
WHERE email IN ('free@streakzilla.com', 'paid@streakzilla.com', 'your-email@domain.com');

-- Check AI summary usage
SELECT p.email, COUNT(ut.id) as ai_summaries_used
FROM profiles p
LEFT JOIN usage_tracking ut ON p.id = ut.user_id AND ut.feature_type = 'ai_summary'
GROUP BY p.email;
```

After running the database updates, the subscription features should work perfectly! 🎉
