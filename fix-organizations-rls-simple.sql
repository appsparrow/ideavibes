-- Fix Organizations RLS Policies
-- This script creates simple, working RLS policies for the organizations table

-- 1. Drop ALL existing policies on organizations table
DROP POLICY IF EXISTS "Allow all authenticated users to read organizations" ON organizations;
DROP POLICY IF EXISTS "Allow authenticated users to read organizations" ON organizations;
DROP POLICY IF EXISTS "Admins can update organizations" ON organizations;
DROP POLICY IF EXISTS "Users can view organizations they belong to" ON organizations;
DROP POLICY IF EXISTS "Allow all authenticated users to read organizations" ON organizations;
DROP POLICY IF EXISTS "Allow authenticated users to read organizations" ON organizations;

-- 2. Create simple read policy for all authenticated users
CREATE POLICY "Allow authenticated users to read organizations" ON organizations
    FOR SELECT
    TO authenticated
    USING (true);

-- 3. Create update policy for admins only
CREATE POLICY "Allow admins to update organizations" ON organizations
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

-- 4. Enable RLS on organizations table
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;

-- 5. Test the policies
SELECT 'Testing organizations access...' as status;

-- This should work for all authenticated users
SELECT id, name, type FROM organizations LIMIT 1;
