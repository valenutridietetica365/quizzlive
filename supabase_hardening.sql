-- ==========================================
-- QUIZZLIVE: SQL HARDENING & SCHEMA SYNC
-- ==========================================
-- Ejecuta este script en el SQL EDITOR de Supabase para:
-- 1. Asegurar que existan las tablas de Clases y Folders.
-- 2. Implementar limpieza automática de sesiones antiguas.
-- 3. Optimizar índices para mejor rendimiento.
-- 4. Reforzar la seguridad (RLS).
-- 5. RPC robusto para validación de respuestas (Ahorcado/MCQ).

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
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'game_mode_type') THEN
        CREATE TYPE public.game_mode_type AS ENUM ('classic', 'survival', 'teams', 'hangman', 'roulette');
    ELSE
        -- Ensure roulette exists in the enum if it was created before
        IF NOT EXISTS (SELECT 1 FROM pg_enum e JOIN pg_type t ON e.enumtypid = t.oid WHERE t.typname = 'game_mode_type' AND e.enumlabel = 'roulette') THEN
            ALTER TYPE public.game_mode_type ADD VALUE 'roulette';
        END IF;
    END IF;

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

-- Búsqueda rápida de sesiones activas por PIN
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
-- 3. REINFORCED RLS POLICIES
-- ----------------------------------------------------------

-- Enable RLS for tables
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

-- Refuerzo en Sessions
DROP POLICY IF EXISTS "Anyone can view sessions by PIN or ID" ON public.sessions;
CREATE POLICY "Anyone can view sessions by PIN or ID"
    ON public.sessions FOR SELECT
    USING (status != 'finished' OR EXISTS (
        SELECT 1 FROM public.quizzes 
        WHERE quizzes.id = sessions.quiz_id 
        AND quizzes.teacher_id = auth.uid()
    ));

-- ----------------------------------------------------------
-- 4. UTILS & RPC (Normalización y Validación)
-- ----------------------------------------------------------

-- Función para normalizar texto (Quita acentos, prefijos MCQ y puntuación)
CREATE OR REPLACE FUNCTION public.normalize_answer_text(text_to_normalize TEXT)
RETURNS TEXT AS $$
BEGIN
    -- 1. Convertir a minúsculas y quitar espacios
    text_to_normalize := lower(trim(text_to_normalize));
    
    -- 2. Quitar prefijos comunes (A), A), 1.-, etc.)
    text_to_normalize := regexp_replace(text_to_normalize, '^(?:[a-z0-9][.)\-:]+\s*)|^(?:\([a-z0-9]\)\s*)', '');
    
    -- 3. Quitar puntuación final (. , ; ! ?)
    text_to_normalize := regexp_replace(text_to_normalize, '[.;,!?]$', '');
    
    -- 4. Normalizar acentos
    text_to_normalize := translate(text_to_normalize, 'áéíóúüñ', 'aeiouun');
    
    RETURN trim(text_to_normalize);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- RPC Robusto para enviar respuestas
CREATE OR REPLACE FUNCTION public.submit_answer(
  p_session_id UUID,
  p_participant_id UUID,
  p_question_id UUID,
  p_answer_text TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_correct_answer TEXT;
  v_max_points INT;
  v_time_limit INT;
  v_is_correct BOOLEAN;
  v_points_awarded INT;
  v_session_status TEXT;
  v_current_question_id UUID;
  v_started_at TIMESTAMP WITH TIME ZONE;
  v_q_type TEXT;
  v_seconds_elapsed FLOAT;
  v_game_mode public.game_mode_type;
  v_is_eliminated BOOLEAN;
  v_current_streak INT;
BEGIN
  -- 1. Validar estado de la sesión y participante
  SELECT status, current_question_id, current_question_started_at, game_mode
  INTO v_session_status, v_current_question_id, v_started_at, v_game_mode
  FROM public.sessions
  WHERE id = p_session_id;

  SELECT is_eliminated, COALESCE(current_streak, 0) 
  INTO v_is_eliminated, v_current_streak
  FROM public.participants
  WHERE id = p_participant_id;

  IF v_session_status != 'active' THEN
    RETURN jsonb_build_object('success', false, 'error', 'La sesión no está activa');
  END IF;

  IF v_is_eliminated THEN
    RETURN jsonb_build_object('success', false, 'error', 'Has sido eliminado de esta sesión');
  END IF;

  IF v_current_question_id IS NULL OR v_current_question_id != p_question_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'Esta no es la pregunta actual');
  END IF;

  -- 2. Obtener datos de la pregunta
  SELECT question_type, correct_answer, points, time_limit 
  INTO v_q_type, v_correct_answer, v_max_points, v_time_limit
  FROM public.questions
  WHERE id = p_question_id;

  -- 3. Validar si ya respondió
  IF EXISTS (SELECT 1 FROM public.answers WHERE participant_id = p_participant_id AND question_id = p_question_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Ya has respondido esta pregunta');
  END IF;

  -- 4. Lógica de corrección Normalizada
  IF v_q_type = 'matching' THEN
     v_is_correct := (p_answer_text = v_correct_answer);
  ELSIF p_answer_text = '__HANGMAN_FAIL__' THEN
     v_is_correct := false;
  ELSE
     v_is_correct := (normalize_answer_text(p_answer_text) = normalize_answer_text(v_correct_answer));
  END IF;

  -- 5. Cálculo de puntos
  v_points_awarded := 0;
  IF v_is_correct THEN
    IF v_started_at IS NOT NULL THEN
      v_seconds_elapsed := extract(epoch from (now() - v_started_at));
      v_points_awarded := round(v_max_points * (1 - least(v_seconds_elapsed / v_time_limit, 1.0) / 2));
    ELSE
      v_points_awarded := v_max_points;
    END IF;
    v_current_streak := v_current_streak + 1;
  ELSE
    v_current_streak := 0;
  END IF;

  -- Actualizar racha
  UPDATE public.participants SET current_streak = v_current_streak WHERE id = p_participant_id;

  -- 6. Lógica de Supervivencia
  IF v_game_mode = 'survival' AND NOT v_is_correct THEN
    UPDATE public.participants SET is_eliminated = true WHERE id = p_participant_id;
  END IF;

  -- 7. Registrar respuesta
  INSERT INTO public.answers (participant_id, question_id, session_id, answer_text, is_correct, points_awarded)
  VALUES (p_participant_id, p_question_id, p_session_id, p_answer_text, v_is_correct, v_points_awarded);
  
  RETURN jsonb_build_object(
    'success', true, 
    'is_correct', v_is_correct, 
    'points_earned', v_points_awarded,
    'current_streak', v_current_streak,
    'eliminated', (v_game_mode = 'survival' AND NOT v_is_correct)
  );
END;
$$;

-- RPC para premiar puntos manualmente (Modo Ruleta)
CREATE OR REPLACE FUNCTION public.award_manual_points(
  p_session_id UUID,
  p_participant_id UUID,
  p_question_id UUID,
  p_points INT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Insertamos en la tabla de respuestas como una respuesta manual
  INSERT INTO public.answers (participant_id, question_id, session_id, answer_text, is_correct, points_awarded)
  VALUES (p_participant_id, p_question_id, p_session_id, 'MANUAL_ROULETTE', p_points > 0, p_points);

  -- Actualizamos el streak si los puntos > 0
  IF p_points > 0 THEN
    UPDATE public.participants 
    SET current_streak = COALESCE(current_streak, 0) + 1 
    WHERE id = p_participant_id;
  ELSE
    UPDATE public.participants SET current_streak = 0 WHERE id = p_participant_id;
  END IF;

  RETURN jsonb_build_object('success', true);
END;
$$;

-- ----------------------------------------------------------
-- 5. MANTENIMIENTO
-- ----------------------------------------------------------

CREATE OR REPLACE FUNCTION public.clean_old_sessions(days_old INT DEFAULT 30)
RETURNS VOID AS $$
BEGIN
    DELETE FROM public.sessions 
    WHERE status = 'finished' 
    AND finished_at < NOW() - (days_old || ' days')::INTERVAL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
