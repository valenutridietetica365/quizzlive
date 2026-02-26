-- Migration: Add classes management
-- This allows teachers to organize students and quizzes into permanent groups

-- 1. Create Classes table
CREATE TABLE IF NOT EXISTS public.classes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    teacher_id UUID NOT NULL REFERENCES public.teachers(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Add class_id to quizzes
ALTER TABLE public.quizzes 
ADD COLUMN IF NOT EXISTS class_id UUID REFERENCES public.classes(id) ON DELETE SET NULL;

-- 3. RLS for Classes
ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Teachers can CRUD own classes" ON public.classes;
CREATE POLICY "Teachers can CRUD own classes" 
    ON public.classes FOR ALL 
    USING (auth.uid() = teacher_id);

-- 4. Indexes
CREATE INDEX IF NOT EXISTS idx_quizzes_class_id ON public.quizzes(class_id);
CREATE INDEX IF NOT EXISTS idx_classes_teacher_id ON public.classes(teacher_id);
