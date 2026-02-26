-- Migration: Add Students and performance tracking
-- This allows teachers to have fixed student lists per class

-- 1. Create Students table
CREATE TABLE IF NOT EXISTS public.students (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    email TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Add student_id to participants
-- This links an anonymous participant session to a fixed student profile
ALTER TABLE public.participants 
ADD COLUMN IF NOT EXISTS student_id UUID REFERENCES public.students(id) ON DELETE SET NULL;

-- 3. RLS for Students
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Teachers can CRUD students for their classes" ON public.students;
CREATE POLICY "Teachers can CRUD students for their classes" 
    ON public.students FOR ALL 
    USING (
        EXISTS (
            SELECT 1 FROM public.classes 
            WHERE classes.id = students.class_id 
            AND classes.teacher_id = auth.uid()
        )
    );

-- 4. Indexes for faster performance lookup
CREATE INDEX IF NOT EXISTS idx_students_class_id ON public.students(class_id);
CREATE INDEX IF NOT EXISTS idx_participants_student_id ON public.participants(student_id);
