# 🧪 Subscription Testing Guide

This guide shows you how to test the differences between Free and Pro subscriptions in IdeaFlow.

## 📋 Prerequisites

1. **Run Database Updates**:
   ```bash
   # First run the main database updates
   psql "your-supabase-connection-string" -f database-updates.sql
   
   # Then run the Stripe integration setup
   psql "your-supabase-connection-string" -f stripe-integration-setup.sql
   ```

2. **Create Test Accounts**:
   - Go to `/auth` and create two accounts:
     - `free@streakzilla.com`
     - `paid@streakzilla.com`

## 🔧 Setup Test Accounts

### Option 1: Using Admin Panel (Recommended)
1. **Make yourself an admin**:
   ```sql
   UPDATE profiles SET role = 'admin' WHERE email = 'your-email@domain.com';
   ```

2. **Access Admin Panel**:
   - Navigate to `/admin` (link appears in user dropdown for admins)
   - Use "Quick Test Account Setup" buttons to instantly configure:
     - `free@streakzilla.com` → Free plan
     - `paid@streakzilla.com` → Pro plan (30 days)

### Option 2: Using Billing Page
1. **Login as each test user**
2. **Go to `/billing`**
3. **Use the subscription management**:
   - Free users: Click "Upgrade to Pro" for simulation
   - Pro users: Click "Cancel Subscription" to downgrade

## 🧪 Testing Scenarios

### 🆓 Free Plan Limitations

#### **Test 1: AI Summary Limits (2 per month)**
1. **Login as**: `free@streakzilla.com`
2. **Create a meetup** (need moderator role first)
3. **Add some notes** to the meetup
4. **Generate AI summary** - Should work (1st time)
5. **Try to generate again** - Should work (2nd time)
6. **Try a 3rd time** - Should show error: "Free users get 2 AI summaries per month"

#### **Test 2: No Feedback Surveys**
1. **Login as**: `free@streakzilla.com`
2. **View any meetup details**
3. **Check tabs**: Should only see "Agenda" and "Notes" (no "Feedback" tab)

#### **Test 3: Group Creation Limits (1 group)**
1. **Login as**: `free@streakzilla.com` 
2. **Make user a moderator**:
   ```sql
   UPDATE profiles SET role = 'moderator' WHERE email = 'free@streakzilla.com';
   ```
3. **Go to `/groups`**
4. **Create first group** - Should work
5. **Try to create second group** - Should show error: "Free users can only create 1 group"

### 💎 Pro Plan Benefits

#### **Test 1: Unlimited AI Summaries**
1. **Login as**: `paid@streakzilla.com`
2. **Create meetups and generate multiple AI summaries**
3. **No limits should apply**

#### **Test 2: Meeting Feedback Surveys**
1. **Login as**: `paid@streakzilla.com`
2. **View any meetup details**
3. **Check tabs**: Should see "Agenda", "Notes", and "Feedback"
4. **Test feedback submission**: Fill out survey in Feedback tab

#### **Test 3: Unlimited Groups**
1. **Login as**: `paid@streakzilla.com`
2. **Make user a moderator** (if not already)
3. **Create multiple groups** - No limits

## 🎛️ Admin Panel Features

Access `/admin` as an admin to:

### **User Management**
- View all users and their subscription status
- Search users by email
- Manually update subscription tiers
- Change user roles (member/moderator/admin)

### **Quick Actions**
- Instantly set test accounts to Free/Pro
- Bulk user management
- Subscription analytics

### **Subscription Tracking**
- View subscription history
- Monitor usage patterns
- Track plan changes

## 💳 Subscription Flow Testing

### **Upgrading to Pro**
1. **Login as free user**
2. **Go to `/billing`**
3. **Click "Upgrade to Pro"** in current plan card
4. **Confirm simulation** - Account upgraded for 30 days
5. **Test Pro features immediately**

### **Downgrading to Free**
1. **Login as pro user**
2. **Go to `/billing`**
3. **Click "Cancel Subscription"**
4. **Confirm cancellation** - Account downgraded to Free
5. **Test that Pro features are now restricted**

## 🔍 Database Verification

### **Check Subscription Status**
```sql
SELECT 
    email,
    subscription_tier,
    subscription_expires_at,
    role
FROM profiles 
WHERE email IN ('free@streakzilla.com', 'paid@streakzilla.com');
```

### **View Usage Tracking**
```sql
SELECT 
    p.email,
    ut.feature_type,
    ut.created_at
FROM usage_tracking ut
JOIN profiles p ON ut.user_id = p.id
ORDER BY ut.created_at DESC;
```

### **Subscription Events**
```sql
SELECT 
    p.email,
    se.event_type,
    se.subscription_tier,
    se.created_at
FROM subscription_events se
JOIN profiles p ON se.user_id = p.id
ORDER BY se.created_at DESC;
```

## 🚀 Production Stripe Integration

When ready for production, the app is prepared for Stripe:

### **Database Ready**
- ✅ `stripe_customer_id` column
- ✅ `stripe_subscription_id` column
- ✅ Webhook events table
- ✅ Subscription audit trail

### **Code Ready**
- ✅ Subscription management flows
- ✅ Feature restriction logic
- ✅ Usage tracking system
- ✅ Admin management tools

### **Next Steps for Stripe**
1. Add Stripe SDK to project
2. Create Stripe products/prices
3. Implement checkout flow
4. Add webhook handlers
5. Update handleUpgrade() function

## 📊 Feature Comparison Summary

| Feature | Free | Pro |
|---------|------|-----|
| **Members per Group** | Up to 5 | Up to 50 |
| **Meetings per Month** | 3 | Unlimited |
| **Groups** | 1 | Unlimited |
| **AI Summaries** | 2/month | Every meeting |
| **Meeting Feedback** | ❌ | ✅ |
| **Rich Text Editing** | Basic | Full |
| **Export** | ❌ | ✅ |
| **Support** | Community | Priority |

## 🎯 Success Criteria

Your testing is successful when:

- ✅ Free users hit AI summary limits
- ✅ Free users cannot see Feedback tab
- ✅ Free users limited to 1 group creation
- ✅ Pro users have unlimited access
- ✅ Subscription upgrades/downgrades work
- ✅ Admin panel manages users correctly
- ✅ Database tracks usage properly

Happy testing! 🧪✨
