-- DETAILED USER-ORGANIZATION-GROUP-IDEAS ANALYSIS
-- This will show all relationships and details, not just summaries

-- 1. DETAILED USER PROFILES WITH ALL INFO
SELECT 
  '=== USER PROFILES DETAILED ===' as section,
  p.id as user_id,
  p.name as user_name,
  p.email as user_email,
  p.role as user_role,
  p.investor_type,
  p.profile as user_profile,
  p.created_at as user_created_at,
  'User Profile' as record_type
FROM public.profiles p
ORDER BY p.created_at DESC;

-- 2. DETAILED ORGANIZATIONS (if exists)
SELECT 
  '=== ORGANIZATIONS DETAILED ===' as section,
  o.id as org_id,
  o.name as org_name,
  o.type as org_type,
  o.created_at as org_created_at,
  'Organization' as record_type
FROM public.organizations o
ORDER BY o.created_at DESC;

-- 3. DETAILED ORGANIZATION MEMBERS (if exists)
SELECT 
  '=== ORGANIZATION MEMBERS DETAILED ===' as section,
  om.id as org_member_id,
  om.user_id,
  p.name as user_name,
  p.email as user_email,
  p.role as user_role,
  om.organization_id,
  o.name as organization_name,
  o.type as organization_type,
  om.role as org_role,
  'Organization Member' as record_type
FROM public.organization_members om
LEFT JOIN public.profiles p ON om.user_id = p.id
LEFT JOIN public.organizations o ON om.organization_id = o.id
ORDER BY om.id;

-- 4. DETAILED GROUPS (if exists)
SELECT 
  '=== GROUPS DETAILED ===' as section,
  g.id as group_id,
  g.name as group_name,
  g.description as group_description,
  g.created_by as group_creator_id,
  p.name as group_creator_name,
  p.email as group_creator_email,
  p.role as group_creator_role,
  g.invite_code,
  g.created_at as group_created_at,
  'Group' as record_type
FROM public.groups g
LEFT JOIN public.profiles p ON g.created_by = p.id
ORDER BY g.created_at DESC;

-- 5. DETAILED GROUP MEMBERS (if exists)
SELECT 
  '=== GROUP MEMBERS DETAILED ===' as section,
  gm.id as group_member_id,
  gm.user_id,
  p.name as user_name,
  p.email as user_email,
  p.role as user_role,
  gm.group_id,
  g.name as group_name,
  g.description as group_description,
  gm.role as group_role,
  gm.joined_at,
  'Group Member' as record_type
FROM public.group_members gm
LEFT JOIN public.profiles p ON gm.user_id = p.id
LEFT JOIN public.groups g ON gm.group_id = g.id
ORDER BY gm.joined_at DESC;

-- 6. DETAILED IDEAS WITH ALL RELATIONSHIPS
SELECT 
  '=== IDEAS DETAILED ===' as section,
  i.id as idea_id,
  i.title as idea_title,
  i.description as idea_description,
  i.sector as idea_sector,
  i.status as idea_status,
  i.submitted_by as idea_author_id,
  p.name as idea_author_name,
  p.email as idea_author_email,
  p.role as idea_author_role,
  i.group_id,
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'groups') 
    THEN (SELECT g.name FROM public.groups g WHERE g.id = i.group_id)
    ELSE 'Groups table not found'
  END as group_name,
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'groups') 
    THEN (SELECT g.description FROM public.groups g WHERE g.id = i.group_id)
    ELSE 'Groups table not found'
  END as group_description,
  i.ai_summary,
  i.created_at as idea_created_at,
  i.updated_at as idea_updated_at,
  'Idea' as record_type
FROM public.ideas i
LEFT JOIN public.profiles p ON i.submitted_by = p.id
ORDER BY i.created_at DESC;

-- 7. USER-ORGANIZATION-GROUP RELATIONSHIP MATRIX
SELECT 
  '=== USER-ORG-GROUP RELATIONSHIP MATRIX ===' as section,
  p.id as user_id,
  p.name as user_name,
  p.email as user_email,
  p.role as user_role,
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'organization_members') 
    THEN (SELECT o.name FROM public.organizations o 
         JOIN public.organization_members om ON o.id = om.organization_id 
         WHERE om.user_id = p.id)
    ELSE 'No organization_members table'
  END as organization_name,
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'organization_members') 
    THEN (SELECT om.role FROM public.organization_members om WHERE om.user_id = p.id)
    ELSE 'No organization_members table'
  END as organization_role,
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'group_members') 
    THEN (SELECT STRING_AGG(g.name, ', ') FROM public.groups g 
         JOIN public.group_members gm ON g.id = gm.group_id 
         WHERE gm.user_id = p.id)
    ELSE 'No group_members table'
  END as group_names,
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'group_members') 
    THEN (SELECT STRING_AGG(gm.role, ', ') FROM public.group_members gm WHERE gm.user_id = p.id)
    ELSE 'No group_members table'
  END as group_roles,
  (SELECT COUNT(*) FROM public.ideas WHERE submitted_by = p.id) as ideas_submitted,
  'User Relationship' as record_type
FROM public.profiles p
ORDER BY p.created_at DESC;

-- 8. GROUP-IDEAS ANALYSIS
SELECT 
  '=== GROUP-IDEAS ANALYSIS ===' as section,
  g.id as group_id,
  g.name as group_name,
  g.description as group_description,
  (SELECT COUNT(*) FROM public.group_members gm WHERE gm.group_id = g.id) as total_members,
  (SELECT COUNT(*) FROM public.ideas i WHERE i.group_id = g.id) as total_ideas,
  (SELECT STRING_AGG(DISTINCT p.name, ', ') FROM public.group_members gm 
   JOIN public.profiles p ON gm.user_id = p.id WHERE gm.group_id = g.id) as member_names,
  (SELECT STRING_AGG(DISTINCT i.title, ', ') FROM public.ideas i WHERE i.group_id = g.id) as idea_titles,
  'Group Analysis' as record_type
FROM public.groups g
ORDER BY g.created_at DESC;

-- 9. IDEAS WITHOUT GROUPS
SELECT 
  '=== IDEAS WITHOUT GROUPS ===' as section,
  i.id as idea_id,
  i.title as idea_title,
  i.submitted_by as author_id,
  p.name as author_name,
  p.email as author_email,
  p.role as author_role,
  i.created_at,
  'Ungrouped Idea' as record_type
FROM public.ideas i
LEFT JOIN public.profiles p ON i.submitted_by = p.id
WHERE i.group_id IS NULL
ORDER BY i.created_at DESC;

-- 10. CURRENT RLS POLICIES DETAILED
SELECT 
  '=== RLS POLICIES DETAILED ===' as section,
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check,
  'RLS Policy' as record_type
FROM pg_policies 
WHERE tablename IN ('ideas', 'profiles', 'groups', 'group_members', 'organizations', 'organization_members')
ORDER BY tablename, policyname;

-- 11. COMPREHENSIVE SUMMARY
SELECT 
  '=== COMPREHENSIVE SUMMARY ===' as section,
  'TOTAL USERS' as metric,
  (SELECT COUNT(*) FROM public.profiles)::text as count,
  'Summary' as record_type
UNION ALL
SELECT 
  '=== COMPREHENSIVE SUMMARY ===' as section,
  'ADMIN USERS' as metric,
  (SELECT COUNT(*) FROM public.profiles WHERE role = 'admin')::text as count,
  'Summary' as record_type
UNION ALL
SELECT 
  '=== COMPREHENSIVE SUMMARY ===' as section,
  'MEMBER USERS' as metric,
  (SELECT COUNT(*) FROM public.profiles WHERE role = 'member')::text as count,
  'Summary' as record_type
UNION ALL
SELECT 
  '=== COMPREHENSIVE SUMMARY ===' as section,
  'MODERATOR USERS' as metric,
  (SELECT COUNT(*) FROM public.profiles WHERE role = 'moderator')::text as count,
  'Summary' as record_type
UNION ALL
SELECT 
  '=== COMPREHENSIVE SUMMARY ===' as section,
  'TOTAL IDEAS' as metric,
  (SELECT COUNT(*) FROM public.ideas)::text as count,
  'Summary' as record_type
UNION ALL
SELECT 
  '=== COMPREHENSIVE SUMMARY ===' as section,
  'IDEAS WITH GROUPS' as metric,
  (SELECT COUNT(*) FROM public.ideas WHERE group_id IS NOT NULL)::text as count,
  'Summary' as record_type
UNION ALL
SELECT 
  '=== COMPREHENSIVE SUMMARY ===' as section,
  'IDEAS WITHOUT GROUPS' as metric,
  (SELECT COUNT(*) FROM public.ideas WHERE group_id IS NULL)::text as count,
  'Summary' as record_type
UNION ALL
SELECT 
  '=== COMPREHENSIVE SUMMARY ===' as section,
  'TOTAL GROUPS' as metric,
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'groups') 
    THEN (SELECT COUNT(*) FROM public.groups)::text
    ELSE 'Groups table not found'
  END as count,
  'Summary' as record_type
UNION ALL
SELECT 
  '=== COMPREHENSIVE SUMMARY ===' as section,
  'TOTAL ORGANIZATIONS' as metric,
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'organizations') 
    THEN (SELECT COUNT(*) FROM public.organizations)::text
    ELSE 'Organizations table not found'
  END as count,
  'Summary' as record_type;
