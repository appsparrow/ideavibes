-- Simple User Structure Analysis
-- This version handles missing tables gracefully

-- 1. Check what tables exist
SELECT 
  'TABLE CHECK' as analysis_type,
  table_name,
  'EXISTS' as status
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('profiles', 'organizations', 'organization_members', 'groups', 'group_members', 'ideas')
ORDER BY table_name;

-- 2. Show all users and their profiles
SELECT 
  'USER PROFILES' as analysis_type,
  p.id,
  p.name,
  p.email,
  p.role,
  p.created_at,
  'Profile exists' as status
FROM public.profiles p
ORDER BY p.created_at DESC;

-- 3. Show ideas and their group assignments (if groups table exists)
SELECT 
  'IDEAS' as analysis_type,
  i.id,
  i.title,
  i.submitted_by,
  p.name as submitted_by_name,
  p.email as submitted_by_email,
  i.group_id,
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'groups') 
    THEN (SELECT g.name FROM public.groups g WHERE g.id = i.group_id)
    ELSE 'Groups table not found'
  END as group_name,
  i.status,
  i.created_at,
  CASE 
    WHEN i.group_id IS NULL THEN 'No group assigned'
    ELSE 'Group assigned'
  END as status
FROM public.ideas i
LEFT JOIN public.profiles p ON i.submitted_by = p.id
ORDER BY i.created_at DESC;

-- 4. Show current RLS policies on ideas table
SELECT 
  'IDEAS RLS POLICIES' as analysis_type,
  policyname,
  cmd,
  qual,
  'Policy exists' as status
FROM pg_policies 
WHERE tablename = 'ideas'
ORDER BY policyname;

-- 5. Summary of user structure
SELECT 
  'SUMMARY' as analysis_type,
  (SELECT COUNT(*) FROM public.profiles) as total_users,
  (SELECT COUNT(*) FROM public.profiles WHERE role = 'admin') as admin_count,
  (SELECT COUNT(*) FROM public.profiles WHERE role = 'member') as member_count,
  (SELECT COUNT(*) FROM public.profiles WHERE role = 'moderator') as moderator_count,
  (SELECT COUNT(*) FROM public.ideas) as total_ideas,
  (SELECT COUNT(*) FROM public.ideas WHERE group_id IS NULL) as ideas_without_group,
  (SELECT COUNT(*) FROM public.ideas WHERE group_id IS NOT NULL) as ideas_with_group,
  'Summary complete' as status;

-- 6. Check if organizations exist and show them (if they do)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'organizations') THEN
    RAISE NOTICE 'Organizations table exists - showing organizations:';
  ELSE
    RAISE NOTICE 'Organizations table does not exist';
  END IF;
END $$;

-- 7. Check if groups exist and show them (if they do)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'groups') THEN
    RAISE NOTICE 'Groups table exists - showing groups:';
  ELSE
    RAISE NOTICE 'Groups table does not exist';
  END IF;
END $$;
