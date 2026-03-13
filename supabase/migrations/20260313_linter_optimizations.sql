-- # UNIFIED LINTER OPTIMIZATIONS (2026-03-13)
-- Resolves Performance (0003, 0006) and Security (0011, 0024) warnings.

----------------------------------------------------------
-- 1. SECURITY: Function search_path hardening (Linter 0011)
----------------------------------------------------------
ALTER FUNCTION public.clean_old_sessions() SET search_path = public;
ALTER FUNCTION public.handle_new_user() SET search_path = public;
ALTER FUNCTION public.update_participant_score() SET search_path = public;

----------------------------------------------------------
-- 2. PERFORMANCE: Optimized RLS (Linter 0003: auth.uid() -> (select auth.uid()))
----------------------------------------------------------

-- Table: public.teachers
DROP POLICY IF EXISTS "Teachers can view own profile" ON public.teachers;
DROP POLICY IF EXISTS "Teachers can update own profile" ON public.teachers;
CREATE POLICY "Teachers can view own profile" ON public.teachers FOR SELECT USING (id = (select auth.uid()));
CREATE POLICY "Teachers can update own profile" ON public.teachers FOR UPDATE USING (id = (select auth.uid())) WITH CHECK (id = (select auth.uid()));

-- Table: public.quizzes
DROP POLICY IF EXISTS "Quizzes manage" ON public.quizzes;
DROP POLICY IF EXISTS "Teachers can CRUD own quizzes" ON public.quizzes;
CREATE POLICY "Teachers can CRUD own quizzes" ON public.quizzes FOR ALL TO authenticated 
    USING (teacher_id = (select auth.uid())) 
    WITH CHECK (teacher_id = (select auth.uid()));

-- Table: public.questions
DROP POLICY IF EXISTS "Teachers can CRUD questions for their quizzes" ON public.questions;
CREATE POLICY "Teachers can CRUD questions for their quizzes" ON public.questions FOR ALL TO authenticated 
    USING (EXISTS (SELECT 1 FROM public.quizzes WHERE quizzes.id = questions.quiz_id AND quizzes.teacher_id = (select auth.uid())))
    WITH CHECK (EXISTS (SELECT 1 FROM public.quizzes WHERE quizzes.id = questions.quiz_id AND quizzes.teacher_id = (select auth.uid())));

-- Table: public.sessions
DROP POLICY IF EXISTS "Teachers can CRUD own sessions" ON public.sessions;
CREATE POLICY "Teachers can CRUD own sessions" ON public.sessions FOR ALL TO authenticated 
    USING (EXISTS (SELECT 1 FROM public.quizzes WHERE quizzes.id = sessions.quiz_id AND quizzes.teacher_id = (select auth.uid())))
    WITH CHECK (EXISTS (SELECT 1 FROM public.quizzes WHERE quizzes.id = sessions.quiz_id AND quizzes.teacher_id = (select auth.uid())));

-- Table: public.participants
DROP POLICY IF EXISTS "Teachers can view participants of their sessions" ON public.participants;
CREATE POLICY "Teachers can view participants of their sessions" ON public.participants FOR SELECT TO authenticated 
    USING (EXISTS (SELECT 1 FROM public.sessions JOIN public.quizzes ON sessions.quiz_id = quizzes.id WHERE sessions.id = participants.session_id AND quizzes.teacher_id = (select auth.uid())));

-- Table: public.answers
DROP POLICY IF EXISTS "Teachers can view all answers for their sessions" ON public.answers;
CREATE POLICY "Teachers can view all answers for their sessions" ON public.answers FOR SELECT TO authenticated 
    USING (EXISTS (SELECT 1 FROM public.sessions JOIN public.quizzes ON sessions.quiz_id = quizzes.id WHERE sessions.id = answers.session_id AND quizzes.teacher_id = (select auth.uid())));

-- Table: public.quiz_classes
DROP POLICY IF EXISTS "Teachers can manage their quiz assignments" ON public.quiz_classes;
CREATE POLICY "Teachers can manage their quiz assignments" ON public.quiz_classes FOR ALL TO authenticated 
    USING (EXISTS (SELECT 1 FROM public.quizzes WHERE quizzes.id = quiz_classes.quiz_id AND quizzes.teacher_id = (select auth.uid())))
    WITH CHECK (EXISTS (SELECT 1 FROM public.quizzes WHERE quizzes.id = quiz_classes.quiz_id AND quizzes.teacher_id = (select auth.uid())));

----------------------------------------------------------
-- 3. CLEANUP: Multiple Permissive Policies & Always True (Linter 0006, 0024)
----------------------------------------------------------

-- Table: public.participants (Join Session)
DROP POLICY IF EXISTS "Anyone can insert participant (join session)" ON public.participants;
DROP POLICY IF EXISTS "Join session" ON public.participants;
CREATE POLICY "Join session" ON public.participants FOR INSERT TO public 
    WITH CHECK (EXISTS (SELECT 1 FROM public.sessions WHERE id = session_id AND status = 'waiting'));

-- Table: public.answers (Insert Answers)
DROP POLICY IF EXISTS "Anyone can insert answers" ON public.answers;
DROP POLICY IF EXISTS "Participants can insert answers" ON public.answers;
CREATE POLICY "Participants can insert answers" ON public.answers FOR INSERT TO public 
    WITH CHECK (EXISTS (SELECT 1 FROM public.sessions WHERE id = session_id AND status = 'active'));

-- Table: public.scores (Always True Fix)
DROP POLICY IF EXISTS "Anyone can update/insert scores" ON public.scores;
CREATE POLICY "Scores manage" ON public.scores FOR ALL TO public 
    USING (EXISTS (SELECT 1 FROM public.sessions WHERE sessions.id = scores.session_id AND sessions.status <> 'finished'))
    WITH CHECK (EXISTS (SELECT 1 FROM public.sessions WHERE sessions.id = scores.session_id AND sessions.status <> 'finished'));

-- Index cleanup
DROP INDEX IF EXISTS public.idx_scores_session_participant;

-- Optimizations applied.
