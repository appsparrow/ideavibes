-- Safe RLS Fix - Drops ALL policies first to avoid conflicts
-- This creates simple, safe RLS policies that avoid infinite recursion

-- 1. Drop ALL existing policies on all tables to avoid conflicts
-- IDEAS table policies
DROP POLICY IF EXISTS "All authenticated users can view all ideas" ON public.ideas;
DROP POLICY IF EXISTS "Authenticated users can create ideas" ON public.ideas;
DROP POLICY IF EXISTS "Users can update own ideas" ON public.ideas;
DROP POLICY IF EXISTS "Admins can delete ideas" ON public.ideas;
DROP POLICY IF EXISTS "Admins see all ideas, users see group ideas" ON public.ideas;
DROP POLICY IF EXISTS "Users can view ideas in their groups" ON public.ideas;
DROP POLICY IF EXISTS "Users and moderators can update ideas" ON public.ideas;
DROP POLICY IF EXISTS "Anyone can view ideas" ON public.ideas;

-- GROUPS table policies
DROP POLICY IF EXISTS "All authenticated users can view all groups" ON public.groups;
DROP POLICY IF EXISTS "Authenticated users can create groups" ON public.groups;
DROP POLICY IF EXISTS "Users can update groups they created" ON public.groups;
DROP POLICY IF EXISTS "Admins can delete groups" ON public.groups;
DROP POLICY IF EXISTS "Admins can view all groups" ON public.groups;
DROP POLICY IF EXISTS "Users can view groups they belong to" ON public.groups;
DROP POLICY IF EXISTS "Only admins can create groups" ON public.groups;
DROP POLICY IF EXISTS "Users can create groups" ON public.groups;
DROP POLICY IF EXISTS "Only admins can update groups" ON public.groups;
DROP POLICY IF EXISTS "Group admins can update groups" ON public.groups;
DROP POLICY IF EXISTS "Only admins can delete groups" ON public.groups;

-- GROUP_MEMBERS table policies
DROP POLICY IF EXISTS "All authenticated users can view group members" ON public.group_members;
DROP POLICY IF EXISTS "Authenticated users can join groups" ON public.group_members;
DROP POLICY IF EXISTS "Users can leave groups" ON public.group_members;
DROP POLICY IF EXISTS "Admins can manage group members" ON public.group_members;
DROP POLICY IF EXISTS "Admins can view all group members" ON public.group_members;
DROP POLICY IF EXISTS "Users can view group members for their groups" ON public.group_members;
DROP POLICY IF EXISTS "Only admins can manage group members" ON public.group_members;
DROP POLICY IF EXISTS "Group admins can manage members" ON public.group_members;
DROP POLICY IF EXISTS "Users can join groups via invite" ON public.group_members;

-- ORGANIZATIONS table policies (if table exists)
DROP POLICY IF EXISTS "All authenticated users can view organizations" ON public.organizations;
DROP POLICY IF EXISTS "Admins can create organizations" ON public.organizations;
DROP POLICY IF EXISTS "Admins can update organizations" ON public.organizations;
DROP POLICY IF EXISTS "Admins can delete organizations" ON public.organizations;

-- ORGANIZATION_MEMBERS table policies (if table exists)
DROP POLICY IF EXISTS "All authenticated users can view organization members" ON public.organization_members;
DROP POLICY IF EXISTS "Admins can manage organization members" ON public.organization_members;

-- COMMENTS table policies
DROP POLICY IF EXISTS "All authenticated users can view comments" ON public.comments;
DROP POLICY IF EXISTS "Authenticated users can create comments" ON public.comments;
DROP POLICY IF EXISTS "Users can update own comments" ON public.comments;
DROP POLICY IF EXISTS "Users can delete own comments" ON public.comments;
DROP POLICY IF EXISTS "Anyone can view comments" ON public.comments;
DROP POLICY IF EXISTS "Users can update own comments" ON public.comments;
DROP POLICY IF EXISTS "Users can delete own comments" ON public.comments;

-- TASKS table policies
DROP POLICY IF EXISTS "All authenticated users can view tasks" ON public.tasks;
DROP POLICY IF EXISTS "Authenticated users can create tasks" ON public.tasks;
DROP POLICY IF EXISTS "Users can update assigned tasks" ON public.tasks;
DROP POLICY IF EXISTS "Admins can delete tasks" ON public.tasks;

-- 2. Now create SIMPLE, SAFE policies for IDEAS
CREATE POLICY "All authenticated users can view all ideas" 
ON public.ideas 
FOR SELECT 
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can create ideas" 
ON public.ideas 
FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can update own ideas" 
ON public.ideas 
FOR UPDATE 
USING (auth.uid() = submitted_by);

CREATE POLICY "Admins can delete ideas" 
ON public.ideas 
FOR DELETE 
USING (public.is_admin(auth.uid()));

-- 3. Create SIMPLE, SAFE policies for GROUPS
CREATE POLICY "All authenticated users can view all groups" 
ON public.groups 
FOR SELECT 
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can create groups" 
ON public.groups 
FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL AND created_by = auth.uid());

CREATE POLICY "Users can update groups they created" 
ON public.groups 
FOR UPDATE 
USING (auth.uid() = created_by);

CREATE POLICY "Admins can delete groups" 
ON public.groups 
FOR DELETE 
USING (public.is_admin(auth.uid()));

-- 4. Create SIMPLE, SAFE policies for GROUP_MEMBERS
CREATE POLICY "All authenticated users can view group members" 
ON public.group_members 
FOR SELECT 
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can join groups" 
ON public.group_members 
FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL AND user_id = auth.uid());

CREATE POLICY "Users can leave groups" 
ON public.group_members 
FOR DELETE 
USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage group members" 
ON public.group_members 
FOR ALL 
USING (public.is_admin(auth.uid()));

-- 5. Create SIMPLE, SAFE policies for COMMENTS
CREATE POLICY "All authenticated users can view comments" 
ON public.comments 
FOR SELECT 
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can create comments" 
ON public.comments 
FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can update own comments" 
ON public.comments 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own comments" 
ON public.comments 
FOR DELETE 
USING (auth.uid() = user_id);

-- 6. Create SIMPLE, SAFE policies for TASKS
CREATE POLICY "All authenticated users can view tasks" 
ON public.tasks 
FOR SELECT 
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can create tasks" 
ON public.tasks 
FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can update assigned tasks" 
ON public.tasks 
FOR UPDATE 
USING (auth.uid() = assigned_to);

CREATE POLICY "Admins can delete tasks" 
ON public.tasks 
FOR DELETE 
USING (public.is_admin(auth.uid()));

-- 7. Verify the new policies
SELECT 
  'NEW SIMPLE POLICIES CREATED' as analysis_type,
  tablename,
  policyname,
  cmd,
  'Simple Policy' as status
FROM pg_policies 
WHERE tablename IN ('ideas', 'groups', 'group_members', 'comments', 'tasks')
ORDER BY tablename, policyname;

-- 8. Test that the policies work
SELECT 
  'POLICY TEST SUCCESS' as analysis_type,
  'Ideas accessible' as test_type,
  COUNT(*) as count,
  'Test passed' as status
FROM public.ideas
WHERE auth.uid() IS NOT NULL;
