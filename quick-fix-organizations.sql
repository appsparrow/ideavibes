-- Quick Fix for Organizations Table Access
-- This script temporarily disables RLS to test organization access

-- 1. Disable RLS temporarily
ALTER TABLE organizations DISABLE ROW LEVEL SECURITY;

-- 2. Test access
SELECT 'RLS disabled - testing access...' as status;
SELECT id, name, type FROM organizations;

-- 3. Re-enable RLS with simple policy
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;

-- 4. Create simple policy that allows all authenticated users
CREATE POLICY "Simple organizations access" ON organizations
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- 5. Test again
SELECT 'RLS enabled with simple policy - testing access...' as status;
SELECT id, name, type FROM organizations;
