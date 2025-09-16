-- Ensure BeyondIt Organization Exists
-- This script ensures the BeyondIt organization is properly set up

-- 1. Create organizations table if it doesn't exist
CREATE TABLE IF NOT EXISTS organizations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('organization', 'individual')),
    created_by UUID NOT NULL REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Create organization_members table if it doesn't exist
CREATE TABLE IF NOT EXISTS organization_members (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id),
    organization_id UUID NOT NULL REFERENCES organizations(id),
    role TEXT NOT NULL CHECK (role IN ('admin', 'moderator', 'member')),
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    invited_by UUID REFERENCES auth.users(id)
);

-- 3. Insert or update BeyondIt organization with fixed UUID
INSERT INTO organizations (id, name, type, created_by, updated_at)
VALUES (
    '00000000-0000-0000-0000-000000000001',
    'BeyondIT',
    'organization',
    (SELECT id FROM auth.users LIMIT 1),
    NOW()
)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    type = EXCLUDED.type,
    updated_at = NOW();

-- 4. Ensure all users are members of BeyondIt organization
INSERT INTO organization_members (user_id, organization_id, role, joined_at)
SELECT 
    p.id as user_id,
    '00000000-0000-0000-0000-000000000001' as organization_id,
    CASE 
        WHEN p.role = 'admin' THEN 'admin'
        WHEN p.role = 'moderator' THEN 'moderator'
        ELSE 'member'
    END as role,
    NOW() as joined_at
FROM profiles p
WHERE NOT EXISTS (
    SELECT 1 FROM organization_members om 
    WHERE om.user_id = p.id 
    AND om.organization_id = '00000000-0000-0000-0000-000000000001'
);

-- 5. Show the results
SELECT 'Organizations:' as info;
SELECT * FROM organizations;

SELECT 'Organization Members:' as info;
SELECT 
    p.email,
    om.role,
    o.name as org_name
FROM organization_members om
JOIN profiles p ON om.user_id = p.id
JOIN organizations o ON om.organization_id = o.id;
