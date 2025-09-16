-- Debug Group Membership Issue
-- Mod is showing as member of "BeyondITOne" but should be in "Beyond IT"

-- 1. Check all groups in the system
SELECT '=== ALL GROUPS ===' as section;
SELECT 
  id,
  name,
  description,
  created_by,
  created_at
FROM groups
ORDER BY created_at DESC;

-- 2. Check all group memberships
SELECT '=== ALL GROUP MEMBERSHIPS ===' as section;
SELECT 
  gm.id as membership_id,
  gm.group_id,
  g.name as group_name,
  gm.user_id,
  p.email as user_email,
  p.name as user_name,
  gm.role as group_role,
  gm.joined_at
FROM group_members gm
JOIN groups g ON gm.group_id = g.id
JOIN profiles p ON gm.user_id = p.id
ORDER BY g.name, gm.role DESC;

-- 3. Specifically check mod@streakzilla.com's group memberships
SELECT '=== MOD@STREAKZILLA.COM GROUP MEMBERSHIPS ===' as section;
SELECT 
  gm.id as membership_id,
  gm.group_id,
  g.name as group_name,
  gm.user_id,
  p.email as user_email,
  gm.role as group_role,
  gm.joined_at
FROM group_members gm
JOIN groups g ON gm.group_id = g.id
JOIN profiles p ON gm.user_id = p.id
WHERE p.email = 'mod@streakzilla.com'
ORDER BY gm.joined_at DESC;

-- 4. Check if there are any orphaned group memberships (group doesn't exist)
SELECT '=== ORPHANED GROUP MEMBERSHIPS ===' as section;
SELECT 
  gm.id as membership_id,
  gm.group_id,
  gm.user_id,
  p.email as user_email,
  gm.role as group_role,
  gm.joined_at
FROM group_members gm
LEFT JOIN groups g ON gm.group_id = g.id
JOIN profiles p ON gm.user_id = p.id
WHERE g.id IS NULL
ORDER BY gm.joined_at DESC;

-- 5. Check for groups with similar names
SELECT '=== GROUPS WITH SIMILAR NAMES ===' as section;
SELECT 
  id,
  name,
  description,
  created_at
FROM groups
WHERE LOWER(name) LIKE '%beyond%'
ORDER BY created_at DESC;

-- 6. Check what groups siva@streakzilla.com (admin) is in
SELECT '=== ADMIN GROUP MEMBERSHIPS ===' as section;
SELECT 
  gm.id as membership_id,
  gm.group_id,
  g.name as group_name,
  gm.user_id,
  p.email as user_email,
  gm.role as group_role,
  gm.joined_at
FROM group_members gm
JOIN groups g ON gm.group_id = g.id
JOIN profiles p ON gm.user_id = p.id
WHERE p.email = 'siva@streakzilla.com'
ORDER BY gm.joined_at DESC;

-- 7. Check for duplicate or inconsistent group names
SELECT '=== GROUP NAME ANALYSIS ===' as section;
SELECT 
  name,
  COUNT(*) as count,
  STRING_AGG(id::text, ', ') as group_ids,
  STRING_AGG(created_at::text, ', ') as created_dates
FROM groups
GROUP BY name
HAVING COUNT(*) > 1 OR name LIKE '%Beyond%'
ORDER BY name;

-- 8. Summary of the issue
SELECT '=== SUMMARY ===' as section;
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
  'Groups with "Beyond" in name' as metric,
  COUNT(*)::text as value
FROM groups
WHERE LOWER(name) LIKE '%beyond%'
UNION ALL
SELECT 
  'Orphaned memberships' as metric,
  COUNT(*)::text as value
FROM group_members gm
LEFT JOIN groups g ON gm.group_id = g.id
WHERE g.id IS NULL;
