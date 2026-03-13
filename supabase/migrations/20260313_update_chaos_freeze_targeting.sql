-- Migración para actualizar la lógica de puntería de Chaos Mode (Caparazón Rojo)

CREATE OR REPLACE FUNCTION public.buy_powerup(
  p_session_id UUID,
  p_participant_id UUID,
  p_powerup_type TEXT -- 'shield', 'freeze', 'spy'
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

  -- Leer participante
  SELECT coins, COALESCE(has_shield, false) INTO v_coins, v_has_shield
  FROM public.participants
  WHERE id = p_participant_id AND session_id = p_session_id;

  IF v_coins IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Participante no encontrado');
  END IF;

  -- Validar fondos
  IF v_coins < v_cost THEN
    RETURN jsonb_build_object('success', false, 'error', 'Monedas insuficientes');
  END IF;

  -- Lógica específica por item
  IF p_powerup_type = 'shield' THEN
    IF v_has_shield THEN
      RETURN jsonb_build_object('success', false, 'error', 'Ya tienes un escudo activo');
    END IF;
    -- Aplicar escudo
    UPDATE public.participants 
    SET coins = coins - v_cost, has_shield = true 
    WHERE id = p_participant_id;

  ELSIF p_powerup_type = 'freeze' THEN
    -- Seleccionar objetivo: Inmediatamente superior en puntos (Caparazón rojo)
    WITH RankedScores AS (
      SELECT participant_id, 
             ROW_NUMBER() OVER(ORDER BY total_points DESC, updated_at ASC) as rank
      FROM public.scores
      WHERE session_id = p_session_id
    )
    SELECT r2.participant_id INTO v_target_id
    FROM RankedScores r1
    JOIN RankedScores r2 ON r2.rank = r1.rank - 1
    WHERE r1.participant_id = p_participant_id;
    
    -- Si es NULL (porque el jugador es el Top 1), entonces ataca al que va debajo de él (Top 2)
    IF v_target_id IS NULL THEN
      WITH RankedScores AS (
        SELECT participant_id, 
               ROW_NUMBER() OVER(ORDER BY total_points DESC, updated_at ASC) as rank
        FROM public.scores
        WHERE session_id = p_session_id
      )
      SELECT r2.participant_id INTO v_target_id
      FROM RankedScores r1
      JOIN RankedScores r2 ON r2.rank = r1.rank + 1
      WHERE r1.participant_id = p_participant_id;
    END IF;

    -- Si sigue siendo NULL, significa que no hay nadie más en la sala
    IF v_target_id IS NULL THEN
      RETURN jsonb_build_object('success', false, 'error', 'No hay suficientes rivales en la sala');
    END IF;

    -- Descontar monedas
    UPDATE public.participants 
    SET coins = coins - v_cost 
    WHERE id = p_participant_id;

  ELSIF p_powerup_type = 'spy' THEN
    UPDATE public.participants 
    SET coins = coins - v_cost 
    WHERE id = p_participant_id;
  END IF;

  RETURN jsonb_build_object(
    'success', true, 
    'powerup', p_powerup_type,
    'target_id', v_target_id,
    'remaining_coins', v_coins - v_cost
  );
END;
$$;
