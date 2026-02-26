-- # PERFORMANCE: FOREIGN KEY INDEXING
-- This migration adds indexes to foreign key columns to improve join performance
-- and resolve "Unindexed foreign keys" (Linter 0001) warnings.

-- Table: public.answers
CREATE INDEX IF NOT EXISTS idx_answers_question_id ON public.answers(question_id);
CREATE INDEX IF NOT EXISTS idx_answers_session_id ON public.answers(session_id);

-- Table: public.audit_logs
CREATE INDEX IF NOT EXISTS idx_audit_logs_teacher_id ON public.audit_logs(teacher_id);

-- Table: public.questions
CREATE INDEX IF NOT EXISTS idx_questions_quiz_id ON public.questions(quiz_id);

-- Table: public.quizzes
CREATE INDEX IF NOT EXISTS idx_quizzes_teacher_id ON public.quizzes(teacher_id);

-- Table: public.scores
CREATE INDEX IF NOT EXISTS idx_scores_session_id ON public.scores(session_id);

-- Table: public.sessions
CREATE INDEX IF NOT EXISTS idx_sessions_quiz_id ON public.sessions(quiz_id);
CREATE INDEX IF NOT EXISTS idx_sessions_current_question_id ON public.sessions(current_question_id);
