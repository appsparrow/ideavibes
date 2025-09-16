-- Test if organizations table is accessible
-- Run this to see if the RLS fix worked

-- Check if we can read organizations
SELECT COUNT(*) as organization_count FROM public.organizations;

-- Check the actual organization data
SELECT id, name, type, created_by, created_at FROM public.organizations;

-- Check organization members
SELECT COUNT(*) as member_count FROM public.organization_members;
