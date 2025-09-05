-- 1) Create a sequence for generating short incremental numbers used in idea_code
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'idea_code_seq') THEN
    CREATE SEQUENCE public.idea_code_seq START 1001 INCREMENT 1;
  END IF;
END $$;

-- 2) Add columns to ideas: idea_code (unique short code) and drive_folder_id
ALTER TABLE public.ideas
  ADD COLUMN IF NOT EXISTS idea_code text,
  ADD COLUMN IF NOT EXISTS drive_folder_id text;

-- 3) Backfill idea_code for existing rows using sequence + MMDD pattern
UPDATE public.ideas
SET idea_code = COALESCE(
  idea_code,
  'ID' || to_char(now(), 'MMDD') || '-' || lpad(nextval('public.idea_code_seq')::text, 4, '0')
);

-- 4) Set default for future inserts and enforce NOT NULL + uniqueness
ALTER TABLE public.ideas
  ALTER COLUMN idea_code SET DEFAULT ('ID' || to_char(now(), 'MMDD') || '-' || lpad(nextval('public.idea_code_seq')::text, 4, '0')),
  ALTER COLUMN idea_code SET NOT NULL;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ideas_idea_code_key'
  ) THEN
    ALTER TABLE public.ideas ADD CONSTRAINT ideas_idea_code_key UNIQUE (idea_code);
  END IF;
END $$;

-- 5) Add FKs to enable PostgREST relationships used in UI joins
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'documents_created_by_fkey'
  ) THEN
    ALTER TABLE public.documents
      ADD CONSTRAINT documents_created_by_fkey
      FOREIGN KEY (created_by)
      REFERENCES public.profiles(id)
      ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'workflow_transitions_changed_by_fkey'
  ) THEN
    ALTER TABLE public.workflow_transitions
      ADD CONSTRAINT workflow_transitions_changed_by_fkey
      FOREIGN KEY (changed_by)
      REFERENCES public.profiles(id)
      ON DELETE CASCADE;
  END IF;
END $$;

-- 6) Helpful indexes
CREATE INDEX IF NOT EXISTS idx_documents_idea_id_created_at ON public.documents (idea_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_workflow_transitions_idea_id_created_at ON public.workflow_transitions (idea_id, created_at DESC);
