-- Enhanced Registration Flow Migration
-- This script sets up the database for the new registration flow

-- 1. Update profiles table to support independent users
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS account_type TEXT CHECK (account_type IN ('individual', 'organization_admin', 'member'));
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL;

-- 2. Update organizations table to support individual organizations
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS invite_code TEXT UNIQUE;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- 3. Create function to generate organization invite codes
CREATE OR REPLACE FUNCTION generate_org_invite_code()
RETURNS TEXT AS $$
BEGIN
  RETURN 'ORG-' || upper(substring(md5(random()::text) from 1 for 8));
END;
$$ LANGUAGE plpgsql;

-- 4. Create function to handle new user registration
CREATE OR REPLACE FUNCTION handle_enhanced_user_registration()
RETURNS TRIGGER AS $$
DECLARE
  user_account_type TEXT;
  user_first_name TEXT;
  user_last_name TEXT;
BEGIN
  -- Extract account type from metadata
  user_account_type := COALESCE(NEW.raw_user_meta_data->>'account_type', 'individual');
  user_first_name := COALESCE(NEW.raw_user_meta_data->>'first_name', '');
  user_last_name := COALESCE(NEW.raw_user_meta_data->>'last_name', '');
  
  -- Create profile
  INSERT INTO public.profiles (
    id, 
    email, 
    name,
    first_name,
    last_name,
    account_type,
    role
  ) VALUES (
    NEW.id,
    NEW.email,
    COALESCE(TRIM(user_first_name || ' ' || user_last_name), NEW.email),
    user_first_name,
    user_last_name,
    user_account_type,
    CASE 
      WHEN user_account_type = 'organization_admin' THEN 'admin'
      ELSE 'member'
    END
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 5. Drop old trigger and create new one
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_enhanced_user_registration();

-- 6. Create function to create organization with invite code
CREATE OR REPLACE FUNCTION create_organization_with_invite(
  org_name TEXT,
  org_type TEXT,
  created_by_uuid UUID
)
RETURNS UUID AS $$
DECLARE
  org_id UUID;
  invite_code TEXT;
BEGIN
  -- Generate unique invite code
  LOOP
    invite_code := generate_org_invite_code();
    EXIT WHEN NOT EXISTS (SELECT 1 FROM organizations WHERE invite_code = invite_code);
  END LOOP;
  
  -- Create organization
  INSERT INTO organizations (name, type, created_by, invite_code)
  VALUES (org_name, org_type, created_by_uuid, invite_code)
  RETURNING id INTO org_id;
  
  -- Add creator as admin
  INSERT INTO organization_members (user_id, organization_id, role)
  VALUES (created_by_uuid, org_id, 'admin');
  
  -- Update user's organization_id
  UPDATE profiles 
  SET organization_id = org_id
  WHERE id = created_by_uuid;
  
  RETURN org_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 7. Create function to join organization by invite code
CREATE OR REPLACE FUNCTION join_organization_by_invite(
  user_uuid UUID,
  invite_code_param TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
  org_id UUID;
BEGIN
  -- Find organization by invite code
  SELECT id INTO org_id
  FROM organizations
  WHERE invite_code = invite_code_param AND is_active = true;
  
  IF org_id IS NULL THEN
    RETURN false;
  END IF;
  
  -- Add user as member
  INSERT INTO organization_members (user_id, organization_id, role)
  VALUES (user_uuid, org_id, 'member')
  ON CONFLICT (user_id, organization_id) DO NOTHING;
  
  -- Update user's organization_id
  UPDATE profiles 
  SET organization_id = org_id
  WHERE id = user_uuid;
  
  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 8. Update RLS policies to handle independent users
-- Drop existing policies
DROP POLICY IF EXISTS "Users can view profiles in their organization" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;

-- Create new policies
CREATE POLICY "Users can view all profiles" ON profiles
    FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Users can update own profile" ON profiles
    FOR UPDATE
    TO authenticated
    USING (auth.uid() = id);

-- 9. Update organizations RLS policies
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

-- 10. Update organization_members RLS policies
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

-- 11. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_profiles_account_type ON profiles(account_type);
CREATE INDEX IF NOT EXISTS idx_profiles_organization_id ON profiles(organization_id);
CREATE INDEX IF NOT EXISTS idx_organizations_invite_code ON organizations(invite_code);
CREATE INDEX IF NOT EXISTS idx_organization_members_user_id ON organization_members(user_id);

-- 12. Test the setup
SELECT 'Enhanced registration migration completed successfully!' as status;
