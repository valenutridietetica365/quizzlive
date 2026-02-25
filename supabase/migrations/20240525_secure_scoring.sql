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
  v_points INT;
  v_is_correct BOOLEAN;
  v_points_awarded INT;
  v_session_status TEXT;
  v_current_question_id UUID;
  v_q_type TEXT;
BEGIN
  -- 1. Validar estado de la sesión
  SELECT status, current_question_id INTO v_session_status, v_current_question_id
  FROM public.sessions
  WHERE id = p_session_id;

  IF v_session_status != 'active' THEN
    RETURN jsonb_build_object('success', false, 'error', 'La sesión no está activa');
  END IF;

  IF v_current_question_id != p_question_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'Esta no es la pregunta actual');
  END IF;

  -- 2. Obtener datos de la pregunta
  SELECT question_type, correct_answer, points INTO v_q_type, v_correct_answer, v_points
  FROM public.questions
  WHERE id = p_question_id;

  -- 3. Lógica de validación según tipo
  IF v_q_type = 'matching' THEN
     -- En matching, el cliente envía un string ordenado o similar. 
     -- Por ahora mantenemos la lógica de comparación exacta para MATCHING_MODE
     -- pero permitimos flexibilidad en el futuro.
     v_is_correct := (p_answer_text = v_correct_answer);
  ELSE
     v_is_correct := (lower(trim(p_answer_text)) = lower(trim(v_correct_answer)));
  END IF;

  v_points_awarded := CASE WHEN v_is_correct THEN v_points ELSE 0 END;

  -- 4. Registrar respuesta (ignorar repetidos por índice UNIQUE)
  INSERT INTO public.answers (participant_id, question_id, session_id, answer_text, is_correct, points_awarded)
  VALUES (p_participant_id, p_question_id, p_session_id, p_answer_text, v_is_correct, v_points_awarded)
  ON CONFLICT (participant_id, question_id) DO NOTHING;
  
  -- Nota: El trigger 'on_answer_inserted' en la tabla 'answers' 
  -- se encargará de actualizar la tabla 'scores' automáticamente.

  RETURN jsonb_build_object(
    'success', true, 
    'is_correct', v_is_correct, 
    'points_earned', v_points_awarded
  );
END;
$$;
