-- # DATABASE PERFORMANCE & RLS OPTIMIZATION (v1.3)
-- This migration resolves:
-- 1. PERFORMANCE: Auth RLS Initialization Plan (Linter 0003)
-- 2. PERFORMANCE: Multiple Permissive Policies (Linter 0006)

----------------------------------------------------------
-- 1. TABLE: public.classes
----------------------------------------------------------
DROP POLICY IF EXISTS "Public can read classes" ON public.classes;
DROP POLICY IF EXISTS "Teachers can CRUD own classes" ON public.classes;
DROP POLICY IF EXISTS "Classes select" ON public.classes;
DROP POLICY IF EXISTS "Classes insert" ON public.classes;
DROP POLICY IF EXISTS "Classes update" ON public.classes;
DROP POLICY IF EXISTS "Classes delete" ON public.classes;

-- Unified SELECT (allows teachers and potentially others to see classes)
CREATE POLICY "Classes select" ON public.classes FOR SELECT TO public USING (true);

-- Management policies (Teacher only)
CREATE POLICY "Classes insert" ON public.classes FOR INSERT TO authenticated WITH CHECK (teacher_id = (SELECT auth.uid()));
CREATE POLICY "Classes update" ON public.classes FOR UPDATE TO authenticated USING (teacher_id = (SELECT auth.uid())) WITH CHECK (teacher_id = (SELECT auth.uid()));
CREATE POLICY "Classes delete" ON public.classes FOR DELETE TO authenticated USING (teacher_id = (SELECT auth.uid()));


----------------------------------------------------------
-- 2. TABLE: public.folders
----------------------------------------------------------
DROP POLICY IF EXISTS "Teachers can CRUD own folders" ON public.folders;

-- Consolidated management (using subquery for performance)
CREATE POLICY "Folders manage" ON public.folders FOR ALL TO authenticated 
USING (teacher_id = (SELECT auth.uid()))
WITH CHECK (teacher_id = (SELECT auth.uid()));


----------------------------------------------------------
-- 3. TABLE: public.students
----------------------------------------------------------
DROP POLICY IF EXISTS "Public can read students" ON public.students;
DROP POLICY IF EXISTS "Teachers can CRUD students for their classes" ON public.students;
DROP POLICY IF EXISTS "Students select" ON public.students;
DROP POLICY IF EXISTS "Students insert" ON public.students;
DROP POLICY IF EXISTS "Students update" ON public.students;
DROP POLICY IF EXISTS "Students delete" ON public.students;

-- Unified SELECT
CREATE POLICY "Students select" ON public.students FOR SELECT TO public USING (true);

-- Management policies (Teacher only via class ownership)
CREATE POLICY "Students insert" ON public.students FOR INSERT TO authenticated 
WITH CHECK (EXISTS (SELECT 1 FROM public.classes WHERE classes.id = students.class_id AND classes.teacher_id = (SELECT auth.uid())));

CREATE POLICY "Students update" ON public.students FOR UPDATE TO authenticated 
USING (EXISTS (SELECT 1 FROM public.classes WHERE classes.id = students.class_id AND classes.teacher_id = (SELECT auth.uid())))
WITH CHECK (EXISTS (SELECT 1 FROM public.classes WHERE classes.id = students.class_id AND classes.teacher_id = (SELECT auth.uid())));

CREATE POLICY "Students delete" ON public.students FOR DELETE TO authenticated 
USING (EXISTS (SELECT 1 FROM public.classes WHERE classes.id = students.class_id AND classes.teacher_id = (SELECT auth.uid())));
