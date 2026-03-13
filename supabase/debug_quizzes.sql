-- DIAGNÓSTICO DE INTEGRIDAD DE QUIZZES
-- Copia y pega esto en el SQL Editor de Supabase

-- 1. Verificar tu ID de usuario autenticado
SELECT auth.uid() as mi_id_actual;

-- 2. Asegurar que tu perfil de profesor existe (Reparación Automática)
INSERT INTO public.teachers (id, email)
SELECT id, email FROM auth.users
WHERE id = auth.uid()
ON CONFLICT (id) DO NOTHING;

-- 3. Resumen de Quizzes en la base de datos (Global)
SELECT teacher_id, count(*) as total_quizzes
FROM public.quizzes 
GROUP BY teacher_id;

-- 4. Ver tus Quizzes específicos
SELECT id, title, created_at, teacher_id
FROM public.quizzes 
WHERE teacher_id = auth.uid()
ORDER BY created_at DESC;

-- 5. Verificar si las relaciones están rompiendo la consulta
SELECT q.id, q.title, count(qc.class_id) as asignaciones_clase
FROM public.quizzes q
LEFT JOIN public.quiz_classes qc ON q.id = qc.quiz_id
WHERE q.teacher_id = auth.uid()
GROUP BY q.id, q.title;
