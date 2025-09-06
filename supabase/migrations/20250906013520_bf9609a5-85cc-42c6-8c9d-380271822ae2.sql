-- Fix ambiguous overloaded RPC for updating idea status
-- Remove the duplicate text-typed function and keep a single enum-typed version

-- 1) Drop the conflicting overload (text signature)
DROP FUNCTION IF EXISTS public.update_idea_status(uuid, text, text);

-- 2) Ensure a single canonical implementation using the enum type
CREATE OR REPLACE FUNCTION public.update_idea_status(
  p_idea_id uuid,
  p_new_status public.idea_status,
  p_reason text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  old_status TEXT;
BEGIN
  -- Authorization: only admins
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Only administrators can update idea status';
  END IF;

  -- Current status
  SELECT status::text INTO old_status
  FROM public.ideas
  WHERE id = p_idea_id;

  -- Update status
  UPDATE public.ideas
  SET status = p_new_status,
      updated_at = now()
  WHERE id = p_idea_id;

  -- Log transition
  INSERT INTO public.workflow_transitions (idea_id, from_status, to_status, reason, changed_by)
  VALUES (p_idea_id, old_status, p_new_status::text, p_reason, auth.uid());
END;
$function$;