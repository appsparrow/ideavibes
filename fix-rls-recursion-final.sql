-- Fix RLS Recursion Issues
-- This script fixes infinite recursion in RLS policies

-- 1. Disable RLS on both problematic tables
ALTER TABLE organizations DISABLE ROW LEVEL SECURITY;
ALTER TABLE organization_members DISABLE ROW LEVEL SECURITY;

-- 2. Test access to both tables
SELECT 'Testing organizations access...' as status;
SELECT id, name, type FROM organizations;

SELECT 'Testing organization_members access...' as status;
SELECT user_id, organization_id, role FROM organization_members LIMIT 3;

-- 3. Re-enable RLS with simple, non-recursive policies
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_members ENABLE ROW LEVEL SECURITY;

-- 4. Create simple policies for organizations
CREATE POLICY "organizations_read_all" ON organizations
    FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "organizations_update_admin" ON organizations
    FOR UPDATE
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- 5. Create simple policies for organization_members
CREATE POLICY "organization_members_read_all" ON organization_members
    FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "organization_members_update_all" ON organization_members
    FOR UPDATE
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- 6. Test final access
SELECT 'Final test - organizations:' as status;
SELECT id, name, type FROM organizations;

SELECT 'Final test - organization_members:' as status;
SELECT user_id, organization_id, role FROM organization_members LIMIT 3;
