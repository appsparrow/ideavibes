-- Simple fix for organizations 500 error
-- This only fixes the RLS policies, doesn't insert data

-- Drop all existing policies on organizations
DROP POLICY IF EXISTS "Users can view organizations" ON public.organizations;
DROP POLICY IF EXISTS "Admins can manage organizations" ON public.organizations;
DROP POLICY IF EXISTS "Users can view organization members" ON public.organization_members;
DROP POLICY IF EXISTS "Admins can manage organization members" ON public.organization_members;

-- Create simple policies that allow all authenticated users to read
CREATE POLICY "Allow all authenticated users to read organizations" 
ON public.organizations FOR SELECT 
TO authenticated 
USING (true);

CREATE POLICY "Allow all authenticated users to read organization members" 
ON public.organization_members FOR SELECT 
TO authenticated 
USING (true);

-- Ensure RLS is enabled
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;
