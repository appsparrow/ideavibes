-- Create Test Profile Manually
-- Use this script to manually create a profile for testing

-- 1. Check current auth users
SELECT 
  id,
  email,
  created_at,
  raw_user_meta_data
FROM auth.users
ORDER BY created_at DESC;

-- 2. Create a profile for the most recent user (replace with actual user ID)
-- Replace 'USER_ID_HERE' with the actual user ID from step 1
DO $$
DECLARE
  user_id UUID;
  user_email TEXT;
BEGIN
  -- Get the most recent user
  SELECT id, email INTO user_id, user_email
  FROM auth.users
  ORDER BY created_at DESC
  LIMIT 1;
  
  -- Create profile if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = user_id) THEN
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
      user_id,
      user_email,
      COALESCE(user_email, 'New User'),
      'New',
      'User',
      'individual',
      'member'::user_role,
      'passive'::investor_type,
      NOW()
    );
    
    RAISE NOTICE 'Profile created for user: %', user_email;
  ELSE
    RAISE NOTICE 'Profile already exists for user: %', user_email;
  END IF;
END $$;

-- 3. Verify profile was created
SELECT 
  p.id,
  p.email,
  p.name,
  p.role,
  p.account_type,
  p.created_at
FROM public.profiles p
ORDER BY p.created_at DESC
LIMIT 5;
