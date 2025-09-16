-- Clean Database - Fresh Start
-- This script removes all data and resets the database to a clean state
-- WARNING: This will delete ALL data in the application

-- 1. Disable RLS temporarily for easier cleanup
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE organizations DISABLE ROW LEVEL SECURITY;
ALTER TABLE organization_members DISABLE ROW LEVEL SECURITY;
ALTER TABLE groups DISABLE ROW LEVEL SECURITY;
ALTER TABLE group_members DISABLE ROW LEVEL SECURITY;
ALTER TABLE ideas DISABLE ROW LEVEL SECURITY;
ALTER TABLE comments DISABLE ROW LEVEL SECURITY;
ALTER TABLE tasks DISABLE ROW LEVEL SECURITY;
ALTER TABLE meetings DISABLE ROW LEVEL SECURITY;
ALTER TABLE meeting_attendees DISABLE ROW LEVEL SECURITY;

-- 2. Delete all data from tables (in reverse dependency order)
DELETE FROM meeting_attendees;
DELETE FROM meetings;
DELETE FROM tasks;
DELETE FROM comments;
DELETE FROM ideas;
DELETE FROM group_members;
DELETE FROM groups;
DELETE FROM organization_members;
DELETE FROM organizations;
DELETE FROM profiles;

-- 3. Reset sequences (if any exist)
-- Note: Supabase handles UUID generation, but reset any auto-increment sequences
-- ALTER SEQUENCE IF EXISTS profiles_id_seq RESTART WITH 1;

-- 4. Re-enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE ideas ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE meetings ENABLE ROW LEVEL SECURITY;
ALTER TABLE meeting_attendees ENABLE ROW LEVEL SECURITY;

-- 5. Recreate basic RLS policies for clean start
-- Profiles policies
DROP POLICY IF EXISTS "Users can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;

CREATE POLICY "Users can view all profiles" ON profiles
    FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Users can update own profile" ON profiles
    FOR UPDATE
    TO authenticated
    USING (auth.uid() = id);

-- Organizations policies
DROP POLICY IF EXISTS "organizations_read_all" ON organizations;
DROP POLICY IF EXISTS "organizations_update_admin" ON organizations;

CREATE POLICY "organizations_read_all" ON organizations
    FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "organizations_update_admin" ON organizations
    FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM organization_members om
            WHERE om.user_id = auth.uid()
            AND om.organization_id = organizations.id
            AND om.role = 'admin'
        )
    );

-- Organization members policies
DROP POLICY IF EXISTS "organization_members_read_all" ON organization_members;
DROP POLICY IF EXISTS "organization_members_update_all" ON organization_members;

CREATE POLICY "organization_members_read_all" ON organization_members
    FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "organization_members_update_all" ON organization_members
    FOR UPDATE
    TO authenticated
    USING (true);

-- Groups policies
DROP POLICY IF EXISTS "groups_read_all" ON groups;
DROP POLICY IF EXISTS "groups_create_all" ON groups;
DROP POLICY IF EXISTS "groups_update_all" ON groups;

CREATE POLICY "groups_read_all" ON groups
    FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "groups_create_all" ON groups
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

CREATE POLICY "groups_update_all" ON groups
    FOR UPDATE
    TO authenticated
    USING (true);

-- Group members policies
DROP POLICY IF EXISTS "group_members_read_all" ON group_members;
DROP POLICY IF EXISTS "group_members_create_all" ON group_members;
DROP POLICY IF EXISTS "group_members_update_all" ON group_members;

CREATE POLICY "group_members_read_all" ON group_members
    FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "group_members_create_all" ON group_members
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

CREATE POLICY "group_members_update_all" ON group_members
    FOR UPDATE
    TO authenticated
    USING (true);

-- Ideas policies
DROP POLICY IF EXISTS "ideas_read_all" ON ideas;
DROP POLICY IF EXISTS "ideas_create_all" ON ideas;
DROP POLICY IF EXISTS "ideas_update_all" ON ideas;

CREATE POLICY "ideas_read_all" ON ideas
    FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "ideas_create_all" ON ideas
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

CREATE POLICY "ideas_update_all" ON ideas
    FOR UPDATE
    TO authenticated
    USING (true);

-- Comments policies
DROP POLICY IF EXISTS "comments_read_all" ON comments;
DROP POLICY IF EXISTS "comments_create_all" ON comments;
DROP POLICY IF EXISTS "comments_update_all" ON comments;

CREATE POLICY "comments_read_all" ON comments
    FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "comments_create_all" ON comments
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

CREATE POLICY "comments_update_all" ON comments
    FOR UPDATE
    TO authenticated
    USING (true);

-- Tasks policies
DROP POLICY IF EXISTS "tasks_read_all" ON tasks;
DROP POLICY IF EXISTS "tasks_create_all" ON tasks;
DROP POLICY IF EXISTS "tasks_update_all" ON tasks;

CREATE POLICY "tasks_read_all" ON tasks
    FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "tasks_create_all" ON tasks
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

CREATE POLICY "tasks_update_all" ON tasks
    FOR UPDATE
    TO authenticated
    USING (true);

-- Meetings policies
DROP POLICY IF EXISTS "meetings_read_all" ON meetings;
DROP POLICY IF EXISTS "meetings_create_all" ON meetings;
DROP POLICY IF EXISTS "meetings_update_all" ON meetings;

CREATE POLICY "meetings_read_all" ON meetings
    FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "meetings_create_all" ON meetings
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

CREATE POLICY "meetings_update_all" ON meetings
    FOR UPDATE
    TO authenticated
    USING (true);

-- Meeting attendees policies
DROP POLICY IF EXISTS "meeting_attendees_read_all" ON meeting_attendees;
DROP POLICY IF EXISTS "meeting_attendees_create_all" ON meeting_attendees;
DROP POLICY IF EXISTS "meeting_attendees_update_all" ON meeting_attendees;

CREATE POLICY "meeting_attendees_read_all" ON meeting_attendees
    FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "meeting_attendees_create_all" ON meeting_attendees
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

CREATE POLICY "meeting_attendees_update_all" ON meeting_attendees
    FOR UPDATE
    TO authenticated
    USING (true);

-- 6. Verify clean state
SELECT 'Database cleaned successfully!' as status;

-- Show table counts (should all be 0)
SELECT 
    'profiles' as table_name, COUNT(*) as row_count FROM profiles
UNION ALL
SELECT 
    'organizations' as table_name, COUNT(*) as row_count FROM organizations
UNION ALL
SELECT 
    'organization_members' as table_name, COUNT(*) as row_count FROM organization_members
UNION ALL
SELECT 
    'groups' as table_name, COUNT(*) as row_count FROM groups
UNION ALL
SELECT 
    'group_members' as table_name, COUNT(*) as row_count FROM group_members
UNION ALL
SELECT 
    'ideas' as table_name, COUNT(*) as row_count FROM ideas
UNION ALL
SELECT 
    'comments' as table_name, COUNT(*) as row_count FROM comments
UNION ALL
SELECT 
    'tasks' as table_name, COUNT(*) as row_count FROM tasks
UNION ALL
SELECT 
    'meetings' as table_name, COUNT(*) as row_count FROM meetings
UNION ALL
SELECT 
    'meeting_attendees' as table_name, COUNT(*) as row_count FROM meeting_attendees;
