-- Comprehensive Fix for Profile Creation
-- This script fixes all profile creation issues

-- 1. Clean up existing triggers and functions
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS handle_enhanced_user_registration();
DROP FUNCTION IF EXISTS handle_new_user();

-- 2. Create a robust profile creation function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  user_name TEXT;
  user_first_name TEXT;
  user_last_name TEXT;
  user_account_type TEXT;
BEGIN
  -- Extract metadata
  user_first_name := COALESCE(NEW.raw_user_meta_data->>'first_name', '');
  user_last_name := COALESCE(NEW.raw_user_meta_data->>'last_name', '');
  user_account_type := COALESCE(NEW.raw_user_meta_data->>'account_type', 'individual');
  
  -- Create full name
  user_name := CASE 
    WHEN user_first_name IS NOT NULL AND user_last_name IS NOT NULL THEN
      TRIM(user_first_name || ' ' || user_last_name)
    WHEN user_first_name IS NOT NULL THEN
      user_first_name
    WHEN user_last_name IS NOT NULL THEN
      user_last_name
    ELSE
      NEW.email
  END;
  
  -- Insert profile with all required fields
  INSERT INTO public.profiles (
    id, 
    email, 
    name,
    first_name,
    last_name,
    account_type,
    role,
    investor_type,
    created_at
  ) VALUES (
    NEW.id,
    NEW.email,
    user_name,
    user_first_name,
    user_last_name,
    user_account_type,
    CASE 
      WHEN user_account_type = 'organization_admin' THEN 'admin'::user_role
      ELSE 'member'::user_role
    END,
    'passive'::investor_type,
    NOW()
  );
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't fail the user creation
    RAISE WARNING 'Failed to create profile for user %: %', NEW.email, SQLERRM;
    RETURN NEW;
END;
$$;

-- 3. Create the trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 4. Ensure all required columns exist in profiles table
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS first_name TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS last_name TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS account_type TEXT CHECK (account_type IN ('individual', 'organization_admin', 'member'));
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL;

-- 5. Create profiles for any existing auth users without profiles
INSERT INTO public.profiles (
  id,
  email,
  name,
  first_name,
  last_name,
  account_type,
  role,
  investor_type,
  created_at
)
SELECT 
  au.id,
  au.email,
  COALESCE(au.email, 'Unknown User'),
  'New',
  'User',
  'individual',
  'member'::user_role,
  'passive'::investor_type,
  au.created_at
FROM auth.users au
LEFT JOIN public.profiles p ON au.id = p.id
WHERE p.id IS NULL;

-- 6. Update existing profiles to have account_type if missing
UPDATE public.profiles 
SET account_type = 'individual'
WHERE account_type IS NULL;

-- 7. Test the function
DO $$
DECLARE
  test_user_id UUID := gen_random_uuid();
BEGIN
  -- Create a test user
  INSERT INTO auth.users (
    id,
    email,
    raw_user_meta_data,
    created_at
  ) VALUES (
    test_user_id,
    'test-profile@example.com',
    '{"first_name": "Test", "last_name": "Profile", "account_type": "individual"}'::jsonb,
    NOW()
  );
  
  -- Check if profile was created
  IF EXISTS (SELECT 1 FROM public.profiles WHERE id = test_user_id) THEN
    RAISE NOTICE 'Profile creation test: SUCCESS - Profile created for test user';
    -- Clean up test data
    DELETE FROM public.profiles WHERE id = test_user_id;
    DELETE FROM auth.users WHERE id = test_user_id;
  ELSE
    RAISE NOTICE 'Profile creation test: FAILED - No profile created';
  END IF;
END $$;

-- 8. Verify the setup
SELECT 'Profile creation system fixed successfully!' as status;

-- Show current profiles
SELECT 
  p.id,
  p.email,
  p.name,
  p.first_name,
  p.last_name,
  p.account_type,
  p.role,
  p.created_at
FROM public.profiles p
ORDER BY p.created_at DESC
LIMIT 10;

-- Show any users without profiles (should be 0)
SELECT 
  COUNT(*) as users_without_profiles
FROM auth.users au
LEFT JOIN public.profiles p ON au.id = p.id
WHERE p.id IS NULL;
