-- Add new columns to meetings table for enhanced functionality
ALTER TABLE public.meetings 
ADD COLUMN action_items jsonb DEFAULT '[]'::jsonb,
ADD COLUMN session_feedback text,
ADD COLUMN meeting_time time,
ADD COLUMN status text DEFAULT 'scheduled';

-- Create meeting_notes table for collaborative notes
CREATE TABLE public.meeting_notes (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  meeting_id uuid NOT NULL REFERENCES public.meetings(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  content text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on meeting_notes
ALTER TABLE public.meeting_notes ENABLE ROW LEVEL SECURITY;

-- RLS policies for meeting_notes
CREATE POLICY "Users can view meeting notes in their groups" 
ON public.meeting_notes 
FOR SELECT 
USING (
  meeting_id IN (
    SELECT m.id FROM public.meetings m
    WHERE m.group_id IN (
      SELECT gm.group_id FROM public.group_members gm 
      WHERE gm.user_id = auth.uid()
    ) OR m.group_id IS NULL
  )
);

CREATE POLICY "Authenticated users can create meeting notes" 
ON public.meeting_notes 
FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can update their own meeting notes" 
ON public.meeting_notes 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own meeting notes" 
ON public.meeting_notes 
FOR DELETE 
USING (auth.uid() = user_id);

-- Add trigger for updated_at
CREATE TRIGGER update_meeting_notes_updated_at
BEFORE UPDATE ON public.meeting_notes
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Enhance profiles table
ALTER TABLE public.profiles 
ADD COLUMN first_name text,
ADD COLUMN last_name text,
ADD COLUMN phone text,
ADD COLUMN profile_photo_url text,
ADD COLUMN bio text,
ADD COLUMN expertise_tags text[],
ADD COLUMN skills text[];

-- Update existing profiles to split name into first_name and last_name
UPDATE public.profiles 
SET 
  first_name = SPLIT_PART(name, ' ', 1),
  last_name = CASE 
    WHEN ARRAY_LENGTH(STRING_TO_ARRAY(name, ' '), 1) > 1 
    THEN SUBSTRING(name FROM POSITION(' ' IN name) + 1)
    ELSE NULL
  END
WHERE name IS NOT NULL;