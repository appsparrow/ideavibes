-- Migrate Existing Users to Enhanced Registration System
-- This script updates existing users to work with the new registration flow

-- 1. Update existing profiles to have account_type
UPDATE profiles 
SET account_type = CASE 
    WHEN role = 'admin' THEN 'organization_admin'
    ELSE 'member'
END
WHERE account_type IS NULL;

-- 2. Ensure all users have organization_id set to BeyondIt
UPDATE profiles 
SET organization_id = '00000000-0000-0000-0000-000000000001'
WHERE organization_id IS NULL;

-- 3. Ensure BeyondIt organization has an invite code
UPDATE organizations 
SET invite_code = 'ORG-BEYONDIT'
WHERE id = '00000000-0000-0000-0000-000000000001' 
AND invite_code IS NULL;

-- 4. Ensure all existing users are in organization_members table
INSERT INTO organization_members (user_id, organization_id, role)
SELECT 
    p.id as user_id,
    '00000000-0000-0000-0000-000000000001' as organization_id,
    CASE 
        WHEN p.role = 'admin' THEN 'admin'
        WHEN p.role = 'moderator' THEN 'moderator'
        ELSE 'member'
    END as role
FROM profiles p
WHERE NOT EXISTS (
    SELECT 1 FROM organization_members om 
    WHERE om.user_id = p.id 
    AND om.organization_id = '00000000-0000-0000-0000-000000000001'
);

-- 5. Show migration results
SELECT 'Migration Results:' as info;
SELECT 
    account_type,
    COUNT(*) as user_count
FROM profiles 
GROUP BY account_type;

SELECT 'Organization Members:' as info;
SELECT 
    om.role,
    COUNT(*) as member_count
FROM organization_members om
WHERE om.organization_id = '00000000-0000-0000-0000-000000000001'
GROUP BY om.role;

SELECT 'Migration completed successfully!' as status;
