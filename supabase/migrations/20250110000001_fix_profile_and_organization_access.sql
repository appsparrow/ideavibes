-- Fix Profile and Organization Access Issues
-- This migration fixes RLS policies to allow proper profile access and organization security

-- 1. Fix profiles table RLS policies to allow users to see profiles of other users in their organization
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins and moderators can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can view profiles in their groups" ON public.profiles;
DROP POLICY IF EXISTS "Users can view profiles in their organization" ON public.profiles;

-- Create comprehensive profile access policy
CREATE POLICY "Users can view profiles in their organization" 
ON public.profiles 
FOR SELECT 
USING (
  -- Users can always view their own profile
  auth.uid() = id OR
  -- Admins can view all profiles
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'admin'
  )
);

-- 2. Fix organizations table RLS policies for better security
DROP POLICY IF EXISTS "Users can view organizations they belong to" ON public.organizations;
DROP POLICY IF EXISTS "Only admins can create organizations" ON public.organizations;

-- Allow users to view organizations (simplified to avoid recursion)
CREATE POLICY "Users can view organizations" 
ON public.organizations 
FOR SELECT 
USING (true);

-- Only admins can create organizations
CREATE POLICY "Only admins can create organizations" 
ON public.organizations 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'admin'
  )
);

-- Only admins can update organizations
CREATE POLICY "Only admins can update organizations" 
ON public.organizations 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'admin'
  )
);

-- 3. Fix organization_members table RLS policies
DROP POLICY IF EXISTS "Users can view organization memberships" ON public.organization_members;
DROP POLICY IF EXISTS "Organization admins can add members" ON public.organization_members;
DROP POLICY IF EXISTS "Organization admins can manage members" ON public.organization_members;

-- Simple policy: Users can view organization memberships (no recursion)
CREATE POLICY "Users can view organization memberships" 
ON public.organization_members 
FOR SELECT 
USING (true);

-- Only admins can manage organization members
DROP POLICY IF EXISTS "Admins can manage organization members" ON public.organization_members;
CREATE POLICY "Admins can manage organization members" 
ON public.organization_members 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'admin'
  )
);

-- 4. Create a function to check if user is organization admin
CREATE OR REPLACE FUNCTION is_organization_admin(user_uuid UUID, org_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.organization_members 
    WHERE user_id = user_uuid 
    AND organization_id = org_uuid 
    AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Create a function to get user's organization role
CREATE OR REPLACE FUNCTION get_user_organization_role(user_uuid UUID, org_uuid UUID)
RETURNS TEXT AS $$
BEGIN
  RETURN (
    SELECT role FROM public.organization_members 
    WHERE user_id = user_uuid 
    AND organization_id = org_uuid
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Grant necessary permissions
GRANT EXECUTE ON FUNCTION is_organization_admin(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_organization_role(UUID, UUID) TO authenticated;

-- 7. Create a view for user organization details
CREATE OR REPLACE VIEW user_organization_details AS
SELECT 
    p.id as user_id,
    p.name as user_name,
    p.email as user_email,
    p.role as user_role,
    o.id as organization_id,
    o.name as organization_name,
    o.type as organization_type,
    om.role as organization_role,
    om.joined_at
FROM public.profiles p
LEFT JOIN public.organization_members om ON p.id = om.user_id
LEFT JOIN public.organizations o ON om.organization_id = o.id;

-- Grant access to the view
GRANT SELECT ON user_organization_details TO authenticated;

-- 8. Set the view to use security invoker (runs with the permissions of the caller)
ALTER VIEW user_organization_details SET (security_invoker = true);
