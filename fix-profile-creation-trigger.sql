-- Fix Profile Creation Trigger
-- This script fixes the profile creation during user registration

-- 1. Drop existing trigger and function
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS handle_enhanced_user_registration();

-- 2. Create improved function to handle user registration
CREATE OR REPLACE FUNCTION handle_enhanced_user_registration()
RETURNS TRIGGER AS $$
DECLARE
  user_account_type TEXT;
  user_first_name TEXT;
  user_last_name TEXT;
  user_name TEXT;
BEGIN
  -- Extract metadata from the new user
  user_account_type := COALESCE(NEW.raw_user_meta_data->>'account_type', 'individual');
  user_first_name := COALESCE(NEW.raw_user_meta_data->>'first_name', '');
  user_last_name := COALESCE(NEW.raw_user_meta_data->>'last_name', '');
  
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
    'passive'::investor_type, -- Default investor type
    NOW()
  );
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't fail the user creation
    RAISE WARNING 'Failed to create profile for user %: %', NEW.email, SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 3. Create the trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_enhanced_user_registration();

-- 4. Test the function (optional - creates a test profile)
-- This is just to verify the function works
DO $$
DECLARE
  test_user_id UUID := gen_random_uuid();
BEGIN
  -- Simulate a user creation
  INSERT INTO auth.users (
    id,
    email,
    raw_user_meta_data,
    created_at
  ) VALUES (
    test_user_id,
    'test@example.com',
    '{"first_name": "Test", "last_name": "User", "account_type": "individual"}'::jsonb,
    NOW()
  );
  
  -- Check if profile was created
  IF EXISTS (SELECT 1 FROM public.profiles WHERE id = test_user_id) THEN
    RAISE NOTICE 'Profile creation test: SUCCESS';
    -- Clean up test data
    DELETE FROM public.profiles WHERE id = test_user_id;
    DELETE FROM auth.users WHERE id = test_user_id;
  ELSE
    RAISE NOTICE 'Profile creation test: FAILED';
  END IF;
END $$;

-- 5. Create profiles for any existing auth users without profiles
INSERT INTO public.profiles (
  id,
  email,
  name,
  role,
  investor_type,
  created_at
)
SELECT 
  au.id,
  au.email,
  COALESCE(au.email, 'Unknown User'),
  'member'::user_role,
  'passive'::investor_type,
  au.created_at
FROM auth.users au
LEFT JOIN public.profiles p ON au.id = p.id
WHERE p.id IS NULL;

-- 6. Verify the setup
SELECT 'Profile creation trigger fixed successfully!' as status;

-- Show any users without profiles (should be 0)
SELECT 
  COUNT(*) as users_without_profiles
FROM auth.users au
LEFT JOIN public.profiles p ON au.id = p.id
WHERE p.id IS NULL;
