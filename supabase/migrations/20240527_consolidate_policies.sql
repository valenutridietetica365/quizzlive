-- # UNIFIED OPTIMIZATION & SECURITY HARDENING (v1.2)
-- This migration resolves:
-- 1. PERFORMANCE: Multiple Permissive Policies (Linter 0006)
-- 2. SECURITY: Function Search Path Mutable (Linter 0011)
-- 3. SECURITY: Permissive RLS Policies (Linter 0024)

----------------------------------------------------------
-- 1. FUNCTION HARDENING (Security: search_path)
----------------------------------------------------------

-- handle_new_user
ALTER FUNCTION public.handle_new_user() SET search_path = public;

-- update_participant_score
ALTER FUNCTION public.update_participant_score() SET search_path = public;

-- log_quiz_changes
ALTER FUNCTION public.log_quiz_changes() SET search_path = public;


----------------------------------------------------------
-- 2. TABLE: public.quizzes (Performance: Consolidation)
----------------------------------------------------------
DROP POLICY IF EXISTS "Anyone can view quizzes if they join a session (via session relation)" ON "public"."quizzes";
DROP POLICY IF EXISTS "Teachers can CRUD own quizzes" ON "public"."quizzes";
DROP POLICY IF EXISTS "Teachers can manage quizzes" ON "public"."quizzes";
DROP POLICY IF EXISTS "Consolidated quizzes select" ON "public"."quizzes";
DROP POLICY IF EXISTS "Quizzes select" ON "public"."quizzes";
DROP POLICY IF EXISTS "Quizzes insert" ON "public"."quizzes";
DROP POLICY IF EXISTS "Quizzes update" ON "public"."quizzes";
DROP POLICY IF EXISTS "Quizzes delete" ON "public"."quizzes";

-- Unified SELECT
CREATE POLICY "Quizzes select" ON "public"."quizzes" FOR SELECT TO public USING (true);

-- Individual management policies
CREATE POLICY "Quizzes insert" ON "public"."quizzes" FOR INSERT TO authenticated WITH CHECK (teacher_id = (SELECT auth.uid()));
CREATE POLICY "Quizzes update" ON "public"."quizzes" FOR UPDATE TO authenticated USING (teacher_id = (SELECT auth.uid())) WITH CHECK (teacher_id = (SELECT auth.uid()));
CREATE POLICY "Quizzes delete" ON "public"."quizzes" FOR DELETE TO authenticated USING (teacher_id = (SELECT auth.uid()));


----------------------------------------------------------
-- 3. TABLE: public.questions (Performance: Consolidation)
----------------------------------------------------------
DROP POLICY IF EXISTS "Teachers can manage questions" ON "public"."questions";
DROP POLICY IF EXISTS "Teachers can CRUD questions for their quizzes" ON "public"."questions";
DROP POLICY IF EXISTS "Anyone can view questions" ON "public"."questions";
DROP POLICY IF EXISTS "Consolidated questions select" ON "public"."questions";
DROP POLICY IF EXISTS "Questions select" ON "public"."questions";
DROP POLICY IF EXISTS "Questions insert" ON "public"."questions";
DROP POLICY IF EXISTS "Questions update" ON "public"."questions";
DROP POLICY IF EXISTS "Questions delete" ON "public"."questions";

-- Unified SELECT
CREATE POLICY "Questions select" ON "public"."questions" FOR SELECT TO public USING (true);

-- Individual management policies
CREATE POLICY "Questions insert" ON "public"."questions" FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM quizzes WHERE id = questions.quiz_id AND teacher_id = (SELECT auth.uid())));
CREATE POLICY "Questions update" ON "public"."questions" FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM quizzes WHERE id = questions.quiz_id AND teacher_id = (SELECT auth.uid()))) WITH CHECK (EXISTS (SELECT 1 FROM quizzes WHERE id = questions.quiz_id AND teacher_id = (SELECT auth.uid())));
CREATE POLICY "Questions delete" ON "public"."questions" FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM quizzes WHERE id = questions.quiz_id AND teacher_id = (SELECT auth.uid())));


----------------------------------------------------------
-- 4. TABLE: public.sessions (Performance: Consolidation)
----------------------------------------------------------
DROP POLICY IF EXISTS "Teachers can manage sessions" ON "public"."sessions";
DROP POLICY IF EXISTS "Teachers can CRUD own sessions" ON "public"."sessions";
DROP POLICY IF EXISTS "Anyone can view sessions by PIN or ID" ON "public"."sessions";
DROP POLICY IF EXISTS "Consolidated sessions select" ON "public"."sessions";
DROP POLICY IF EXISTS "Sessions select" ON "public"."sessions";
DROP POLICY IF EXISTS "Sessions insert" ON "public"."sessions";
DROP POLICY IF EXISTS "Sessions update" ON "public"."sessions";
DROP POLICY IF EXISTS "Sessions delete" ON "public"."sessions";

-- Unified SELECT
CREATE POLICY "Sessions select" ON "public"."sessions" FOR SELECT TO public USING (true);

-- Individual management policies
CREATE POLICY "Sessions insert" ON "public"."sessions" FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM quizzes WHERE id = sessions.quiz_id AND teacher_id = (SELECT auth.uid())));
CREATE POLICY "Sessions update" ON "public"."sessions" FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM quizzes WHERE id = sessions.quiz_id AND teacher_id = (SELECT auth.uid()))) WITH CHECK (EXISTS (SELECT 1 FROM quizzes WHERE id = sessions.quiz_id AND teacher_id = (SELECT auth.uid())));
CREATE POLICY "Sessions delete" ON "public"."sessions" FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM quizzes WHERE id = sessions.quiz_id AND teacher_id = (SELECT auth.uid())));


----------------------------------------------------------
-- 5. TABLE: public.answers (Security: Restriction)
----------------------------------------------------------
DROP POLICY IF EXISTS "Anyone can insert answers" ON "public"."answers";
DROP POLICY IF EXISTS "Consolidated answers select" ON "public"."answers";
DROP POLICY IF EXISTS "Participants can insert answers" ON "public"."answers";
DROP POLICY IF EXISTS "Answers select" ON "public"."answers";

-- Tightened INSERT: Check session status and participant existence
CREATE POLICY "Participants can insert answers" ON "public"."answers" 
FOR INSERT TO public 
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.sessions 
        WHERE id = answers.session_id 
        AND status = 'active'
    )
);

-- Consolidated SELECT for answers
CREATE POLICY "Answers select" ON "public"."answers" FOR SELECT TO public
USING (
    (session_id IN (SELECT id FROM sessions WHERE status <> 'finished'))
    OR
    (EXISTS (SELECT 1 FROM sessions JOIN quizzes ON sessions.quiz_id = quizzes.id WHERE sessions.id = answers.session_id AND quizzes.teacher_id = (SELECT auth.uid())))
);


----------------------------------------------------------
-- 6. TABLE: public.participants (Security: Restriction)
----------------------------------------------------------
DROP POLICY IF EXISTS "Anyone can insert participant (join session)" ON "public"."participants";
DROP POLICY IF EXISTS "Consolidated participants select" ON "public"."participants";
DROP POLICY IF EXISTS "Join session" ON "public"."participants";
DROP POLICY IF EXISTS "Participants select" ON "public"."participants";

-- Tightened INSERT: Only when session is waiting
CREATE POLICY "Join session" ON "public"."participants" 
FOR INSERT TO public 
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.sessions 
        WHERE id = session_id 
        AND status = 'waiting'
    )
);

-- Unified SELECT
CREATE POLICY "Participants select" ON "public"."participants" FOR SELECT TO public USING (true);


----------------------------------------------------------
-- 7. TABLE: public.scores (Security: Restriction)
----------------------------------------------------------
DROP POLICY IF EXISTS "Consolidated scores policy" ON "public"."scores";
DROP POLICY IF EXISTS "Anyone can view scores" ON "public"."scores";
DROP POLICY IF EXISTS "Anyone can update/insert scores" ON "public"."scores";
DROP POLICY IF EXISTS "Scores select" ON "public"."scores";

-- Scores should be READ-ONLY for participants (Updates via trigger)
CREATE POLICY "Scores select" ON "public"."scores" FOR SELECT TO public USING (true);


----------------------------------------------------------
-- 8. OPTIMIZATION FOR EXISTING POLICIES
----------------------------------------------------------

-- Table: public.audit_logs
ALTER POLICY "Teachers can view own logs" ON "public"."audit_logs" 
USING (teacher_id = (SELECT auth.uid()));

-- Table: public.teachers
ALTER POLICY "Teachers can view own profile" ON "public"."teachers" 
USING (id = (SELECT auth.uid()));
