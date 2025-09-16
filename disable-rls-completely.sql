-- Disable RLS Completely
-- This is the simplest solution - just disable RLS on both tables

-- Disable RLS on both tables
ALTER TABLE organizations DISABLE ROW LEVEL SECURITY;
ALTER TABLE organization_members DISABLE ROW LEVEL SECURITY;

-- Test access
SELECT 'RLS disabled - testing access...' as status;
SELECT id, name, type FROM organizations;
SELECT user_id, organization_id, role FROM organization_members LIMIT 3;

-- Show current RLS status
SELECT 
    schemaname,
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables 
WHERE tablename IN ('organizations', 'organization_members')
AND schemaname = 'public';
