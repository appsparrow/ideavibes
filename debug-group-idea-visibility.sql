-- Debug Group and Idea Visibility Issues
-- This script helps diagnose why ideas aren't visible to group members

-- 1. Check all groups and their details
SELECT 
  '=== GROUPS ===' as section;
  
SELECT 
  g.id as group_id,
  g.name as group_name,
  g.description,
  g.invite_code,
  g.created_by,
  p.name as created_by_name,
  g.created_at
FROM groups g
LEFT JOIN profiles p ON g.created_by = p.id
ORDER BY g.created_at DESC;

-- 2. Check group memberships
SELECT 
  '=== GROUP MEMBERSHIPS ===' as section;
  
SELECT 
  gm.group_id,
  g.name as group_name,
  gm.user_id,
  p.email as user_email,
  p.name as user_name,
  p.role as user_role,
  gm.role as group_role,
  gm.joined_at
FROM group_members gm
JOIN groups g ON gm.group_id = g.id
JOIN profiles p ON gm.user_id = p.id
ORDER BY g.name, gm.role DESC;

-- 3. Check all ideas and their group associations
SELECT 
  '=== IDEAS ===' as section;
  
SELECT 
  i.id as idea_id,
  i.title,
  i.group_id,
  g.name as group_name,
  i.submitted_by,
  p.email as submitted_by_email,
  p.name as submitted_by_name,
  p.role as submitted_by_role,
  i.status,
  i.created_at
FROM ideas i
LEFT JOIN groups g ON i.group_id = g.id
LEFT JOIN profiles p ON i.submitted_by = p.id
ORDER BY i.created_at DESC;

-- 4. Check specific issue: Ideas in groups where mod@streakzilla.com is a member
SELECT 
  '=== IDEAS VISIBLE TO MOD@STREAKZILLA.COM ===' as section;
  
SELECT 
  i.id as idea_id,
  i.title,
  i.group_id,
  g.name as group_name,
  i.submitted_by,
  p.email as submitted_by_email,
  p.name as submitted_by_name,
  i.status,
  i.created_at
FROM ideas i
JOIN groups g ON i.group_id = g.id
JOIN group_members gm ON g.id = gm.group_id
JOIN profiles p ON i.submitted_by = p.id
WHERE gm.user_id = (SELECT id FROM profiles WHERE email = 'mod@streakzilla.com')
ORDER BY i.created_at DESC;

-- 5. Check if there are any RLS issues
SELECT 
  '=== RLS POLICIES CHECK ===' as section;
  
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename IN ('ideas', 'groups', 'group_members')
ORDER BY tablename, policyname;

-- 6. Check for any NULL group_id ideas (should be visible to all)
SELECT 
  '=== IDEAS WITHOUT GROUP (NULL group_id) ===' as section;
  
SELECT 
  i.id as idea_id,
  i.title,
  i.submitted_by,
  p.email as submitted_by_email,
  p.name as submitted_by_name,
  i.status,
  i.created_at
FROM ideas i
LEFT JOIN profiles p ON i.submitted_by = p.id
WHERE i.group_id IS NULL
ORDER BY i.created_at DESC;

-- 7. Summary of the issue
SELECT 
  '=== SUMMARY ===' as section;
  
SELECT 
  'Total Groups' as metric,
  COUNT(*)::text as value
FROM groups
UNION ALL
SELECT 
  'Total Group Members' as metric,
  COUNT(*)::text as value
FROM group_members
UNION ALL
SELECT 
  'Total Ideas' as metric,
  COUNT(*)::text as value
FROM ideas
UNION ALL
SELECT 
  'Ideas with Group' as metric,
  COUNT(*)::text as value
FROM ideas WHERE group_id IS NOT NULL
UNION ALL
SELECT 
  'Ideas without Group' as metric,
  COUNT(*)::text as value
FROM ideas WHERE group_id IS NULL;
