-- Migration: Add New Game Modes
-- This adds the necessary columns to sessions and participants to support Survival, Teams, and Hangman modes

-- 1. Add game_mode and config to sessions
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'game_mode_type') THEN
        CREATE TYPE public.game_mode_type AS ENUM ('classic', 'survival', 'teams', 'hangman');
    END IF;
END $$;

ALTER TABLE public.sessions 
ADD COLUMN IF NOT EXISTS game_mode public.game_mode_type DEFAULT 'classic',
ADD COLUMN IF NOT EXISTS config JSONB DEFAULT '{}'::jsonb;

-- 2. Add team and is_eliminated to participants
ALTER TABLE public.participants 
ADD COLUMN IF NOT EXISTS team TEXT,
ADD COLUMN IF NOT EXISTS is_eliminated BOOLEAN DEFAULT false;

-- 3. Update submit_answer logic for Survival and Teams
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
BEGIN
  -- 1. Validar estado de la sesión y participante
  SELECT status, current_question_id, current_question_started_at, game_mode
  INTO v_session_status, v_current_question_id, v_started_at, v_game_mode
  FROM public.sessions
  WHERE id = p_session_id;

  SELECT is_eliminated INTO v_is_eliminated
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

  -- 4. Lógica de corrección
  IF v_q_type = 'matching' THEN
     v_is_correct := (p_answer_text = v_correct_answer);
  ELSIF v_q_type = 'hangman' THEN
     -- Por ahora la lógica de hangman se manejará principalmente en el cliente, 
     -- pero aquí comparamos la palabra final enviada
     v_is_correct := (lower(trim(p_answer_text)) = lower(trim(v_correct_answer)));
  ELSE
     v_is_correct := (lower(trim(p_answer_text)) = lower(trim(v_correct_answer)));
  END IF;

  -- 5. Cálculo de puntos (Velocidad)
  v_points_awarded := 0;
  IF v_is_correct THEN
    IF v_started_at IS NOT NULL THEN
      v_seconds_elapsed := extract(epoch from (now() - v_started_at));
      v_points_awarded := round(v_max_points * (1 - least(v_seconds_elapsed / v_time_limit, 1.0) / 2));
    ELSE
      v_points_awarded := v_max_points;
    END IF;
  END IF;

  -- 6. Lógica de Supervivencia: Si falla, queda eliminado
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
    'eliminated', (v_game_mode = 'survival' AND NOT v_is_correct)
  );
END;
$$;

-- 4. Trigger for automatic team assignment
CREATE OR REPLACE FUNCTION public.assign_participant_team()
RETURNS TRIGGER AS $$
DECLARE
    v_game_mode public.game_mode_type;
    v_total_participants INT;
BEGIN
    SELECT game_mode INTO v_game_mode FROM public.sessions WHERE id = NEW.session_id;
    
    IF v_game_mode = 'teams' THEN
        SELECT COUNT(*) INTO v_total_participants FROM public.participants WHERE session_id = NEW.session_id;
        IF (v_total_participants % 2) = 0 THEN
            NEW.team := 'Equipo Azul';
        ELSE
            NEW.team := 'Equipo Rojo';
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_assign_team ON public.participants;
CREATE TRIGGER trigger_assign_team
BEFORE INSERT ON public.participants
FOR EACH ROW EXECUTE FUNCTION public.assign_participant_team();
