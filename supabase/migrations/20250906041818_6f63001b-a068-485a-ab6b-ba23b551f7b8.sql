-- Fix RLS infinite recursion for group_members by using security definer helper functions

-- 1) Helper functions
CREATE OR REPLACE FUNCTION public.user_in_group(_user_id uuid, _group_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.group_members gm
    WHERE gm.user_id = _user_id AND gm.group_id = _group_id
  );
$$;

CREATE OR REPLACE FUNCTION public.user_is_group_admin(_user_id uuid, _group_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.group_members gm
    WHERE gm.user_id = _user_id AND gm.group_id = _group_id AND gm.role = 'admin'
  );
$$;

-- 2) Update policies on group_members to avoid self-referencing recursion
DROP POLICY IF EXISTS "Users can view group members for their groups" ON public.group_members;
CREATE POLICY "Users can view group members for their groups"
ON public.group_members
FOR SELECT
USING (public.user_in_group(auth.uid(), group_id));

DROP POLICY IF EXISTS "Group admins can manage members" ON public.group_members;

-- Split admin management into explicit commands
CREATE POLICY "Group admins can insert members"
ON public.group_members
FOR INSERT
WITH CHECK (public.user_is_group_admin(auth.uid(), group_id));

CREATE POLICY "Group admins can update members"
ON public.group_members
FOR UPDATE
USING (public.user_is_group_admin(auth.uid(), group_id));

CREATE POLICY "Group admins can delete members"
ON public.group_members
FOR DELETE
USING (public.user_is_group_admin(auth.uid(), group_id));

-- Allow group creator to add themselves as admin immediately after creating a group
DROP POLICY IF EXISTS "Group creator can add self as admin" ON public.group_members;
CREATE POLICY "Group creator can add self as admin"
ON public.group_members
FOR INSERT
WITH CHECK (
  user_id = auth.uid() AND
  EXISTS (
    SELECT 1 FROM public.groups g
    WHERE g.id = group_id AND g.created_by = auth.uid()
  )
);

-- Keep existing invite-based insert policy as-is (assumed present):
-- "Users can join groups via invite" (INSERT, WITH CHECK user_id = auth.uid())

-- 3) Update policies on groups to use helper functions (no recursion risk and clearer)
DROP POLICY IF EXISTS "Users can view groups they belong to" ON public.groups;
CREATE POLICY "Users can view groups they belong to"
ON public.groups
FOR SELECT
USING (public.user_in_group(auth.uid(), id));

DROP POLICY IF EXISTS "Group admins can update groups" ON public.groups;
CREATE POLICY "Group admins can update groups"
ON public.groups
FOR UPDATE
USING (public.user_is_group_admin(auth.uid(), id));
