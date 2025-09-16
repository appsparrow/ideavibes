-- Debug Profile Creation Issues
-- This script helps diagnose why profiles aren't being created during registration

-- 1. Check if the trigger exists
SELECT 
    trigger_name,
    event_manipulation,
    action_statement,
    action_timing
FROM information_schema.triggers 
WHERE trigger_name = 'on_auth_user_created';

-- 2. Check if the function exists
SELECT 
    routine_name,
    routine_type,
    routine_definition
FROM information_schema.routines 
WHERE routine_name = 'handle_enhanced_user_registration';

-- 3. Check current profiles table structure
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'profiles' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- 4. Check if there are any auth users without profiles
SELECT 
    au.id as auth_user_id,
    au.email as auth_email,
    au.created_at as auth_created_at,
    p.id as profile_id,
    p.name as profile_name,
    p.role as profile_role
FROM auth.users au
LEFT JOIN public.profiles p ON au.id = p.id
ORDER BY au.created_at DESC;

-- 5. Check recent auth user metadata
SELECT 
    id,
    email,
    raw_user_meta_data,
    created_at
FROM auth.users
ORDER BY created_at DESC
LIMIT 5;

-- 6. Test the trigger function manually (if needed)
-- This would be run after creating a test user
-- SELECT handle_enhanced_user_registration();
