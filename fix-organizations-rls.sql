-- Fix Organizations RLS Policy Issues
-- This script fixes the 500 Internal Server Error when accessing organizations table

-- Drop existing problematic policies on organizations table
DROP POLICY IF EXISTS "Users can view organizations" ON public.organizations;
DROP POLICY IF EXISTS "Admins can manage organizations" ON public.organizations;
DROP POLICY IF EXISTS "Users can view organization members" ON public.organization_members;
DROP POLICY IF EXISTS "Admins can manage organization members" ON public.organization_members;

-- Create simple, non-recursive policies for organizations
CREATE POLICY "All authenticated users can view organizations" 
ON public.organizations FOR SELECT 
TO authenticated 
USING (true);

CREATE POLICY "Admins can manage organizations" 
ON public.organizations FOR ALL 
TO authenticated 
USING (public.is_admin(auth.uid()));

-- Create simple policies for organization_members
CREATE POLICY "All authenticated users can view organization members" 
ON public.organization_members FOR SELECT 
TO authenticated 
USING (true);

CREATE POLICY "Admins can manage organization members" 
ON public.organization_members FOR ALL 
TO authenticated 
USING (public.is_admin(auth.uid()));

-- Ensure organizations table has RLS enabled
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;

-- Insert BeyondIT organization if it doesn't exist
INSERT INTO public.organizations (id, name, type, created_by, created_at, updated_at)
SELECT 
  gen_random_uuid(),
  'BeyondIT',
  'individual',
  (SELECT id FROM public.profiles WHERE email = 'siva@strakzilla.com' LIMIT 1),
  NOW(),
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM public.organizations WHERE name = 'BeyondIT'
);

-- Add all existing users to BeyondIT organization
INSERT INTO public.organization_members (organization_id, user_id, role, created_at)
SELECT 
  o.id,
  p.id,
  CASE 
    WHEN p.email = 'siva@strakzilla.com' THEN 'admin'
    ELSE 'member'
  END,
  NOW()
FROM public.profiles p
CROSS JOIN public.organizations o
WHERE o.name = 'BeyondIT'
AND NOT EXISTS (
  SELECT 1 FROM public.organization_members om 
  WHERE om.organization_id = o.id 
  AND om.user_id = p.id
);
