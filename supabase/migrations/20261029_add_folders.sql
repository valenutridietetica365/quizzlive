-- Migration: Add Folders management
-- This allows teachers to visually group their quizzes into folders

-- 1. Create Folders table
CREATE TABLE IF NOT EXISTS public.folders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    teacher_id UUID NOT NULL REFERENCES public.teachers(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    color TEXT DEFAULT '#3b82f6', -- Default blue color
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Add folder_id to quizzes
ALTER TABLE public.quizzes 
ADD COLUMN IF NOT EXISTS folder_id UUID REFERENCES public.folders(id) ON DELETE SET NULL;

-- 3. RLS for Folders
ALTER TABLE public.folders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Teachers can CRUD own folders" ON public.folders;
CREATE POLICY "Teachers can CRUD own folders" 
    ON public.folders FOR ALL 
    USING (auth.uid() = teacher_id);

-- 4. Indexes
CREATE INDEX IF NOT EXISTS idx_quizzes_folder_id ON public.quizzes(folder_id);
CREATE INDEX IF NOT EXISTS idx_folders_teacher_id ON public.folders(teacher_id);
