-- Migration: Secure Scoring RPC
-- Esta función centraliza la lógica de validación de respuestas y asignación de puntos.

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
BEGIN
  -- 1. Validar estado de la sesión
  SELECT status, current_question_id, current_question_started_at 
  INTO v_session_status, v_current_question_id, v_started_at
  FROM public.sessions
  WHERE id = p_session_id;

  IF v_session_status != 'active' THEN
    RETURN jsonb_build_object('success', false, 'error', 'La sesión no está activa');
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
  ELSE
     v_is_correct := (lower(trim(p_answer_text)) = lower(trim(v_correct_answer)));
  END IF;

  -- 5. Cálculo de puntos (Velocidad)
  v_points_awarded := 0;
  IF v_is_correct THEN
    IF v_started_at IS NOT NULL THEN
      v_seconds_elapsed := extract(epoch from (now() - v_started_at));
      -- Puntos = Max * (1 - (tiempo / limite / 2)) -> Mínimo 50% de los puntos si es correcto
      v_points_awarded := round(v_max_points * (1 - least(v_seconds_elapsed / v_time_limit, 1.0) / 2));
    ELSE
      v_points_awarded := v_max_points;
    END IF;
  END IF;

  -- 6. Registrar respuesta
  INSERT INTO public.answers (participant_id, question_id, session_id, answer_text, is_correct, points_awarded)
  VALUES (p_participant_id, p_question_id, p_session_id, p_answer_text, v_is_correct, v_points_awarded);
  
  RETURN jsonb_build_object(
    'success', true, 
    'is_correct', v_is_correct, 
    'points_earned', v_points_awarded
  );
END;
$$;
