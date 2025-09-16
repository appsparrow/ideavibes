-- Fix Admin Ideas Visibility Issue
-- This allows admins to see ALL ideas regardless of group membership

-- First, let's see what the current policy looks like
SELECT 
  'CURRENT IDEAS RLS POLICIES' as analysis_type,
  policyname,
  cmd,
  qual,
  'Current Policy' as status
FROM pg_policies 
WHERE tablename = 'ideas'
ORDER BY policyname;

-- Drop the current restrictive policy
DROP POLICY IF EXISTS "Users can view ideas in their groups" ON public.ideas;

-- Create a new policy that allows:
-- 1. Admins to see ALL ideas (regardless of group membership)
-- 2. Regular users to see ideas in groups they belong to
-- 3. Ideas without groups to be visible to all authenticated users
CREATE POLICY "Admins see all ideas, users see group ideas" 
ON public.ideas 
FOR SELECT 
USING (
  -- Admins can see everything
  public.is_admin(auth.uid()) 
  OR 
  -- Users can see ideas in groups they belong to
  (group_id IN (
    SELECT group_id 
    FROM public.group_members 
    WHERE user_id = auth.uid()
  ))
  OR 
  -- Ideas without groups are visible to all authenticated users
  group_id IS NULL
);

-- Keep the existing policies for other operations
-- Users can create ideas
CREATE POLICY "Authenticated users can create ideas" 
ON public.ideas 
FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL);

-- Users and moderators can update ideas
CREATE POLICY "Users and moderators can update ideas" 
ON public.ideas 
FOR UPDATE 
USING (auth.uid() = submitted_by OR public.is_moderator(auth.uid()));

-- Admins can delete ideas
CREATE POLICY "Admins can delete ideas" 
ON public.ideas 
FOR DELETE 
USING (public.is_admin(auth.uid()));

-- Verify the new policy
SELECT 
  'NEW IDEAS RLS POLICIES' as analysis_type,
  policyname,
  cmd,
  qual,
  'New Policy' as status
FROM pg_policies 
WHERE tablename = 'ideas'
ORDER BY policyname;

-- Test query to show what admin can now see
SELECT 
  'ADMIN CAN NOW SEE' as analysis_type,
  COUNT(*) as total_ideas_visible,
  'All ideas visible to admin' as status
FROM public.ideas
WHERE public.is_admin(auth.uid()) OR group_id IS NULL OR group_id IN (
  SELECT group_id FROM public.group_members WHERE user_id = auth.uid()
);
