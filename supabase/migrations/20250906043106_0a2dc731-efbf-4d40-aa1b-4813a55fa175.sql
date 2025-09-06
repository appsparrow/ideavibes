-- Allow group creators to view their group immediately after creation
DROP POLICY IF EXISTS "Users can view groups they belong to" ON public.groups;
CREATE POLICY "Users can view groups they belong to"
ON public.groups
FOR SELECT
USING (public.user_in_group(auth.uid(), id) OR created_by = auth.uid());