-- Add moderator role to the enum
ALTER TYPE user_role ADD VALUE 'moderator';

-- Fix the update_idea_status function to handle enum types properly
CREATE OR REPLACE FUNCTION public.update_idea_status(p_idea_id uuid, p_new_status idea_status, p_reason text DEFAULT NULL::text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  old_status TEXT;
BEGIN
  -- Check if user is admin
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Only administrators can update idea status';
  END IF;
  
  -- Get current status
  SELECT status::text INTO old_status
  FROM public.ideas
  WHERE id = p_idea_id;
  
  -- Update idea status
  UPDATE public.ideas
  SET status = p_new_status,
      updated_at = now()
  WHERE id = p_idea_id;
  
  -- Log transition
  INSERT INTO public.workflow_transitions (idea_id, from_status, to_status, reason, changed_by)
  VALUES (p_idea_id, old_status, p_new_status::text, p_reason, auth.uid());
END;
$function$;

-- Create function to check if user is moderator
CREATE OR REPLACE FUNCTION public.is_moderator(user_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = user_id
    AND role IN ('admin', 'moderator')
  )
$function$;

-- Update ideas table RLS policies to allow admin/moderator editing and admin deletion
DROP POLICY IF EXISTS "Users can update own ideas" ON public.ideas;

CREATE POLICY "Users and moderators can update ideas" 
ON public.ideas 
FOR UPDATE 
USING (auth.uid() = submitted_by OR public.is_moderator(auth.uid()));

CREATE POLICY "Admins can delete ideas" 
ON public.ideas 
FOR DELETE 
USING (public.is_admin(auth.uid()));

-- Update documents table RLS policies to allow admin/moderator deletion
DROP POLICY IF EXISTS "Users can delete own documents" ON public.documents;

CREATE POLICY "Users and moderators can delete documents" 
ON public.documents 
FOR DELETE 
USING (auth.uid() = created_by OR public.is_moderator(auth.uid()));