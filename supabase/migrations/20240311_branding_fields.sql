-- ============================================================
-- QuizzLive Database Hardening
-- Run this in your Supabase SQL Editor
-- ============================================================

-- 1. BRANDING FIELDS (for institutional customization)
ALTER TABLE public.teachers 
ADD COLUMN IF NOT EXISTS institution_name TEXT,
ADD COLUMN IF NOT EXISTS logo_url TEXT,
ADD COLUMN IF NOT EXISTS brand_color TEXT DEFAULT '#3b82f6',
ADD COLUMN IF NOT EXISTS signature_url TEXT;

-- 2. RESTRICT SCORE RLS (prevent direct score manipulation)
-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Anyone can update/insert scores" ON public.scores;

-- Only the submit_answer function (SECURITY DEFINER) and the 
-- update_participant_score trigger can modify scores now.
-- Teachers can still view scores via their existing SELECT policy.

-- 3. PERFORMANCE INDICES
-- Speed up report queries and session lookups
CREATE INDEX IF NOT EXISTS idx_answers_session_id ON public.answers(session_id);
CREATE INDEX IF NOT EXISTS idx_answers_participant_id ON public.answers(participant_id);
CREATE INDEX IF NOT EXISTS idx_participants_session_id ON public.participants(session_id);
CREATE INDEX IF NOT EXISTS idx_sessions_quiz_id ON public.sessions(quiz_id);
CREATE INDEX IF NOT EXISTS idx_sessions_status ON public.sessions(status);
CREATE INDEX IF NOT EXISTS idx_quizzes_teacher_id ON public.quizzes(teacher_id);

-- 4. TEACHER PROFILE UPDATE RLS
-- Allow teachers to update their own branding settings
DROP POLICY IF EXISTS "Teachers can update own profile" ON public.teachers;
CREATE POLICY "Teachers can update own profile"
    ON public.teachers FOR UPDATE
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

-- Verify changes
SELECT 'Hardening script completed successfully' AS status;
