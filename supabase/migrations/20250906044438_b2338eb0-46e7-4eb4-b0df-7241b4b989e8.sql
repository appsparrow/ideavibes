-- Fix groups RLS policies for better visibility and management

-- Update groups select policy to allow users to see groups they created
DROP POLICY IF EXISTS "Users can view groups they belong to" ON public.groups;

CREATE POLICY "Users can view groups they belong to or created" 
ON public.groups 
FOR SELECT 
USING (
  user_in_group(auth.uid(), id) OR 
  created_by = auth.uid()
);

-- Add policy for group admins to view group members from other groups (for admin purposes)
DROP POLICY IF EXISTS "Group admins can view all group members" ON public.group_members;

CREATE POLICY "Group admins can view all group members" 
ON public.group_members 
FOR SELECT 
USING (
  user_in_group(auth.uid(), group_id) OR
  user_is_group_admin(auth.uid(), group_id)
);

-- Allow users to view profiles of members in their groups
DROP POLICY IF EXISTS "Users can view profiles in their groups" ON public.profiles;

CREATE POLICY "Users can view profiles in their groups" 
ON public.profiles 
FOR SELECT 
USING (
  auth.uid() = id OR
  is_moderator(auth.uid()) OR
  EXISTS (
    SELECT 1 FROM public.group_members gm1
    JOIN public.group_members gm2 ON gm1.group_id = gm2.group_id
    WHERE gm1.user_id = auth.uid() AND gm2.user_id = profiles.id
  )
);