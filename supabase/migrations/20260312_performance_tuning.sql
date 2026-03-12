-- Migration: Performance Tuning for Large Sessions
-- Adds indexes to optimize answer counting and participant lookups in classes of 50+ students.

-- 1. Optimize answer counting and filtering by session/participant
CREATE INDEX IF NOT EXISTS idx_answers_session_id_participant_id ON public.answers (session_id, participant_id);
CREATE INDEX IF NOT EXISTS idx_answers_participant_id ON public.answers (participant_id);

-- 2. Optimize participant lookup by session
CREATE INDEX IF NOT EXISTS idx_participants_session_id ON public.participants (session_id);
CREATE INDEX IF NOT EXISTS idx_participants_session_id_id ON public.participants (session_id, id);

-- 3. Optimize score lookups
CREATE INDEX IF NOT EXISTS idx_scores_participant_id ON public.scores (participant_id);
CREATE INDEX IF NOT EXISTS idx_scores_session_id_participant_id ON public.scores (session_id, participant_id);

-- 4. Optimize session filtering in dashboard
CREATE INDEX IF NOT EXISTS idx_sessions_status_created_at ON public.sessions (status, created_at DESC);

-- 5. Standardize indexes for multi-class lookups (if not already handled by FK)
CREATE INDEX IF NOT EXISTS idx_quiz_classes_quiz_id ON public.quiz_classes (quiz_id);
CREATE INDEX IF NOT EXISTS idx_quiz_classes_class_id ON public.quiz_classes (class_id);
