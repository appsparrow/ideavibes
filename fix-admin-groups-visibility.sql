-- Fix Admin Groups Visibility and Restrict Group Creation
-- This allows admins to see ALL groups and restricts group creation to admins only

-- 1. First, let's see what the current group policies look like
SELECT 
  'CURRENT GROUPS RLS POLICIES' as analysis_type,
  policyname,
  cmd,
  qual,
  'Current Policy' as status
FROM pg_policies 
WHERE tablename = 'groups'
ORDER BY policyname;

-- 2. Drop the current restrictive policies
DROP POLICY IF EXISTS "Users can view groups they belong to" ON public.groups;
DROP POLICY IF EXISTS "Users can create groups" ON public.groups;
DROP POLICY IF EXISTS "Group admins can update groups" ON public.groups;

-- 3. Create new policies that allow admins to see ALL groups
-- Admins can see all groups
CREATE POLICY "Admins can view all groups" 
ON public.groups 
FOR SELECT 
USING (
  -- Admins can see everything
  public.is_admin(auth.uid()) 
  OR 
  -- Users can see groups they belong to
  id IN (
    SELECT group_id 
    FROM public.group_members 
    WHERE user_id = auth.uid()
  )
);

-- 4. Restrict group creation to admins only (to avoid confusion)
CREATE POLICY "Only admins can create groups" 
ON public.groups 
FOR INSERT 
WITH CHECK (
  auth.uid() IS NOT NULL 
  AND public.is_admin(auth.uid())
  AND created_by = auth.uid()
);

-- 5. Only admins can update groups
CREATE POLICY "Only admins can update groups" 
ON public.groups 
FOR UPDATE 
USING (public.is_admin(auth.uid()));

-- 6. Only admins can delete groups
CREATE POLICY "Only admins can delete groups" 
ON public.groups 
FOR DELETE 
USING (public.is_admin(auth.uid()));

-- 7. Fix group_members policies to allow admins to see all memberships
DROP POLICY IF EXISTS "Users can view group members for their groups" ON public.group_members;
DROP POLICY IF EXISTS "Group admins can manage members" ON public.group_members;
DROP POLICY IF EXISTS "Users can join groups via invite" ON public.group_members;

-- Admins can see all group memberships
CREATE POLICY "Admins can view all group members" 
ON public.group_members 
FOR SELECT 
USING (
  -- Admins can see everything
  public.is_admin(auth.uid()) 
  OR 
  -- Users can see memberships for groups they belong to
  group_id IN (
    SELECT group_id 
    FROM public.group_members 
    WHERE user_id = auth.uid()
  )
);

-- Only admins can manage group memberships
CREATE POLICY "Only admins can manage group members" 
ON public.group_members 
FOR ALL 
USING (public.is_admin(auth.uid()));

-- 8. Verify the new policies
SELECT 
  'NEW GROUPS RLS POLICIES' as analysis_type,
  policyname,
  cmd,
  qual,
  'New Policy' as status
FROM pg_policies 
WHERE tablename IN ('groups', 'group_members')
ORDER BY tablename, policyname;

-- 9. Test query to show what admin can now see
SELECT 
  'ADMIN CAN NOW SEE' as analysis_type,
  COUNT(*) as total_groups_visible,
  'All groups visible to admin' as status
FROM public.groups
WHERE public.is_admin(auth.uid()) OR id IN (
  SELECT group_id FROM public.group_members WHERE user_id = auth.uid()
);

-- 10. Show all groups with their creators
SELECT 
  'ALL GROUPS WITH CREATORS' as analysis_type,
  g.id as group_id,
  g.name as group_name,
  g.created_by as creator_id,
  p.name as creator_name,
  p.email as creator_email,
  p.role as creator_role,
  g.created_at,
  'Group Details' as status
FROM public.groups g
LEFT JOIN public.profiles p ON g.created_by = p.id
ORDER BY g.created_at DESC;
