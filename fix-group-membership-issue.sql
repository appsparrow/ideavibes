-- Fix Group Membership Issue
-- This script fixes the group membership problem where mod is in wrong group

-- 1. First, let's see what we're working with
SELECT '=== BEFORE FIX ===' as section;
SELECT 
  gm.group_id,
  g.name as group_name,
  p.email as user_email,
  gm.role as group_role
FROM group_members gm
JOIN groups g ON gm.group_id = g.id
JOIN profiles p ON gm.user_id = p.id
WHERE p.email IN ('mod@streakzilla.com', 'siva@streakzilla.com')
ORDER BY p.email, g.name;

-- 2. Find the correct "Beyond IT" group
WITH beyond_groups AS (
  SELECT 
    id,
    name,
    created_at,
    ROW_NUMBER() OVER (ORDER BY created_at) as rn
  FROM groups
  WHERE LOWER(name) LIKE '%beyond%'
)
SELECT 
  'Correct Beyond IT group:' as info,
  id,
  name,
  created_at
FROM beyond_groups
WHERE rn = 1;

-- 3. Fix mod@streakzilla.com's group membership
-- First, remove mod from any incorrect groups
DELETE FROM group_members 
WHERE user_id = (SELECT id FROM profiles WHERE email = 'mod@streakzilla.com')
AND group_id NOT IN (
  SELECT id FROM groups WHERE LOWER(name) LIKE '%beyond%' ORDER BY created_at LIMIT 1
);

-- 4. Ensure mod is in the correct "Beyond IT" group
WITH correct_group AS (
  SELECT id FROM groups 
  WHERE LOWER(name) LIKE '%beyond%' 
  ORDER BY created_at 
  LIMIT 1
),
mod_user AS (
  SELECT id FROM profiles WHERE email = 'mod@streakzilla.com'
)
INSERT INTO group_members (group_id, user_id, role, joined_at)
SELECT 
  cg.id,
  mu.id,
  'member',
  NOW()
FROM correct_group cg, mod_user mu
WHERE NOT EXISTS (
  SELECT 1 FROM group_members gm
  WHERE gm.group_id = cg.id 
  AND gm.user_id = mu.id
);

-- 5. Ensure admin is also in the correct group
WITH correct_group AS (
  SELECT id FROM groups 
  WHERE LOWER(name) LIKE '%beyond%' 
  ORDER BY created_at 
  LIMIT 1
),
admin_user AS (
  SELECT id FROM profiles WHERE email = 'siva@streakzilla.com'
)
INSERT INTO group_members (group_id, user_id, role, joined_at)
SELECT 
  cg.id,
  au.id,
  'admin',
  NOW()
FROM correct_group cg, admin_user au
WHERE NOT EXISTS (
  SELECT 1 FROM group_members gm
  WHERE gm.group_id = cg.id 
  AND gm.user_id = au.id
);

-- 6. Clean up any orphaned group memberships
DELETE FROM group_members 
WHERE group_id NOT IN (SELECT id FROM groups);

-- 7. Remove any duplicate groups (keep the oldest one)
WITH duplicate_groups AS (
  SELECT 
    name,
    id,
    created_at,
    ROW_NUMBER() OVER (PARTITION BY LOWER(name) ORDER BY created_at) as rn
  FROM groups
  WHERE LOWER(name) LIKE '%beyond%'
)
DELETE FROM groups 
WHERE id IN (
  SELECT id FROM duplicate_groups WHERE rn > 1
);

-- 8. Update any ideas that might be in the wrong group
WITH correct_group AS (
  SELECT id FROM groups 
  WHERE LOWER(name) LIKE '%beyond%' 
  ORDER BY created_at 
  LIMIT 1
)
UPDATE ideas 
SET group_id = (SELECT id FROM correct_group)
WHERE group_id IN (
  SELECT id FROM groups 
  WHERE LOWER(name) LIKE '%beyond%' 
  AND id != (SELECT id FROM correct_group)
);

-- 9. Show the results after fix
SELECT '=== AFTER FIX ===' as section;
SELECT 
  gm.group_id,
  g.name as group_name,
  p.email as user_email,
  gm.role as group_role,
  gm.joined_at
FROM group_members gm
JOIN groups g ON gm.group_id = g.id
JOIN profiles p ON gm.user_id = p.id
WHERE p.email IN ('mod@streakzilla.com', 'siva@streakzilla.com')
ORDER BY p.email, g.name;

-- 10. Verify the fix
SELECT '=== VERIFICATION ===' as section;
SELECT 
  'Groups with Beyond in name' as metric,
  COUNT(*)::text as value
FROM groups
WHERE LOWER(name) LIKE '%beyond%'
UNION ALL
SELECT 
  'Mod group memberships' as metric,
  COUNT(*)::text as value
FROM group_members gm
JOIN profiles p ON gm.user_id = p.id
WHERE p.email = 'mod@streakzilla.com'
UNION ALL
SELECT 
  'Admin group memberships' as metric,
  COUNT(*)::text as value
FROM group_members gm
JOIN profiles p ON gm.user_id = p.id
WHERE p.email = 'siva@streakzilla.com';

SELECT 'Group membership issue fixed!' as status;
