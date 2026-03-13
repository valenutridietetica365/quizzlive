-- # INDEX PERFORMANCE OPTIMIZATIONS (2026-03-13)
-- Resolves "Unindexed foreign keys" (Linter 0001) for improved query performance.

-- 1. Table: public.allowed_emails
CREATE INDEX IF NOT EXISTS idx_allowed_emails_created_by ON public.allowed_emails(created_by);

-- 2. Table: public.quizzes
CREATE INDEX IF NOT EXISTS idx_quizzes_class_id ON public.quizzes(class_id);

-- 3. Table: public.reactions
CREATE INDEX IF NOT EXISTS idx_reactions_participant_id ON public.reactions(participant_id);
CREATE INDEX IF NOT EXISTS idx_reactions_session_id ON public.reactions(session_id);

-- 4. Table: public.students
CREATE INDEX IF NOT EXISTS idx_students_class_id ON public.students(class_id);

-- Note: We are keeping the "unused indexes" for now as they are relevant for scale.
-- Summary: Added 5 covering indexes for foreign keys.
