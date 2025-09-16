-- Simple fix for profiles access - works with existing users
-- Admin: siva@strakzilla.com, Members: everyone else

-- First, let's make sure siva@strakzilla.com is set as admin
UPDATE public.profiles 
SET role = 'admin' 
WHERE email = 'siva@strakzilla.com';

-- Drop all existing conflicting policies
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins and moderators can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can view profiles in their groups" ON public.profiles;
DROP POLICY IF EXISTS "Users can view profiles in their organization" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;

-- Create simple, working policies
-- 1. Users can view their own profile
CREATE POLICY "Users can view own profile" 
ON public.profiles 
FOR SELECT 
USING (auth.uid() = id);

-- 2. Admins and moderators can view all profiles
CREATE POLICY "Admins and moderators can view all profiles" 
ON public.profiles 
FOR SELECT 
USING (public.is_moderator(auth.uid()));

-- 3. Users can update their own profile
CREATE POLICY "Users can update own profile" 
ON public.profiles 
FOR UPDATE 
USING (auth.uid() = id);

-- 4. Users can insert their own profile
CREATE POLICY "Users can insert own profile" 
ON public.profiles 
FOR INSERT 
WITH CHECK (auth.uid() = id);

-- Verify the setup
SELECT 
    'Profiles policies fixed successfully' as status,
    COUNT(*) as total_users,
    COUNT(CASE WHEN role = 'admin' THEN 1 END) as admins,
    COUNT(CASE WHEN role = 'member' THEN 1 END) as members
FROM public.profiles;
