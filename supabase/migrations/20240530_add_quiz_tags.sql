-- Migration: Add tags to quizzes
-- This allows grouping quizzes into tabs

ALTER TABLE public.quizzes 
ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}';

-- Index for performance (optional, but good for filtering)
CREATE INDEX IF NOT EXISTS idx_quizzes_tags ON public.quizzes USING GIN (tags);

-- Comment for clarity
COMMENT ON COLUMN public.quizzes.tags IS 'Simple array of strings to categorize quizzes for the tabbed UI.';
