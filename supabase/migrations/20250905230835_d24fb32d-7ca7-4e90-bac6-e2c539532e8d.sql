-- Add workflow management tables and enhance existing ones

-- Create documents table for linking documents to ideas
CREATE TABLE public.documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  idea_id UUID NOT NULL,
  title TEXT NOT NULL,
  document_type TEXT NOT NULL, -- 'google_drive', 'url', 'file', 'article'
  url TEXT,
  file_path TEXT,
  description TEXT,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Anyone can view documents" 
ON public.documents 
FOR SELECT 
USING (true);

CREATE POLICY "Authenticated users can create documents" 
ON public.documents 
FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can update own documents" 
ON public.documents 
FOR UPDATE 
USING (auth.uid() = created_by);

CREATE POLICY "Users can delete own documents" 
ON public.documents 
FOR DELETE 
USING (auth.uid() = created_by);

-- Create workflow transitions table
CREATE TABLE public.workflow_transitions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  idea_id UUID NOT NULL,
  from_status TEXT,
  to_status TEXT NOT NULL,
  reason TEXT,
  changed_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.workflow_transitions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view workflow transitions" 
ON public.workflow_transitions 
FOR SELECT 
USING (true);

CREATE POLICY "Authenticated users can create transitions" 
ON public.workflow_transitions 
FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL);

-- Create user activity tracking table
CREATE TABLE public.user_activities (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  activity_type TEXT NOT NULL, -- 'idea_submitted', 'comment_posted', 'vote_cast', 'evaluation_submitted', 'document_added'
  idea_id UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_activities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view user activities" 
ON public.user_activities 
FOR SELECT 
USING (true);

CREATE POLICY "System can create activities" 
ON public.user_activities 
FOR INSERT 
WITH CHECK (true);

-- Add admin role to user_role enum
ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'admin';

-- Add triggers for updated_at
CREATE TRIGGER update_documents_updated_at
BEFORE UPDATE ON public.documents
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to track user activities
CREATE OR REPLACE FUNCTION public.track_user_activity()
RETURNS TRIGGER AS $$
BEGIN
  -- Track different types of activities
  IF TG_TABLE_NAME = 'ideas' AND TG_OP = 'INSERT' THEN
    INSERT INTO public.user_activities (user_id, activity_type, idea_id)
    VALUES (NEW.submitted_by, 'idea_submitted', NEW.id);
  ELSIF TG_TABLE_NAME = 'comments' AND TG_OP = 'INSERT' THEN
    INSERT INTO public.user_activities (user_id, activity_type, idea_id)
    VALUES (NEW.user_id, 'comment_posted', NEW.idea_id);
  ELSIF TG_TABLE_NAME = 'votes' AND TG_OP = 'INSERT' THEN
    INSERT INTO public.user_activities (user_id, activity_type, idea_id)
    VALUES (NEW.user_id, 'vote_cast', NEW.idea_id);
  ELSIF TG_TABLE_NAME = 'evaluations' AND TG_OP = 'INSERT' THEN
    INSERT INTO public.user_activities (user_id, activity_type, idea_id)
    VALUES (NEW.user_id, 'evaluation_submitted', NEW.idea_id);
  ELSIF TG_TABLE_NAME = 'documents' AND TG_OP = 'INSERT' THEN
    INSERT INTO public.user_activities (user_id, activity_type, idea_id)
    VALUES (NEW.created_by, 'document_added', NEW.idea_id);
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create triggers for activity tracking
CREATE TRIGGER track_idea_activity
AFTER INSERT ON public.ideas
FOR EACH ROW EXECUTE FUNCTION public.track_user_activity();

CREATE TRIGGER track_comment_activity
AFTER INSERT ON public.comments
FOR EACH ROW EXECUTE FUNCTION public.track_user_activity();

CREATE TRIGGER track_vote_activity
AFTER INSERT ON public.votes
FOR EACH ROW EXECUTE FUNCTION public.track_user_activity();

CREATE TRIGGER track_evaluation_activity
AFTER INSERT ON public.evaluations
FOR EACH ROW EXECUTE FUNCTION public.track_user_activity();

CREATE TRIGGER track_document_activity
AFTER INSERT ON public.documents
FOR EACH ROW EXECUTE FUNCTION public.track_user_activity();

-- Create function to check if user is admin
CREATE OR REPLACE FUNCTION public.is_admin(user_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = user_id
    AND role = 'admin'
  )
$$;

-- Create function to update idea status (admin only)
CREATE OR REPLACE FUNCTION public.update_idea_status(
  p_idea_id UUID,
  p_new_status TEXT,
  p_reason TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  old_status TEXT;
BEGIN
  -- Check if user is admin
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Only administrators can update idea status';
  END IF;
  
  -- Get current status
  SELECT status INTO old_status
  FROM public.ideas
  WHERE id = p_idea_id;
  
  -- Update idea status
  UPDATE public.ideas
  SET status = p_new_status,
      updated_at = now()
  WHERE id = p_idea_id;
  
  -- Log transition
  INSERT INTO public.workflow_transitions (idea_id, from_status, to_status, reason, changed_by)
  VALUES (p_idea_id, old_status, p_new_status, p_reason, auth.uid());
END;
$$;