-- Setup BeyondIt Organization
-- This script creates the BeyondIt organization and assigns all existing users to it

-- First, let's check if the organizations table exists and create it if needed
CREATE TABLE IF NOT EXISTS organizations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('organization', 'individual')),
    created_by UUID NOT NULL REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create organization_members table if it doesn't exist
CREATE TABLE IF NOT EXISTS organization_members (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id),
    organization_id UUID NOT NULL REFERENCES organizations(id),
    role TEXT NOT NULL CHECK (role IN ('admin', 'moderator', 'member')),
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    invited_by UUID REFERENCES auth.users(id)
);

-- Add organization_id column to profiles table if it doesn't exist
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id);

-- Create the BeyondIt organization
INSERT INTO organizations (id, name, type, created_by)
VALUES (
    '00000000-0000-0000-0000-000000000001', -- Fixed UUID for BeyondIt
    'BeyondIt',
    'organization',
    (SELECT id FROM auth.users LIMIT 1) -- Use first user as creator
)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    type = EXCLUDED.type,
    updated_at = NOW();

-- Assign all existing users to BeyondIt organization
-- First, add them to organization_members table
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
WHERE p.id NOT IN (
    SELECT user_id FROM organization_members 
    WHERE organization_id = '00000000-0000-0000-0000-000000000001'
)
ON CONFLICT (user_id, organization_id) DO NOTHING;

-- Update profiles table to reference BeyondIt organization
UPDATE profiles 
SET organization_id = '00000000-0000-0000-0000-000000000001'
WHERE organization_id IS NULL;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_organization_members_user_id ON organization_members(user_id);
CREATE INDEX IF NOT EXISTS idx_organization_members_organization_id ON organization_members(organization_id);
CREATE INDEX IF NOT EXISTS idx_profiles_organization_id ON profiles(organization_id);

-- Create RLS policies for organizations table
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view organizations they are members of
CREATE POLICY "Users can view organizations they belong to" ON organizations
    FOR SELECT USING (
        id IN (
            SELECT organization_id FROM organization_members 
            WHERE user_id = auth.uid()
        )
    );

-- Policy: Only admins can create organizations
CREATE POLICY "Only admins can create organizations" ON organizations
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Create RLS policies for organization_members table
ALTER TABLE organization_members ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view organization memberships for organizations they belong to
CREATE POLICY "Users can view organization memberships" ON organization_members
    FOR SELECT USING (
        organization_id IN (
            SELECT organization_id FROM organization_members 
            WHERE user_id = auth.uid()
        )
    );

-- Policy: Only organization admins can add members
CREATE POLICY "Organization admins can add members" ON organization_members
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM organization_members 
            WHERE user_id = auth.uid() 
            AND organization_id = organization_members.organization_id 
            AND role = 'admin'
        )
    );

-- Grant necessary permissions
GRANT SELECT ON organizations TO authenticated;
GRANT SELECT ON organization_members TO authenticated;
GRANT INSERT ON organization_members TO authenticated;

-- Create a view for easy access to user organization information
CREATE OR REPLACE VIEW user_organizations AS
SELECT 
    om.user_id,
    o.id as organization_id,
    o.name as organization_name,
    o.type as organization_type,
    om.role as user_role,
    om.joined_at
FROM organization_members om
JOIN organizations o ON om.organization_id = o.id;

-- Grant access to the view
GRANT SELECT ON user_organizations TO authenticated;

-- Add a function to get user's primary organization
CREATE OR REPLACE FUNCTION get_user_primary_organization(user_uuid UUID)
RETURNS TABLE (
    organization_id UUID,
    organization_name TEXT,
    organization_type TEXT,
    user_role TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        o.id,
        o.name,
        o.type,
        om.role
    FROM organization_members om
    JOIN organizations o ON om.organization_id = o.id
    WHERE om.user_id = user_uuid
    ORDER BY om.joined_at ASC
    LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission on the function
GRANT EXECUTE ON FUNCTION get_user_primary_organization(UUID) TO authenticated;
