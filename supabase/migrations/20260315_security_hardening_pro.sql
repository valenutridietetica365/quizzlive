-- ==========================================
-- MIGRATION: 20260315_security_hardening_pro.sql
-- DESCRIPTION: Moves scoring multipliers and power-up targeting to server-side.
-- ==========================================

-- 1. Actualizar submit_answer para incluir multiplicador de velocidad y bloqueo de concurrencia
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
  v_coins INT;
  v_has_shield BOOLEAN;
  v_coins_awarded INT := 0;
  v_shield_consumed BOOLEAN := false;
  v_speed_bonus BOOLEAN := false;
BEGIN
  -- Bloquear participante para evitar race conditions en monedas/racha
  -- Bloquear sesión para asegurar consistencia del tiempo de inicio
  SELECT status, current_question_id, current_question_started_at, game_mode
  INTO v_session_status, v_current_question_id, v_started_at, v_game_mode
  FROM public.sessions
  WHERE id = p_session_id
  FOR SHARE; -- Evita que el profesor cambie de pregunta mientras procesamos

  SELECT is_eliminated, COALESCE(current_streak, 0), COALESCE(coins, 0), COALESCE(has_shield, false)
  INTO v_is_eliminated, v_current_streak, v_coins, v_has_shield
  FROM public.participants
  WHERE id = p_participant_id
  FOR UPDATE; -- Bloqueo estricto para actualizar monedas/escudo

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
  ELSIF p_answer_text = '__HANGMAN_FAIL__' THEN
     v_is_correct := false;
  ELSE
     v_is_correct := (normalize_answer_text(p_answer_text) = normalize_answer_text(v_correct_answer));
  END IF;

  -- 5. Cálculo de puntos (Zero-Trust: Tiempo calculado SOLO en servidor)
  v_points_awarded := 0;
  IF v_is_correct THEN
    IF v_started_at IS NOT NULL THEN
      v_seconds_elapsed := extract(epoch from (now() - v_started_at));
      
      -- Penalización por tiempo (descenso lineal)
      v_points_awarded := round(v_max_points * (1 - least(v_seconds_elapsed / v_time_limit, 1.0) / 2));
      
      -- MULTIPLICADOR PRO: x2 si responde en menos de 3 segundos
      IF v_seconds_elapsed < 3.0 THEN
        v_points_awarded := v_points_awarded * 2;
        v_speed_bonus := true;
      END IF;
    ELSE
      v_points_awarded := v_max_points;
    END IF;
    
    -- Monedas y Racha
    v_current_streak := v_current_streak + 1;
    IF v_game_mode = 'chaos' THEN
      v_coins_awarded := 10 + LEAST(v_current_streak * 5, 50);
      v_coins := v_coins + v_coins_awarded;
    END IF;
  ELSE
    IF v_has_shield THEN
      v_shield_consumed := true;
      v_has_shield := false;
    ELSE
      v_current_streak := 0;
    END IF;
  END IF;

  -- 6. Actualizar participante
  UPDATE public.participants 
  SET 
    current_streak = v_current_streak,
    coins = v_coins,
    has_shield = v_has_shield,
    is_eliminated = CASE 
      WHEN v_game_mode = 'survival' AND NOT v_is_correct AND NOT v_shield_consumed THEN true 
      ELSE is_eliminated 
    END
  WHERE id = p_participant_id;

  -- 7. Registrar respuesta
  INSERT INTO public.answers (participant_id, question_id, session_id, answer_text, is_correct, points_awarded)
  VALUES (p_participant_id, p_question_id, p_session_id, p_answer_text, v_is_correct, v_points_awarded);
  
  RETURN jsonb_build_object(
    'success', true, 
    'is_correct', v_is_correct, 
    'points_earned', v_points_awarded,
    'current_streak', v_current_streak,
    'eliminated', v_is_eliminated,
    'coins_earned', v_coins_awarded,
    'coins_total', v_coins,
    'shield_consumed', v_shield_consumed,
    'speed_bonus', v_speed_bonus
  );
END;
$$;

-- 2. Actualizar buy_powerup para incluir selección de objetivo automática (Pro)
CREATE OR REPLACE FUNCTION public.buy_powerup(
  p_session_id UUID,
  p_participant_id UUID,
  p_powerup_type TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_coins INT;
  v_cost INT;
  v_has_shield BOOLEAN;
  v_target_id UUID := NULL;
BEGIN
  -- Validar Powerup y Coste
  IF p_powerup_type = 'shield' THEN v_cost := 30;
  ELSIF p_powerup_type = 'freeze' THEN v_cost := 50;
  ELSIF p_powerup_type = 'spy' THEN v_cost := 40;
  ELSE
    RETURN jsonb_build_object('success', false, 'error', 'Power-up inválido');
  END IF;

  -- Bloquear participante
  SELECT coins, COALESCE(has_shield, false) INTO v_coins, v_has_shield
  FROM public.participants
  WHERE id = p_participant_id AND session_id = p_session_id
  FOR UPDATE;

  IF v_coins IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Participante no encontrado');
  END IF;

  IF v_coins < v_cost THEN
    RETURN jsonb_build_object('success', false, 'error', 'Monedas insuficientes');
  END IF;

  -- Lógica de adquisición
  IF p_powerup_type = 'shield' THEN
    IF v_has_shield THEN
      RETURN jsonb_build_object('success', false, 'error', 'Ya tienes un escudo activo');
    END IF;
    UPDATE public.participants SET coins = coins - v_cost, has_shield = true WHERE id = p_participant_id;
    
  ELSIF p_powerup_type = 'freeze' THEN
    -- ZERO-TRUST: El servidor elige al objetivo (el Top 1 actual que NO sea el atacante)
    SELECT p.id INTO v_target_id
    FROM public.participants p
    JOIN public.scores s ON s.participant_id = p.id
    WHERE p.session_id = p_session_id 
      AND p.id != p_participant_id 
      AND p.is_eliminated = false
    ORDER BY s.total_points DESC
    LIMIT 1;

    IF v_target_id IS NULL THEN
      RETURN jsonb_build_object('success', false, 'error', 'No hay objetivos válidos para congelar');
    END IF;

    UPDATE public.participants SET coins = coins - v_cost WHERE id = p_participant_id;

  ELSIF p_powerup_type = 'spy' THEN
    -- El espía solo consume monedas, el frontend lo activa
    UPDATE public.participants SET coins = coins - v_cost WHERE id = p_participant_id;
  END IF;

  RETURN jsonb_build_object(
    'success', true, 
    'powerup', p_powerup_type,
    'remaining_coins', v_coins - v_cost,
    'target_id', v_target_id
  );
END;
$$;
