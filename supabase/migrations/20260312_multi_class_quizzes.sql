-- Migration: Multi-Class Quiz Assignment
-- This enables assigning a single quiz to multiple classes

-- 1. Create join table
CREATE TABLE IF NOT EXISTS public.quiz_classes (
    quiz_id UUID REFERENCES public.quizzes(id) ON DELETE CASCADE,
    class_id UUID REFERENCES public.classes(id) ON DELETE CASCADE,
    PRIMARY KEY (quiz_id, class_id)
);

-- 2. Migrate existing data from quizzes.class_id to quiz_classes
INSERT INTO public.quiz_classes (quiz_id, class_id)
SELECT id, class_id 
FROM public.quizzes 
WHERE class_id IS NOT NULL;

-- 3. RLS for quiz_classes
ALTER TABLE public.quiz_classes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Teachers can manage their quiz assignments" ON public.quiz_classes;
CREATE POLICY "Teachers can manage their quiz assignments"
    ON public.quiz_classes
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.quizzes 
            WHERE quizzes.id = quiz_classes.quiz_id 
            AND quizzes.teacher_id = auth.uid()
        )
    );

-- 4. Indexes for performance
CREATE INDEX IF NOT EXISTS idx_quiz_classes_quiz_id ON public.quiz_classes(quiz_id);
CREATE INDEX IF NOT EXISTS idx_quiz_classes_class_id ON public.quiz_classes(class_id);

-- Note: We keep public.quizzes.class_id for now to avoid breaking changes during transition, 
-- but it will be deprecated.
