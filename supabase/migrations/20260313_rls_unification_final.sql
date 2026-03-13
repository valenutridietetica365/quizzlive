-- # DEFINITIVE RLS CLEANUP & UNIFICATION (2026-03-13)
-- Resolves "Multiple Permissive Policies" (Linter 0006) by dropping all legacy names.

BEGIN;

----------------------------------------------------------
-- 0. SECURITY: Function search_path hardening
----------------------------------------------------------
ALTER FUNCTION public.clean_old_sessions() SET search_path = public;
ALTER FUNCTION public.handle_new_user() SET search_path = public;
ALTER FUNCTION public.update_participant_score() SET search_path = public;

----------------------------------------------------------
-- 1. TABLE: public.quizzes
----------------------------------------------------------
DROP POLICY IF EXISTS "Quizzes manage" ON public.quizzes;
DROP POLICY IF EXISTS "Quizzes select" ON public.quizzes;
DROP POLICY IF EXISTS "Quizzes insert" ON public.quizzes;
DROP POLICY IF EXISTS "Quizzes update" ON public.quizzes;
DROP POLICY IF EXISTS "Quizzes delete" ON public.quizzes;
DROP POLICY IF EXISTS "Teachers can CRUD own quizzes" ON public.quizzes;
DROP POLICY IF EXISTS "Anyone can view quizzes if they join a session (via session relation)" ON public.quizzes;

CREATE POLICY "Quizzes select" ON public.quizzes FOR SELECT TO public 
    USING (true);

CREATE POLICY "Quizzes manage" ON public.quizzes FOR ALL TO authenticated 
    USING (teacher_id = (select auth.uid())) 
    WITH CHECK (teacher_id = (select auth.uid()));


----------------------------------------------------------
-- 2. TABLE: public.questions
----------------------------------------------------------
DROP POLICY IF EXISTS "Questions select" ON public.questions;
DROP POLICY IF EXISTS "Questions insert" ON public.questions;
DROP POLICY IF EXISTS "Questions update" ON public.questions;
DROP POLICY IF EXISTS "Questions delete" ON public.questions;
DROP POLICY IF EXISTS "Anyone can view questions" ON public.questions;
DROP POLICY IF EXISTS "Teachers can CRUD questions for their quizzes" ON public.questions;

CREATE POLICY "Questions select" ON public.questions FOR SELECT TO public 
    USING (true);

CREATE POLICY "Questions manage" ON public.questions FOR ALL TO authenticated 
    USING (EXISTS (SELECT 1 FROM public.quizzes WHERE quizzes.id = questions.quiz_id AND quizzes.teacher_id = (select auth.uid())))
    WITH CHECK (EXISTS (SELECT 1 FROM public.quizzes WHERE quizzes.id = questions.quiz_id AND quizzes.teacher_id = (select auth.uid())));


----------------------------------------------------------
-- 3. TABLE: public.sessions
----------------------------------------------------------
DROP POLICY IF EXISTS "Sessions select" ON public.sessions;
DROP POLICY IF EXISTS "Sessions insert" ON public.sessions;
DROP POLICY IF EXISTS "Sessions update" ON public.sessions;
DROP POLICY IF EXISTS "Sessions delete" ON public.sessions;
DROP POLICY IF EXISTS "Anyone can view sessions by PIN or ID" ON public.sessions;
DROP POLICY IF EXISTS "Teachers can CRUD own sessions" ON public.sessions;

CREATE POLICY "Sessions select" ON public.sessions FOR SELECT TO public 
    USING (true);

CREATE POLICY "Sessions manage" ON public.sessions FOR ALL TO authenticated 
    USING (EXISTS (SELECT 1 FROM public.quizzes WHERE quizzes.id = sessions.quiz_id AND quizzes.teacher_id = (select auth.uid())))
    WITH CHECK (EXISTS (SELECT 1 FROM public.quizzes WHERE quizzes.id = sessions.quiz_id AND quizzes.teacher_id = (select auth.uid())));


----------------------------------------------------------
-- 4. TABLE: public.participants
----------------------------------------------------------
DROP POLICY IF EXISTS "Participants select" ON public.participants;
DROP POLICY IF EXISTS "Join session" ON public.participants;
DROP POLICY IF EXISTS "Anyone can insert participant (join session)" ON public.participants;
DROP POLICY IF EXISTS "Participants can view other participants in same session" ON public.participants;
DROP POLICY IF EXISTS "Teachers can view participants of their sessions" ON public.participants;

CREATE POLICY "Participants select" ON public.participants FOR SELECT TO public 
    USING (true);

CREATE POLICY "Participants insert" ON public.participants FOR INSERT TO public 
    WITH CHECK (EXISTS (SELECT 1 FROM public.sessions WHERE id = session_id AND status = 'waiting'));

CREATE POLICY "Teachers participants view" ON public.participants FOR SELECT TO authenticated 
    USING (EXISTS (SELECT 1 FROM public.sessions JOIN public.quizzes ON sessions.quiz_id = quizzes.id WHERE sessions.id = participants.session_id AND quizzes.teacher_id = (select auth.uid())));


----------------------------------------------------------
-- 5. TABLE: public.answers
----------------------------------------------------------
DROP POLICY IF EXISTS "Answers select" ON public.answers;
DROP POLICY IF EXISTS "Answers insert" ON public.answers;
DROP POLICY IF EXISTS "Participants can insert answers" ON public.answers;
DROP POLICY IF EXISTS "Anyone can insert answers" ON public.answers;
DROP POLICY IF EXISTS "Teachers can view all answers for their sessions" ON public.answers;
DROP POLICY IF EXISTS "Participants can view answers (for rankings)" ON public.answers;

CREATE POLICY "Answers select" ON public.answers FOR SELECT TO public 
    USING (
        (session_id IN (SELECT id FROM sessions WHERE status <> 'finished'))
        OR
        (EXISTS (SELECT 1 FROM sessions JOIN quizzes ON sessions.quiz_id = quizzes.id WHERE sessions.id = answers.session_id AND quizzes.teacher_id = (select auth.uid())))
    );

CREATE POLICY "Answers insert" ON public.answers FOR INSERT TO public 
    WITH CHECK (EXISTS (SELECT 1 FROM public.sessions WHERE id = session_id AND status = 'active'));


----------------------------------------------------------
-- 6. TABLE: public.scores
----------------------------------------------------------
DROP POLICY IF EXISTS "Scores select" ON public.scores;
DROP POLICY IF EXISTS "Scores manage" ON public.scores;
DROP POLICY IF EXISTS "Anyone can view scores" ON public.scores;
DROP POLICY IF EXISTS "Anyone can update/insert scores" ON public.scores;

CREATE POLICY "Scores select" ON public.scores FOR SELECT TO public 
    USING (true);

-- Manage: only during active sessions (updates usually via trigger but allowed for app logic)
CREATE POLICY "Scores manage" ON public.scores FOR ALL TO public 
    USING (EXISTS (SELECT 1 FROM public.sessions WHERE sessions.id = scores.session_id AND sessions.status <> 'finished'))
    WITH CHECK (EXISTS (SELECT 1 FROM public.sessions WHERE sessions.id = scores.session_id AND sessions.status <> 'finished'));

COMMIT;
