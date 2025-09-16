-- Multi-Tenant Architecture Migration
-- This migration creates the organization-based multi-tenant structure

-- 1. Create organizations table
CREATE TABLE IF NOT EXISTS organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('organization', 'individual')),
  created_by UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Create organization_members table for multi-tenant user management
CREATE TABLE IF NOT EXISTS organization_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'moderator', 'member')),
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  invited_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  UNIQUE(user_id, organization_id)
);

-- 3. Create moderator_licenses table to track moderator slots per organization
CREATE TABLE IF NOT EXISTS moderator_licenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
  total_slots INTEGER DEFAULT 2 NOT NULL,
  used_slots INTEGER DEFAULT 0 NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(organization_id)
);

-- 4. Add organization_id to existing tables
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;
ALTER TABLE groups ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;
ALTER TABLE ideas ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;
ALTER TABLE comments ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;
ALTER TABLE evaluations ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;
ALTER TABLE votes ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;
ALTER TABLE investor_interest ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;
ALTER TABLE meetings ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;
ALTER TABLE group_members ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;
ALTER TABLE meetup_feedback ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;
ALTER TABLE usage_tracking ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;

-- 5. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_organizations_created_by ON organizations(created_by);
CREATE INDEX IF NOT EXISTS idx_organization_members_user_id ON organization_members(user_id);
CREATE INDEX IF NOT EXISTS idx_organization_members_org_id ON organization_members(organization_id);
CREATE INDEX IF NOT EXISTS idx_organization_members_role ON organization_members(role);
CREATE INDEX IF NOT EXISTS idx_moderator_licenses_org_id ON moderator_licenses(organization_id);

-- 6. Create function to auto-create moderator license when organization is created
CREATE OR REPLACE FUNCTION create_moderator_license()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO moderator_licenses (organization_id, total_slots, used_slots)
  VALUES (NEW.id, 2, 0);
  RETURN NEW;
END;
$$ language 'plpgsql';

-- 7. Create trigger for auto-creating moderator license
DROP TRIGGER IF EXISTS trigger_create_moderator_license ON organizations;
CREATE TRIGGER trigger_create_moderator_license
  AFTER INSERT ON organizations
  FOR EACH ROW
  EXECUTE FUNCTION create_moderator_license();

-- 8. Create function to update moderator license usage
CREATE OR REPLACE FUNCTION update_moderator_license_usage()
RETURNS TRIGGER AS $$
DECLARE
  org_id UUID;
BEGIN
  -- Get organization_id from the member
  IF TG_OP = 'INSERT' THEN
    org_id := NEW.organization_id;
  ELSE
    org_id := OLD.organization_id;
  END IF;

  -- Update moderator license usage
  IF TG_OP = 'INSERT' AND NEW.role = 'moderator' THEN
    UPDATE moderator_licenses 
    SET used_slots = used_slots + 1, updated_at = NOW()
    WHERE organization_id = org_id;
  ELSIF TG_OP = 'UPDATE' THEN
    -- Handle role changes
    IF OLD.role = 'moderator' AND NEW.role != 'moderator' THEN
      UPDATE moderator_licenses 
      SET used_slots = used_slots - 1, updated_at = NOW()
      WHERE organization_id = org_id;
    ELSIF OLD.role != 'moderator' AND NEW.role = 'moderator' THEN
      UPDATE moderator_licenses 
      SET used_slots = used_slots + 1, updated_at = NOW()
      WHERE organization_id = org_id;
    END IF;
  ELSIF TG_OP = 'DELETE' AND OLD.role = 'moderator' THEN
    UPDATE moderator_licenses 
    SET used_slots = used_slots - 1, updated_at = NOW()
    WHERE organization_id = org_id;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$ language 'plpgsql';

-- 9. Create trigger for updating moderator license usage
DROP TRIGGER IF EXISTS trigger_update_moderator_license ON organization_members;
CREATE TRIGGER trigger_update_moderator_license
  AFTER INSERT OR UPDATE OR DELETE ON organization_members
  FOR EACH ROW
  EXECUTE FUNCTION update_moderator_license_usage();

-- 10. Enable Row Level Security (RLS)
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE moderator_licenses ENABLE ROW LEVEL SECURITY;

-- 11. Create RLS policies for organizations
DROP POLICY IF EXISTS "Users can view their organizations" ON organizations;
CREATE POLICY "Users can view their organizations" ON organizations
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM organization_members 
      WHERE organization_members.user_id = auth.uid() 
      AND organization_members.organization_id = organizations.id
    )
  );

DROP POLICY IF EXISTS "Users can create organizations" ON organizations;
CREATE POLICY "Users can create organizations" ON organizations
  FOR INSERT WITH CHECK (auth.uid() = created_by);

DROP POLICY IF EXISTS "Admins can update their organizations" ON organizations;
CREATE POLICY "Admins can update their organizations" ON organizations
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM organization_members 
      WHERE organization_members.user_id = auth.uid() 
      AND organization_members.organization_id = organizations.id
      AND organization_members.role = 'admin'
    )
  );

-- 12. Create RLS policies for organization_members
DROP POLICY IF EXISTS "Users can view organization members" ON organization_members;
CREATE POLICY "Users can view organization members" ON organization_members
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM organization_members om2
      WHERE om2.user_id = auth.uid() 
      AND om2.organization_id = organization_members.organization_id
    )
  );

DROP POLICY IF EXISTS "Admins can manage organization members" ON organization_members;
CREATE POLICY "Admins can manage organization members" ON organization_members
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM organization_members 
      WHERE organization_members.user_id = auth.uid() 
      AND organization_members.organization_id = organization_members.organization_id
      AND organization_members.role = 'admin'
    )
  );

-- 13. Create RLS policies for moderator_licenses
DROP POLICY IF EXISTS "Admins can view moderator licenses" ON moderator_licenses;
CREATE POLICY "Admins can view moderator licenses" ON moderator_licenses
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM organization_members 
      WHERE organization_members.user_id = auth.uid() 
      AND organization_members.organization_id = moderator_licenses.organization_id
      AND organization_members.role = 'admin'
    )
  );

-- 14. Create function to get user's organization role
CREATE OR REPLACE FUNCTION get_user_organization_role(user_uuid UUID, org_uuid UUID)
RETURNS TEXT AS $$
DECLARE
  user_role TEXT;
BEGIN
  SELECT role INTO user_role
  FROM organization_members
  WHERE user_id = user_uuid AND organization_id = org_uuid;
  
  RETURN COALESCE(user_role, 'none');
END;
$$ language 'plpgsql' SECURITY DEFINER;

-- 15. Create function to check if user is admin of organization
CREATE OR REPLACE FUNCTION is_organization_admin(user_uuid UUID, org_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM organization_members
    WHERE user_id = user_uuid 
    AND organization_id = org_uuid 
    AND role = 'admin'
  );
END;
$$ language 'plpgsql' SECURITY DEFINER;

-- 16. Create function to check if user is moderator of organization
CREATE OR REPLACE FUNCTION is_organization_moderator(user_uuid UUID, org_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM organization_members
    WHERE user_id = user_uuid 
    AND organization_id = org_uuid 
    AND role IN ('admin', 'moderator')
  );
END;
$$ language 'plpgsql' SECURITY DEFINER;

-- 17. Create function to get user's organizations
CREATE OR REPLACE FUNCTION get_user_organizations(user_uuid UUID)
RETURNS TABLE(
  organization_id UUID,
  organization_name TEXT,
  organization_type TEXT,
  user_role TEXT,
  joined_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    o.id,
    o.name,
    o.type,
    om.role,
    om.joined_at
  FROM organizations o
  JOIN organization_members om ON o.id = om.organization_id
  WHERE om.user_id = user_uuid
  ORDER BY om.joined_at DESC;
END;
$$ language 'plpgsql' SECURITY DEFINER;

-- 18. Create function to check moderator license availability
CREATE OR REPLACE FUNCTION can_assign_moderator(org_uuid UUID)
RETURNS BOOLEAN AS $$
DECLARE
  license_info RECORD;
BEGIN
  SELECT total_slots, used_slots INTO license_info
  FROM moderator_licenses
  WHERE organization_id = org_uuid;
  
  RETURN license_info.used_slots < license_info.total_slots;
END;
$$ language 'plpgsql' SECURITY DEFINER;

-- 19. Verify all tables and columns exist
SELECT 
  table_name,
  column_name, 
  data_type, 
  is_nullable 
FROM information_schema.columns 
WHERE table_name IN ('organizations', 'organization_members', 'moderator_licenses')
ORDER BY table_name, ordinal_position;
