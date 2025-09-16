-- Analyze User Structure, Organization, and Groups
-- This SQL will help us understand the current state before fixing ideas visibility

-- 1. Check if organizations table exists and its structure
SELECT 
  'ORGANIZATIONS TABLE' as analysis_type,
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'organizations') 
    THEN 'EXISTS' 
    ELSE 'DOES NOT EXIST' 
  END as status,
  'organizations' as table_name;

-- 2. Check if organization_members table exists and its structure
SELECT 
  'ORGANIZATION_MEMBERS TABLE' as analysis_type,
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'organization_members') 
    THEN 'EXISTS' 
    ELSE 'DOES NOT EXIST' 
  END as status,
  'organization_members' as table_name;

-- 3. Check if groups table exists and its structure
SELECT 
  'GROUPS TABLE' as analysis_type,
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'groups') 
    THEN 'EXISTS' 
    ELSE 'DOES NOT EXIST' 
  END as status,
  'groups' as table_name;

-- 4. Check if group_members table exists and its structure
SELECT 
  'GROUP_MEMBERS TABLE' as analysis_type,
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'group_members') 
    THEN 'EXISTS' 
    ELSE 'DOES NOT EXIST' 
  END as status,
  'group_members' as table_name;

-- 5. Show all users and their profiles
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

-- 6. Show organizations (if they exist)
SELECT 
  'ORGANIZATIONS' as analysis_type,
  o.id,
  o.name,
  o.type,
  o.created_at,
  'Organization exists' as status
FROM public.organizations o
ORDER BY o.created_at DESC;

-- 7. Show organization members (if they exist)
SELECT 
  'ORGANIZATION MEMBERS' as analysis_type,
  om.id,
  om.user_id,
  p.name as user_name,
  p.email as user_email,
  om.organization_id,
  o.name as organization_name,
  om.role as org_role,
  'Member exists' as status
FROM public.organization_members om
LEFT JOIN public.profiles p ON om.user_id = p.id
LEFT JOIN public.organizations o ON om.organization_id = o.id
ORDER BY om.id;

-- 8. Show groups (if they exist)
SELECT 
  'GROUPS' as analysis_type,
  g.id,
  g.name,
  g.description,
  g.created_by,
  p.name as created_by_name,
  g.invite_code,
  g.created_at,
  'Group exists' as status
FROM public.groups g
LEFT JOIN public.profiles p ON g.created_by = p.id
ORDER BY g.created_at DESC;

-- 9. Show group members (if they exist)
SELECT 
  'GROUP MEMBERS' as analysis_type,
  gm.id,
  gm.user_id,
  p.name as user_name,
  p.email as user_email,
  gm.group_id,
  g.name as group_name,
  gm.role as group_role,
  gm.joined_at,
  'Group member exists' as status
FROM public.group_members gm
LEFT JOIN public.profiles p ON gm.user_id = p.id
LEFT JOIN public.groups g ON gm.group_id = g.id
ORDER BY gm.joined_at DESC;

-- 10. Show ideas and their group assignments
SELECT 
  'IDEAS' as analysis_type,
  i.id,
  i.title,
  i.submitted_by,
  p.name as submitted_by_name,
  p.email as submitted_by_email,
  i.group_id,
  g.name as group_name,
  i.status,
  i.created_at,
  CASE 
    WHEN i.group_id IS NULL THEN 'No group assigned'
    ELSE 'Group assigned'
  END as status
FROM public.ideas i
LEFT JOIN public.profiles p ON i.submitted_by = p.id
LEFT JOIN public.groups g ON i.group_id = g.id
ORDER BY i.created_at DESC;

-- 11. Show current RLS policies on ideas table
SELECT 
  'IDEAS RLS POLICIES' as analysis_type,
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check,
  'Policy exists' as status
FROM pg_policies 
WHERE tablename = 'ideas'
ORDER BY policyname;

-- 12. Summary of user structure
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
