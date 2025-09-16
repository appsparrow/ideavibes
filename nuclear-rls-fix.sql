-- Nuclear RLS Fix - Remove ALL policies and start fresh
-- This script completely removes all RLS policies and recreates them

-- 1. Disable RLS completely
ALTER TABLE organizations DISABLE ROW LEVEL SECURITY;
ALTER TABLE organization_members DISABLE ROW LEVEL SECURITY;

-- 2. Drop ALL existing policies (if any exist)
DO $$ 
DECLARE
    pol RECORD;
BEGIN
    -- Drop all policies on organizations table
    FOR pol IN 
        SELECT policyname FROM pg_policies 
        WHERE tablename = 'organizations' AND schemaname = 'public'
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(pol.policyname) || ' ON organizations';
    END LOOP;
    
    -- Drop all policies on organization_members table
    FOR pol IN 
        SELECT policyname FROM pg_policies 
        WHERE tablename = 'organization_members' AND schemaname = 'public'
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(pol.policyname) || ' ON organization_members';
    END LOOP;
END $$;

-- 3. Test access without RLS
SELECT 'Testing without RLS - organizations:' as status;
SELECT id, name, type FROM organizations;

SELECT 'Testing without RLS - organization_members:' as status;
SELECT user_id, organization_id, role FROM organization_members LIMIT 3;

-- 4. Re-enable RLS
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_members ENABLE ROW LEVEL SECURITY;

-- 5. Create simple policies with different names
CREATE POLICY "org_read_policy" ON organizations
    FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "org_update_policy" ON organizations
    FOR UPDATE
    TO authenticated
    USING (true)
    WITH CHECK (true);

CREATE POLICY "org_members_read_policy" ON organization_members
    FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "org_members_update_policy" ON organization_members
    FOR UPDATE
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- 6. Final test
SELECT 'Final test with new policies:' as status;
SELECT id, name, type FROM organizations;
SELECT user_id, organization_id, role FROM organization_members LIMIT 3;
