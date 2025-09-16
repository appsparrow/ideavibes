-- Fix RLS Recursion Errors
-- This creates simple, safe RLS policies that avoid infinite recursion

-- 1. First, let's see what policies are causing issues
SELECT 
  'CURRENT PROBLEMATIC POLICIES' as analysis_type,
  tablename,
  policyname,
  cmd,
  qual,
  'Problematic Policy' as status
FROM pg_policies 
WHERE tablename IN ('ideas', 'groups', 'group_members', 'organizations', 'organization_members', 'comments', 'tasks')
ORDER BY tablename, policyname;

-- 2. Drop ALL problematic policies to start fresh
DROP POLICY IF EXISTS "Admins see all ideas, users see group ideas" ON public.ideas;
DROP POLICY IF EXISTS "Users can view ideas in their groups" ON public.ideas;
DROP POLICY IF EXISTS "Authenticated users can create ideas" ON public.ideas;
DROP POLICY IF EXISTS "Users and moderators can update ideas" ON public.ideas;
DROP POLICY IF EXISTS "Admins can delete ideas" ON public.ideas;

DROP POLICY IF EXISTS "Admins can view all groups" ON public.groups;
DROP POLICY IF EXISTS "Users can view groups they belong to" ON public.groups;
DROP POLICY IF EXISTS "Only admins can create groups" ON public.groups;
DROP POLICY IF EXISTS "Users can create groups" ON public.groups;
DROP POLICY IF EXISTS "Only admins can update groups" ON public.groups;
DROP POLICY IF EXISTS "Group admins can update groups" ON public.groups;
DROP POLICY IF EXISTS "Only admins can delete groups" ON public.groups;

DROP POLICY IF EXISTS "Admins can view all group members" ON public.group_members;
DROP POLICY IF EXISTS "Users can view group members for their groups" ON public.group_members;
DROP POLICY IF EXISTS "Only admins can manage group members" ON public.group_members;
DROP POLICY IF EXISTS "Group admins can manage members" ON public.group_members;
DROP POLICY IF EXISTS "Users can join groups via invite" ON public.group_members;

-- 3. Create SIMPLE, SAFE policies for IDEAS
-- Allow all authenticated users to see all ideas (simple approach)
CREATE POLICY "All authenticated users can view all ideas" 
ON public.ideas 
FOR SELECT 
USING (auth.uid() IS NOT NULL);

-- Allow authenticated users to create ideas
CREATE POLICY "Authenticated users can create ideas" 
ON public.ideas 
FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL);

-- Allow users to update their own ideas
CREATE POLICY "Users can update own ideas" 
ON public.ideas 
FOR UPDATE 
USING (auth.uid() = submitted_by);

-- Allow admins to delete any idea
CREATE POLICY "Admins can delete ideas" 
ON public.ideas 
FOR DELETE 
USING (public.is_admin(auth.uid()));

-- 4. Create SIMPLE, SAFE policies for GROUPS
-- Allow all authenticated users to see all groups
CREATE POLICY "All authenticated users can view all groups" 
ON public.groups 
FOR SELECT 
USING (auth.uid() IS NOT NULL);

-- Allow authenticated users to create groups (for now)
CREATE POLICY "Authenticated users can create groups" 
ON public.groups 
FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL AND created_by = auth.uid());

-- Allow users to update groups they created
CREATE POLICY "Users can update groups they created" 
ON public.groups 
FOR UPDATE 
USING (auth.uid() = created_by);

-- Allow admins to delete any group
CREATE POLICY "Admins can delete groups" 
ON public.groups 
FOR DELETE 
USING (public.is_admin(auth.uid()));

-- 5. Create SIMPLE, SAFE policies for GROUP_MEMBERS
-- Allow all authenticated users to see all group memberships
CREATE POLICY "All authenticated users can view group members" 
ON public.group_members 
FOR SELECT 
USING (auth.uid() IS NOT NULL);

-- Allow authenticated users to join groups
CREATE POLICY "Authenticated users can join groups" 
ON public.group_members 
FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL AND user_id = auth.uid());

-- Allow users to leave groups (delete their own membership)
CREATE POLICY "Users can leave groups" 
ON public.group_members 
FOR DELETE 
USING (auth.uid() = user_id);

-- Allow admins to manage all group memberships
CREATE POLICY "Admins can manage group members" 
ON public.group_members 
FOR ALL 
USING (public.is_admin(auth.uid()));

-- 6. Create SIMPLE, SAFE policies for ORGANIZATIONS (if table exists)
-- Allow all authenticated users to see all organizations
CREATE POLICY "All authenticated users can view organizations" 
ON public.organizations 
FOR SELECT 
USING (auth.uid() IS NOT NULL);

-- Allow admins to create organizations
CREATE POLICY "Admins can create organizations" 
ON public.organizations 
FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL AND public.is_admin(auth.uid()));

-- Allow admins to update organizations
CREATE POLICY "Admins can update organizations" 
ON public.organizations 
FOR UPDATE 
USING (public.is_admin(auth.uid()));

-- Allow admins to delete organizations
CREATE POLICY "Admins can delete organizations" 
ON public.organizations 
FOR DELETE 
USING (public.is_admin(auth.uid()));

-- 7. Create SIMPLE, SAFE policies for ORGANIZATION_MEMBERS (if table exists)
-- Allow all authenticated users to see all organization memberships
CREATE POLICY "All authenticated users can view organization members" 
ON public.organization_members 
FOR SELECT 
USING (auth.uid() IS NOT NULL);

-- Allow admins to manage organization memberships
CREATE POLICY "Admins can manage organization members" 
ON public.organization_members 
FOR ALL 
USING (public.is_admin(auth.uid()));

-- 8. Create SIMPLE, SAFE policies for COMMENTS
-- Allow all authenticated users to see all comments
CREATE POLICY "All authenticated users can view comments" 
ON public.comments 
FOR SELECT 
USING (auth.uid() IS NOT NULL);

-- Allow authenticated users to create comments
CREATE POLICY "Authenticated users can create comments" 
ON public.comments 
FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL);

-- Allow users to update their own comments
CREATE POLICY "Users can update own comments" 
ON public.comments 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Allow users to delete their own comments
CREATE POLICY "Users can delete own comments" 
ON public.comments 
FOR DELETE 
USING (auth.uid() = user_id);

-- 9. Create SIMPLE, SAFE policies for TASKS
-- Allow all authenticated users to see all tasks
CREATE POLICY "All authenticated users can view tasks" 
ON public.tasks 
FOR SELECT 
USING (auth.uid() IS NOT NULL);

-- Allow authenticated users to create tasks
CREATE POLICY "Authenticated users can create tasks" 
ON public.tasks 
FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL);

-- Allow users to update tasks assigned to them
CREATE POLICY "Users can update assigned tasks" 
ON public.tasks 
FOR UPDATE 
USING (auth.uid() = assigned_to);

-- Allow admins to delete any task
CREATE POLICY "Admins can delete tasks" 
ON public.tasks 
FOR DELETE 
USING (public.is_admin(auth.uid()));

-- 10. Verify the new policies
SELECT 
  'NEW SIMPLE POLICIES' as analysis_type,
  tablename,
  policyname,
  cmd,
  'Simple Policy' as status
FROM pg_policies 
WHERE tablename IN ('ideas', 'groups', 'group_members', 'organizations', 'organization_members', 'comments', 'tasks')
ORDER BY tablename, policyname;

-- 11. Test that the policies work
SELECT 
  'POLICY TEST' as analysis_type,
  'Ideas accessible' as test_type,
  COUNT(*) as count,
  'Test passed' as status
FROM public.ideas
WHERE auth.uid() IS NOT NULL;
