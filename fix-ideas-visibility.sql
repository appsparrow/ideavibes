-- Fix Ideas Visibility Issue
-- This script fixes the RLS policy so all users in the organization can see all ideas

-- Drop the current restrictive policy
DROP POLICY IF EXISTS "Users can view ideas in their groups" ON public.ideas;

-- Create a new policy that allows all authenticated users to view all ideas
-- This makes ideas visible to all users in the organization
CREATE POLICY "All users can view all ideas" 
ON public.ideas 
FOR SELECT 
USING (auth.uid() IS NOT NULL);

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

-- Verify the setup
SELECT 'Ideas visibility fixed - all users can now see all ideas' as status;
