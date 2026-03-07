-- ==========================================
-- QUIZZLIVE: SQL HARDENING & SCHEMA SYNC
-- ==========================================
-- Ejecuta este script en el SQL EDITOR de Supabase para:
-- 1. Asegurar que existan las tablas de Clases y Folders.
-- 2. Implementar limpieza automática de sesiones antiguas.
-- 3. Optimizar índices para mejor rendimiento.
-- 4. Reforzar la seguridad (RLS).

-- ----------------------------------------------------------
-- 1. MISSING TABLES (Classes, Folders, Students)
-- ----------------------------------------------------------

-- Folders
CREATE TABLE IF NOT EXISTS public.folders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    teacher_id UUID NOT NULL REFERENCES public.teachers(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    color TEXT DEFAULT '#3b82f6',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Classes
CREATE TABLE IF NOT EXISTS public.classes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    teacher_id UUID NOT NULL REFERENCES public.teachers(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Students (Permanentes dentro de una clase)
CREATE TABLE IF NOT EXISTS public.students (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    email TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Link Quizzes to Classes/Folders (if not already there)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='quizzes' AND column_name='class_id') THEN
        ALTER TABLE public.quizzes ADD COLUMN class_id UUID REFERENCES public.classes(id) ON DELETE SET NULL;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='quizzes' AND column_name='folder_id') THEN
        ALTER TABLE public.quizzes ADD COLUMN folder_id UUID REFERENCES public.folders(id) ON DELETE SET NULL;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='quizzes' AND column_name='tags') THEN
        ALTER TABLE public.quizzes ADD COLUMN tags TEXT[] DEFAULT '{}';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='quizzes' AND column_name='game_mode') THEN
        ALTER TABLE public.quizzes ADD COLUMN game_mode TEXT DEFAULT 'classic';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='quizzes' AND column_name='config') THEN
        ALTER TABLE public.quizzes ADD COLUMN config JSONB DEFAULT '{}';
    END IF;
END $$;

-- Link Participants to Students (CRITICAL for Evolution Analytics)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='participants' AND column_name='student_id') THEN
        ALTER TABLE public.participants ADD COLUMN student_id UUID REFERENCES public.students(id) ON DELETE SET NULL;
    END IF;
END $$;

-- ----------------------------------------------------------
-- 2. PERFORMANCE INDICES
-- ----------------------------------------------------------

-- Búsqueda rápida de sesiones activas por PIN (Ya es UNIQUE pero esto ayuda a la visibilidad)
CREATE INDEX IF NOT EXISTS idx_sessions_pin_active ON public.sessions(pin) WHERE status != 'finished';

-- Búsqueda de historial por fecha
CREATE INDEX IF NOT EXISTS idx_sessions_finished_at ON public.sessions(finished_at) WHERE status = 'finished';

-- Filtros rápidos por profesor
CREATE INDEX IF NOT EXISTS idx_quizzes_teacher_id ON public.quizzes(teacher_id);
CREATE INDEX IF NOT EXISTS idx_classes_teacher_id ON public.classes(teacher_id);

-- Analytics & Evolution Indices
CREATE INDEX IF NOT EXISTS idx_participants_student_id ON public.participants(student_id);
CREATE INDEX IF NOT EXISTS idx_participants_session_id ON public.participants(session_id);
CREATE INDEX IF NOT EXISTS idx_answers_participant_id ON public.answers(participant_id);

-- ----------------------------------------------------------
-- 3. AUTO-CLEANUP (Maintenance)
-- ----------------------------------------------------------
-- Función para limpiar sesiones "húerfanas" o muy viejas para ahorrar espacio en el tier gratuito

CREATE OR REPLACE FUNCTION public.clean_old_sessions()
RETURNS VOID AS $$
BEGIN
    -- 1. Eliminar sesiones en espera 'waiting' de más de 24 horas (abandonadas)
    DELETE FROM public.sessions 
    WHERE status = 'waiting' 
    AND created_at < (now() - INTERVAL '24 hours');

    -- 2. Eliminar sesiones 'active' de más de 12 horas (sesiones que el profesor olvidó cerrar)
    DELETE FROM public.sessions 
    WHERE status = 'active' 
    AND created_at < (now() - INTERVAL '12 hours');

    -- 3. (Opcional) Las sesiones 'finished' se mantienen para el historial, el profesor las borra manualmente.
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ----------------------------------------------------------
-- 4. REINFORCED RLS POLICIES
-- ----------------------------------------------------------

-- Enable RLS for new tables
ALTER TABLE public.folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;

-- Folders Policies
DROP POLICY IF EXISTS "Profesor puede gestionar sus folders" ON public.folders;
CREATE POLICY "Profesor puede gestionar sus folders" ON public.folders 
    FOR ALL USING (auth.uid() = teacher_id);

-- Classes Policies
DROP POLICY IF EXISTS "Profesor puede gestionar sus clases" ON public.classes;
CREATE POLICY "Profesor puede gestionar sus clases" ON public.classes 
    FOR ALL USING (auth.uid() = teacher_id);

-- Students Policies
DROP POLICY IF EXISTS "Profesor puede gestionar alumnos de sus clases" ON public.students;
CREATE POLICY "Profesor puede gestionar alumnos de sus clases" ON public.students
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.classes 
            WHERE classes.id = students.class_id 
            AND classes.teacher_id = auth.uid()
        )
    );

-- Refuerzo en Sessions para que no cualquiera pueda ver TODO
DROP POLICY IF EXISTS "Anyone can view sessions by PIN or ID" ON public.sessions;
CREATE POLICY "Anyone can view sessions by PIN or ID"
    ON public.sessions FOR SELECT
    USING (status != 'finished' OR EXISTS (
        SELECT 1 FROM public.quizzes 
        WHERE quizzes.id = sessions.quiz_id 
        AND quizzes.teacher_id = auth.uid()
    ));

-- ----------------------------------------------------------
-- 5. NOTAS FINALES
-- ----------------------------------------------------------
-- Para automatizar la limpieza (clean_old_sessions), puedes usar pg_cron si está disponible 
-- o simplemente llamar a esta función desde una Edge Function cada vez que el profesor entra al dashboard.
