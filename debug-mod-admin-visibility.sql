-- Debug Mod vs Admin Idea Visibility
-- This script specifically checks why mod can't see admin's ideas in the same group

-- 1. Check the specific group and its members
SELECT '=== GROUP MEMBERSHIP CHECK ===' as section;

SELECT 
  g.id as group_id,
  g.name as group_name,
  gm.user_id,
  p.email as user_email,
  p.name as user_name,
  p.role as user_role,
  gm.role as group_role,
  gm.joined_at
FROM groups g
JOIN group_members gm ON g.id = gm.group_id
JOIN profiles p ON gm.user_id = p.id
WHERE p.email IN ('mod@streakzilla.com', 'siva@streakzilla.com')
ORDER BY g.name, gm.role DESC;

-- 2. Check all ideas in the shared group
SELECT '=== IDEAS IN SHARED GROUP ===' as section;

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
JOIN groups g ON i.group_id = g.id
JOIN profiles p ON i.submitted_by = p.id
WHERE g.id IN (
  SELECT DISTINCT gm.group_id 
  FROM group_members gm 
  JOIN profiles p ON gm.user_id = p.id 
  WHERE p.email IN ('mod@streakzilla.com', 'siva@streakzilla.com')
)
ORDER BY i.created_at DESC;

-- 3. Check what mod@streakzilla.com can actually see (RLS test)
SELECT '=== WHAT MOD CAN SEE (RLS TEST) ===' as section;

-- Simulate what the RLS policy would return for mod@streakzilla.com
SELECT 
  i.id as idea_id,
  i.title,
  i.group_id,
  g.name as group_name,
  i.submitted_by,
  p.email as submitted_by_email,
  i.status,
  i.created_at,
  CASE 
    WHEN i.group_id IS NULL THEN 'Legacy idea (no group)'
    WHEN EXISTS (
      SELECT 1 FROM group_members gm
      WHERE gm.group_id = i.group_id
      AND gm.user_id = (SELECT id FROM profiles WHERE email = 'mod@streakzilla.com')
    ) THEN 'Visible (group member)'
    ELSE 'NOT VISIBLE (not group member)'
  END as visibility_status
FROM ideas i
LEFT JOIN groups g ON i.group_id = g.id
LEFT JOIN profiles p ON i.submitted_by = p.id
WHERE (
  i.group_id IS NULL
  OR
  EXISTS (
    SELECT 1 FROM group_members gm
    WHERE gm.group_id = i.group_id
    AND gm.user_id = (SELECT id FROM profiles WHERE email = 'mod@streakzilla.com')
  )
)
ORDER BY i.created_at DESC;

-- 4. Check current RLS policies on ideas table
SELECT '=== CURRENT RLS POLICIES ===' as section;

SELECT 
  policyname,
  cmd,
  permissive,
  roles,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'ideas'
ORDER BY policyname;

-- 5. Check if there are any ideas without group_id
SELECT '=== IDEAS WITHOUT GROUP_ID ===' as section;

SELECT 
  i.id,
  i.title,
  i.submitted_by,
  p.email as submitted_by_email,
  i.created_at
FROM ideas i
LEFT JOIN profiles p ON i.submitted_by = p.id
WHERE i.group_id IS NULL
ORDER BY i.created_at DESC;

-- 6. Test the exact RLS condition for mod@streakzilla.com
SELECT '=== RLS CONDITION TEST ===' as section;

SELECT 
  'mod@streakzilla.com user_id' as test,
  id as user_id
FROM profiles 
WHERE email = 'mod@streakzilla.com'

UNION ALL

SELECT 
  'Ideas mod should see' as test,
  COUNT(*)::text as count
FROM ideas i
WHERE (
  i.group_id IS NULL
  OR
  EXISTS (
    SELECT 1 FROM group_members gm
    WHERE gm.group_id = i.group_id
    AND gm.user_id = (SELECT id FROM profiles WHERE email = 'mod@streakzilla.com')
  )
);

-- 7. Check group_members table for the specific group
SELECT '=== GROUP MEMBERS FOR SHARED GROUP ===' as section;

WITH shared_groups AS (
  SELECT DISTINCT gm.group_id
  FROM group_members gm 
  JOIN profiles p ON gm.user_id = p.id 
  WHERE p.email IN ('mod@streakzilla.com', 'siva@streakzilla.com')
)
SELECT 
  gm.group_id,
  g.name as group_name,
  gm.user_id,
  p.email as user_email,
  gm.role as group_role,
  gm.joined_at
FROM group_members gm
JOIN groups g ON gm.group_id = g.id
JOIN profiles p ON gm.user_id = p.id
WHERE gm.group_id IN (SELECT group_id FROM shared_groups)
ORDER BY g.name, gm.role DESC;
