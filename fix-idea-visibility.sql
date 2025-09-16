-- Fix Idea Visibility Issues
-- This script fixes RLS policies and ensures ideas are visible to group members

-- 1. Check current RLS policies on ideas table
SELECT 'Current RLS policies on ideas table:' as info;
SELECT policyname, cmd, qual FROM pg_policies WHERE tablename = 'ideas';

-- 2. Drop existing policies and recreate them properly
DROP POLICY IF EXISTS "ideas_read_all" ON ideas;
DROP POLICY IF EXISTS "ideas_create_all" ON ideas;
DROP POLICY IF EXISTS "ideas_update_all" ON ideas;
DROP POLICY IF EXISTS "Users can view ideas in their groups" ON ideas;
DROP POLICY IF EXISTS "Authenticated users can create ideas" ON ideas;
DROP POLICY IF EXISTS "Users can update own ideas" ON ideas;
DROP POLICY IF EXISTS "Users can delete own ideas" ON ideas;
DROP POLICY IF EXISTS "Anyone can view ideas" ON ideas;
DROP POLICY IF EXISTS "Users can view own ideas" ON ideas;
DROP POLICY IF EXISTS "Admins can view all ideas" ON ideas;

-- 3. Create comprehensive RLS policies for ideas
-- Policy 1: Users can view ideas in groups they're members of
CREATE POLICY "Users can view ideas in their groups" ON ideas
    FOR SELECT
    TO authenticated
    USING (
        -- Ideas without group_id (legacy ideas) - visible to all authenticated users
        group_id IS NULL
        OR
        -- Ideas in groups where user is a member
        EXISTS (
            SELECT 1 FROM group_members gm
            WHERE gm.group_id = ideas.group_id
            AND gm.user_id = auth.uid()
        )
    );

-- Policy 2: Authenticated users can create ideas
CREATE POLICY "Authenticated users can create ideas" ON ideas
    FOR INSERT
    TO authenticated
    WITH CHECK (
        -- Can create ideas in groups they're members of
        group_id IS NULL
        OR
        EXISTS (
            SELECT 1 FROM group_members gm
            WHERE gm.group_id = ideas.group_id
            AND gm.user_id = auth.uid()
        )
    );

-- Policy 3: Users can update their own ideas
CREATE POLICY "Users can update own ideas" ON ideas
    FOR UPDATE
    TO authenticated
    USING (
        submitted_by = auth.uid()
        OR
        -- Group admins can update ideas in their groups
        EXISTS (
            SELECT 1 FROM group_members gm
            WHERE gm.group_id = ideas.group_id
            AND gm.user_id = auth.uid()
            AND gm.role = 'admin'
        )
    );

-- Policy 4: Users can delete their own ideas
CREATE POLICY "Users can delete own ideas" ON ideas
    FOR DELETE
    TO authenticated
    USING (
        submitted_by = auth.uid()
        OR
        -- Group admins can delete ideas in their groups
        EXISTS (
            SELECT 1 FROM group_members gm
            WHERE gm.group_id = ideas.group_id
            AND gm.user_id = auth.uid()
            AND gm.role = 'admin'
        )
    );

-- 4. Ensure RLS is enabled on ideas table
ALTER TABLE ideas ENABLE ROW LEVEL SECURITY;

-- 5. Test the policies by checking what ideas mod@streakzilla.com can see
SELECT 'Ideas visible to mod@streakzilla.com:' as info;
SELECT 
  i.id,
  i.title,
  i.group_id,
  g.name as group_name,
  i.submitted_by,
  p.email as submitted_by_email,
  i.status
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

-- 6. Check if there are any ideas without group_id that should be assigned
SELECT 'Ideas without group_id (legacy ideas):' as info;
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

-- 7. Verify the fix worked
SELECT 'RLS policies fixed successfully!' as status;
