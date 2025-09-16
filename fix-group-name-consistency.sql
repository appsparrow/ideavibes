-- Fix Group Name Consistency Issues
-- This script ensures group names are consistent across the system

-- 1. Check current group names and their usage
SELECT 'Current group names:' as info;
SELECT 
  g.id,
  g.name,
  g.description,
  g.created_by,
  p.email as created_by_email,
  COUNT(gm.user_id) as member_count
FROM groups g       
LEFT JOIN profiles p ON g.created_by = p.id
LEFT JOIN group_members gm ON g.id = gm.group_id
GROUP BY g.id, g.name, g.description, g.created_by, p.email
ORDER BY g.created_at DESC;

-- 2. Check for duplicate or similar group names
SELECT 'Potential duplicate group names:' as info;
SELECT 
  name,
  COUNT(*) as count,
  STRING_AGG(id::text, ', ') as group_ids
FROM groups
GROUP BY name
HAVING COUNT(*) > 1;

-- 3. Check group names in different contexts
SELECT 'Group names in group_members:' as info;
SELECT DISTINCT
  g.name as group_name,
  COUNT(*) as member_count
FROM group_members gm
JOIN groups g ON gm.group_id = g.id
GROUP BY g.name
ORDER BY member_count DESC;

-- 4. Check if there are any groups with NULL or empty names
SELECT 'Groups with NULL or empty names:' as info;
SELECT 
  id,
  name,
  description,
  created_by
FROM groups
WHERE name IS NULL OR TRIM(name) = '';

-- 5. Standardize group names (if needed)
-- This will update any inconsistent group names
UPDATE groups 
SET name = TRIM(name)
WHERE name != TRIM(name);

-- 6. Check for the specific "Beyond IT" vs "BeyondIt" issue
SELECT 'Groups with "Beyond" in the name:' as info;
SELECT 
  id,
  name,
  description,
  created_at
FROM groups
WHERE LOWER(name) LIKE '%beyond%'
ORDER BY created_at;

-- 7. If there are multiple "Beyond" groups, consolidate them
-- First, let's see if we need to merge groups
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
  'Beyond groups found:' as info,
  id,
  name,
  created_at,
  CASE WHEN rn = 1 THEN 'KEEP' ELSE 'MERGE' END as action
FROM beyond_groups;

-- 8. Update any ideas that might have wrong group_id references
SELECT 'Ideas with group references:' as info;
SELECT 
  i.id as idea_id,
  i.title,
  i.group_id,
  g.name as group_name,
  i.submitted_by,
  p.email as submitted_by_email
FROM ideas i
LEFT JOIN groups g ON i.group_id = g.id
LEFT JOIN profiles p ON i.submitted_by = p.id
WHERE i.group_id IS NOT NULL
ORDER BY i.created_at DESC;

-- 9. Verify the fix
SELECT 'Group name consistency check completed!' as status;
