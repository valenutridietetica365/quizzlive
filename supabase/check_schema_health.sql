-- CHEQUEO DE SALUD DE LA BASE DE DATOS
-- Ejecuta esto para ver si falta alguna tabla o permiso

-- 1. ¿Existe la tabla de relación de clases? (Si esta falla, el Dashboard no carga nada)
SELECT count(*) FROM public.quiz_classes;

-- 2. ¿Tus cuestionarios tienen preguntas asociadas?
SELECT q.title, count(qs.id) as num_preguntas
FROM public.quizzes q
LEFT JOIN public.questions qs ON q.id = qs.quiz_id
WHERE q.teacher_id = '4d7d1ee7-584b-494b-af96-73047a183fec'
GROUP BY q.title;

-- 3. Verificación de RLS (Seguridad)
-- Asegura que los cuestionarios sean visibles
DROP POLICY IF EXISTS "Quizzes select" ON public.quizzes;
CREATE POLICY "Quizzes select" ON public.quizzes FOR SELECT TO public USING (true);
