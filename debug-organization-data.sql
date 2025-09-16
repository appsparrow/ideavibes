-- Debug Organization Data
-- Check if organizations table exists and has data

-- 1. Check if organizations table exists
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name = 'organizations';

-- 2. Check organizations data
SELECT * FROM organizations;

-- 3. Check organization_members data
SELECT * FROM organization_members;

-- 4. Check if users are properly linked to organizations
SELECT 
  p.email,
  p.role,
  om.role as org_role,
  o.name as org_name
FROM profiles p
LEFT JOIN organization_members om ON p.id = om.user_id
LEFT JOIN organizations o ON om.organization_id = o.id;
