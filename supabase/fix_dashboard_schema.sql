-- REPARACIÓN DEFINITIVA DEL ESQUEMA (DASHBOARD)
-- Ejecuta esto en el SQL Editor de Supabase para activar la visibilidad de tus quizzes.

-- 1. Asegurar columna de Etiquetas
ALTER TABLE public.quizzes ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}';

-- 2. Asegurar tabla de Carpetas
CREATE TABLE IF NOT EXISTS public.folders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    teacher_id UUID NOT NULL REFERENCES public.teachers(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    color TEXT DEFAULT '#3b82f6',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Asegurar columna de Carpeta en Quizzes
ALTER TABLE public.quizzes ADD COLUMN IF NOT EXISTS folder_id UUID REFERENCES public.folders(id) ON DELETE SET NULL;

-- 4. Asegurar tabla de Relación con Clases (Multi-Class)
CREATE TABLE IF NOT EXISTS public.quiz_classes (
    quiz_id UUID REFERENCES public.quizzes(id) ON DELETE CASCADE,
    class_id UUID REFERENCES public.classes(id) ON DELETE CASCADE,
    PRIMARY KEY (quiz_id, class_id)
);

-- 5. Asegurar políticas de seguridad para Carpetas
ALTER TABLE public.folders ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Teachers can CRUD own folders" ON public.folders;
CREATE POLICY "Teachers can CRUD own folders" ON public.folders FOR ALL USING (auth.uid() = teacher_id);

-- 6. Asegurar políticas de seguridad para Relación con Clases
ALTER TABLE public.quiz_classes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Teachers can manage their quiz assignments" ON public.quiz_classes;
CREATE POLICY "Teachers can manage their quiz assignments" ON public.quiz_classes FOR ALL USING (
    EXISTS (SELECT 1 FROM public.quizzes WHERE quizzes.id = quiz_classes.quiz_id AND quizzes.teacher_id = auth.uid())
);

-- 7. IMPORTANTE: Relax de restricción de respuesta (para nuevos tipos de quizzes)
ALTER TABLE public.questions ALTER COLUMN correct_answer DROP NOT NULL;

-- MENSAJE DE ÉXITO
RAISE NOTICE 'Esquema reparado exitosamente. Los quizzes deberían ser visibles ahora.';
