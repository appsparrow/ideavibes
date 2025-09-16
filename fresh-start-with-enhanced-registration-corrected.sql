-- Fresh Start with Enhanced Registration Setup (Corrected)
-- This script cleans the database and sets up the enhanced registration system

-- 1. Clean Database First
-- Disable RLS temporarily for easier cleanup
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE organizations DISABLE ROW LEVEL SECURITY;
ALTER TABLE organization_members DISABLE ROW LEVEL SECURITY;
ALTER TABLE groups DISABLE ROW LEVEL SECURITY;
ALTER TABLE group_members DISABLE ROW LEVEL SECURITY;
ALTER TABLE ideas DISABLE ROW LEVEL SECURITY;
ALTER TABLE comments DISABLE ROW LEVEL SECURITY;
ALTER TABLE tasks DISABLE ROW LEVEL SECURITY;
ALTER TABLE meetings DISABLE ROW LEVEL SECURITY;
ALTER TABLE meeting_notes DISABLE ROW LEVEL SECURITY;
ALTER TABLE documents DISABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_transitions DISABLE ROW LEVEL SECURITY;
ALTER TABLE user_activities DISABLE ROW LEVEL SECURITY;
ALTER TABLE evaluations DISABLE ROW LEVEL SECURITY;
ALTER TABLE votes DISABLE ROW LEVEL SECURITY;
ALTER TABLE investor_interest DISABLE ROW LEVEL SECURITY;

-- Delete all data from tables (in reverse dependency order)
DELETE FROM user_activities;
DELETE FROM workflow_transitions;
DELETE FROM documents;
DELETE FROM meeting_notes;
DELETE FROM meetings;
DELETE FROM tasks;
DELETE FROM investor_interest;
DELETE FROM votes;
DELETE FROM evaluations;
DELETE FROM comments;
DELETE FROM ideas;
DELETE FROM group_members;
DELETE FROM groups;
DELETE FROM organization_members;
DELETE FROM organizations;
DELETE FROM profiles;

-- 2. Enhanced Registration Setup
-- Update profiles table to support independent users
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS account_type TEXT CHECK (account_type IN ('individual', 'organization_admin', 'member'));
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL;

-- Update organizations table to support individual organizations
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS invite_code TEXT UNIQUE;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- Create function to generate organization invite codes
CREATE OR REPLACE FUNCTION generate_org_invite_code()
RETURNS TEXT AS $$
BEGIN
  RETURN 'ORG-' || upper(substring(md5(random()::text) from 1 for 8));
END;
$$ LANGUAGE plpgsql;

-- Create function to handle new user registration
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

-- Drop old trigger and create new one
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_enhanced_user_registration();

-- Create function to create organization with invite code
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

-- Create function to join organization by invite code
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

-- 3. Re-enable RLS with Enhanced Policies
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE ideas ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE meetings ENABLE ROW LEVEL SECURITY;
ALTER TABLE meeting_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_transitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE evaluations ENABLE ROW LEVEL SECURITY;
ALTER TABLE votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE investor_interest ENABLE ROW LEVEL SECURITY;

-- Create comprehensive RLS policies
-- Profiles policies
DROP POLICY IF EXISTS "Users can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;

CREATE POLICY "Users can view all profiles" ON profiles
    FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Users can update own profile" ON profiles
    FOR UPDATE
    TO authenticated
    USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON profiles
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = id);

-- Organizations policies
DROP POLICY IF EXISTS "organizations_read_all" ON organizations;
DROP POLICY IF EXISTS "organizations_update_admin" ON organizations;
DROP POLICY IF EXISTS "organizations_create_all" ON organizations;

CREATE POLICY "organizations_read_all" ON organizations
    FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "organizations_create_all" ON organizations
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

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

-- Organization members policies
DROP POLICY IF EXISTS "organization_members_read_all" ON organization_members;
DROP POLICY IF EXISTS "organization_members_update_all" ON organization_members;
DROP POLICY IF EXISTS "organization_members_create_all" ON organization_members;

CREATE POLICY "organization_members_read_all" ON organization_members
    FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "organization_members_create_all" ON organization_members
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

CREATE POLICY "organization_members_update_all" ON organization_members
    FOR UPDATE
    TO authenticated
    USING (true);

-- Groups policies
DROP POLICY IF EXISTS "groups_read_all" ON groups;
DROP POLICY IF EXISTS "groups_create_all" ON groups;
DROP POLICY IF EXISTS "groups_update_all" ON groups;

CREATE POLICY "groups_read_all" ON groups
    FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "groups_create_all" ON groups
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

CREATE POLICY "groups_update_all" ON groups
    FOR UPDATE
    TO authenticated
    USING (true);

-- Group members policies
DROP POLICY IF EXISTS "group_members_read_all" ON group_members;
DROP POLICY IF EXISTS "group_members_create_all" ON group_members;
DROP POLICY IF EXISTS "group_members_update_all" ON group_members;

CREATE POLICY "group_members_read_all" ON group_members
    FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "group_members_create_all" ON group_members
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

CREATE POLICY "group_members_update_all" ON group_members
    FOR UPDATE
    TO authenticated
    USING (true);

-- Ideas policies
DROP POLICY IF EXISTS "ideas_read_all" ON ideas;
DROP POLICY IF EXISTS "ideas_create_all" ON ideas;
DROP POLICY IF EXISTS "ideas_update_all" ON ideas;

CREATE POLICY "ideas_read_all" ON ideas
    FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "ideas_create_all" ON ideas
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

CREATE POLICY "ideas_update_all" ON ideas
    FOR UPDATE
    TO authenticated
    USING (true);

-- Comments policies
DROP POLICY IF EXISTS "comments_read_all" ON comments;
DROP POLICY IF EXISTS "comments_create_all" ON comments;
DROP POLICY IF EXISTS "comments_update_all" ON comments;

CREATE POLICY "comments_read_all" ON comments
    FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "comments_create_all" ON comments
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

CREATE POLICY "comments_update_all" ON comments
    FOR UPDATE
    TO authenticated
    USING (true);

-- Tasks policies
DROP POLICY IF EXISTS "tasks_read_all" ON tasks;
DROP POLICY IF EXISTS "tasks_create_all" ON tasks;
DROP POLICY IF EXISTS "tasks_update_all" ON tasks;

CREATE POLICY "tasks_read_all" ON tasks
    FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "tasks_create_all" ON tasks
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

CREATE POLICY "tasks_update_all" ON tasks
    FOR UPDATE
    TO authenticated
    USING (true);

-- Meetings policies
DROP POLICY IF EXISTS "meetings_read_all" ON meetings;
DROP POLICY IF EXISTS "meetings_create_all" ON meetings;
DROP POLICY IF EXISTS "meetings_update_all" ON meetings;

CREATE POLICY "meetings_read_all" ON meetings
    FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "meetings_create_all" ON meetings
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

CREATE POLICY "meetings_update_all" ON meetings
    FOR UPDATE
    TO authenticated
    USING (true);

-- Meeting notes policies
DROP POLICY IF EXISTS "meeting_notes_read_all" ON meeting_notes;
DROP POLICY IF EXISTS "meeting_notes_create_all" ON meeting_notes;
DROP POLICY IF EXISTS "meeting_notes_update_all" ON meeting_notes;

CREATE POLICY "meeting_notes_read_all" ON meeting_notes
    FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "meeting_notes_create_all" ON meeting_notes
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

CREATE POLICY "meeting_notes_update_all" ON meeting_notes
    FOR UPDATE
    TO authenticated
    USING (true);

-- Documents policies
DROP POLICY IF EXISTS "documents_read_all" ON documents;
DROP POLICY IF EXISTS "documents_create_all" ON documents;
DROP POLICY IF EXISTS "documents_update_all" ON documents;

CREATE POLICY "documents_read_all" ON documents
    FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "documents_create_all" ON documents
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

CREATE POLICY "documents_update_all" ON documents
    FOR UPDATE
    TO authenticated
    USING (true);

-- Workflow transitions policies
DROP POLICY IF EXISTS "workflow_transitions_read_all" ON workflow_transitions;
DROP POLICY IF EXISTS "workflow_transitions_create_all" ON workflow_transitions;

CREATE POLICY "workflow_transitions_read_all" ON workflow_transitions
    FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "workflow_transitions_create_all" ON workflow_transitions
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

-- User activities policies
DROP POLICY IF EXISTS "user_activities_read_all" ON user_activities;
DROP POLICY IF EXISTS "user_activities_create_all" ON user_activities;

CREATE POLICY "user_activities_read_all" ON user_activities
    FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "user_activities_create_all" ON user_activities
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

-- Evaluations policies
DROP POLICY IF EXISTS "evaluations_read_all" ON evaluations;
DROP POLICY IF EXISTS "evaluations_create_all" ON evaluations;
DROP POLICY IF EXISTS "evaluations_update_all" ON evaluations;

CREATE POLICY "evaluations_read_all" ON evaluations
    FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "evaluations_create_all" ON evaluations
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

CREATE POLICY "evaluations_update_all" ON evaluations
    FOR UPDATE
    TO authenticated
    USING (true);

-- Votes policies
DROP POLICY IF EXISTS "votes_read_all" ON votes;
DROP POLICY IF EXISTS "votes_create_all" ON votes;
DROP POLICY IF EXISTS "votes_update_all" ON votes;

CREATE POLICY "votes_read_all" ON votes
    FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "votes_create_all" ON votes
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

CREATE POLICY "votes_update_all" ON votes
    FOR UPDATE
    TO authenticated
    USING (true);

-- Investor interest policies
DROP POLICY IF EXISTS "investor_interest_read_all" ON investor_interest;
DROP POLICY IF EXISTS "investor_interest_create_all" ON investor_interest;
DROP POLICY IF EXISTS "investor_interest_update_all" ON investor_interest;

CREATE POLICY "investor_interest_read_all" ON investor_interest
    FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "investor_interest_create_all" ON investor_interest
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

CREATE POLICY "investor_interest_update_all" ON investor_interest
    FOR UPDATE
    TO authenticated
    USING (true);

-- 4. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_profiles_account_type ON profiles(account_type);
CREATE INDEX IF NOT EXISTS idx_profiles_organization_id ON profiles(organization_id);
CREATE INDEX IF NOT EXISTS idx_organizations_invite_code ON organizations(invite_code);
CREATE INDEX IF NOT EXISTS idx_organization_members_user_id ON organization_members(user_id);

-- 5. Verify setup
SELECT 'Fresh start with enhanced registration completed successfully!' as status;

-- Show table counts (should all be 0)
SELECT 
    'profiles' as table_name, COUNT(*) as row_count FROM profiles
UNION ALL
SELECT 
    'organizations' as table_name, COUNT(*) as row_count FROM organizations
UNION ALL
SELECT 
    'organization_members' as table_name, COUNT(*) as row_count FROM organization_members
UNION ALL
SELECT 
    'groups' as table_name, COUNT(*) as row_count FROM groups
UNION ALL
SELECT 
    'group_members' as table_name, COUNT(*) as row_count FROM group_members
UNION ALL
SELECT 
    'ideas' as table_name, COUNT(*) as row_count FROM ideas
UNION ALL
SELECT 
    'comments' as table_name, COUNT(*) as row_count FROM comments
UNION ALL
SELECT 
    'tasks' as table_name, COUNT(*) as row_count FROM tasks
UNION ALL
SELECT 
    'meetings' as table_name, COUNT(*) as row_count FROM meetings
UNION ALL
SELECT 
    'meeting_notes' as table_name, COUNT(*) as row_count FROM meeting_notes
UNION ALL
SELECT 
    'documents' as table_name, COUNT(*) as row_count FROM documents
UNION ALL
SELECT 
    'workflow_transitions' as table_name, COUNT(*) as row_count FROM workflow_transitions
UNION ALL
SELECT 
    'user_activities' as table_name, COUNT(*) as row_count FROM user_activities
UNION ALL
SELECT 
    'evaluations' as table_name, COUNT(*) as row_count FROM evaluations
UNION ALL
SELECT 
    'votes' as table_name, COUNT(*) as row_count FROM votes
UNION ALL
SELECT 
    'investor_interest' as table_name, COUNT(*) as row_count FROM investor_interest;
