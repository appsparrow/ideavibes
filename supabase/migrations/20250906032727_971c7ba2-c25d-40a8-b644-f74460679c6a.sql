-- Update idea sectors to include comprehensive business sectors
-- First drop the existing enum and recreate with new values
ALTER TYPE public.idea_sector RENAME TO idea_sector_old;

CREATE TYPE public.idea_sector AS ENUM (
  'technology',
  'healthcare', 
  'finance',
  'education',
  'manufacturing',
  'retail',
  'agriculture',
  'energy',
  'transportation',
  'real_estate',
  'entertainment'
);

-- Update the ideas table to use the new enum
ALTER TABLE public.ideas 
  ALTER COLUMN sector DROP DEFAULT,
  ALTER COLUMN sector TYPE public.idea_sector USING 
    CASE 
      WHEN sector::text = 'healthcare' THEN 'healthcare'::public.idea_sector
      WHEN sector::text = 'real_estate' THEN 'real_estate'::public.idea_sector
      ELSE 'technology'::public.idea_sector
    END,
  ALTER COLUMN sector SET DEFAULT 'technology'::public.idea_sector;

-- Drop the old enum type
DROP TYPE public.idea_sector_old;

-- Create groups table for team/workspace functionality
CREATE TABLE public.groups (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  created_by UUID NOT NULL,
  invite_code TEXT NOT NULL UNIQUE DEFAULT CONCAT('GRP-', UPPER(SUBSTRING(gen_random_uuid()::text, 1, 8))),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create group_members table for membership management
CREATE TABLE public.group_members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('member', 'admin')),
  joined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(group_id, user_id)
);

-- Add group_id to ideas table to scope ideas to groups
ALTER TABLE public.ideas 
ADD COLUMN group_id UUID REFERENCES public.groups(id) ON DELETE CASCADE;

-- Add group_id to other tables that should be group-scoped
ALTER TABLE public.meetings 
ADD COLUMN group_id UUID REFERENCES public.groups(id) ON DELETE CASCADE;

-- Enable RLS on new tables
ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_members ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for groups
CREATE POLICY "Users can view groups they belong to" 
ON public.groups 
FOR SELECT 
USING (
  id IN (
    SELECT group_id 
    FROM public.group_members 
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can create groups" 
ON public.groups 
FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL AND created_by = auth.uid());

CREATE POLICY "Group admins can update groups" 
ON public.groups 
FOR UPDATE 
USING (
  id IN (
    SELECT group_id 
    FROM public.group_members 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- Create RLS policies for group_members
CREATE POLICY "Users can view group members for their groups" 
ON public.group_members 
FOR SELECT 
USING (
  group_id IN (
    SELECT group_id 
    FROM public.group_members 
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Group admins can manage members" 
ON public.group_members 
FOR ALL 
USING (
  group_id IN (
    SELECT group_id 
    FROM public.group_members 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

CREATE POLICY "Users can join groups via invite" 
ON public.group_members 
FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL AND user_id = auth.uid());

-- Update existing RLS policies to be group-scoped
-- Ideas should only be visible within the same group
DROP POLICY "Anyone can view ideas" ON public.ideas;
CREATE POLICY "Users can view ideas in their groups" 
ON public.ideas 
FOR SELECT 
USING (
  group_id IN (
    SELECT group_id 
    FROM public.group_members 
    WHERE user_id = auth.uid()
  ) OR group_id IS NULL -- Allow viewing ungrouped ideas during migration
);

-- Comments should be group-scoped through ideas
DROP POLICY "Anyone can view comments" ON public.comments;
CREATE POLICY "Users can view comments in their groups" 
ON public.comments 
FOR SELECT 
USING (
  idea_id IN (
    SELECT i.id 
    FROM public.ideas i
    JOIN public.group_members gm ON i.group_id = gm.group_id
    WHERE gm.user_id = auth.uid()
  ) OR idea_id IN (
    SELECT id FROM public.ideas WHERE group_id IS NULL -- Migration compatibility
  )
);

-- Votes should be group-scoped through ideas
DROP POLICY "Anyone can view votes" ON public.votes;
CREATE POLICY "Users can view votes in their groups" 
ON public.votes 
FOR SELECT 
USING (
  idea_id IN (
    SELECT i.id 
    FROM public.ideas i
    JOIN public.group_members gm ON i.group_id = gm.group_id
    WHERE gm.user_id = auth.uid()
  ) OR idea_id IN (
    SELECT id FROM public.ideas WHERE group_id IS NULL -- Migration compatibility
  )
);

-- Create functions for group management
CREATE OR REPLACE FUNCTION public.join_group_by_invite_code(invite_code_param TEXT)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  group_record groups%ROWTYPE;
  result jsonb;
BEGIN
  -- Find the group by invite code
  SELECT * INTO group_record
  FROM public.groups
  WHERE invite_code = invite_code_param;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid invite code');
  END IF;
  
  -- Add user to group (INSERT will fail if already a member due to unique constraint)
  BEGIN
    INSERT INTO public.group_members (group_id, user_id, role)
    VALUES (group_record.id, auth.uid(), 'member');
    
    RETURN jsonb_build_object(
      'success', true, 
      'group_id', group_record.id,
      'group_name', group_record.name
    );
  EXCEPTION WHEN unique_violation THEN
    RETURN jsonb_build_object('success', false, 'error', 'Already a member of this group');
  END;
END;
$$;

-- Create trigger for updating timestamps
CREATE TRIGGER update_groups_updated_at
BEFORE UPDATE ON public.groups
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();