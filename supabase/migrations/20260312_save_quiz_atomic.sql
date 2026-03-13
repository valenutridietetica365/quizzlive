-- Migration: Atomic Quiz Saving
-- Replaces multiple client-side calls with a single transactional RPC

CREATE OR REPLACE FUNCTION public.save_quiz_with_questions(
    p_is_new BOOLEAN,
    p_quiz_id UUID,
    p_teacher_id UUID,
    p_title TEXT,
    p_tags TEXT[],
    p_folder_id UUID,
    p_class_ids UUID[],
    p_questions JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_quiz_id UUID;
    v_q RECORD;
    v_active_sessions INT;
BEGIN
    -- 1. Check for active sessions if updating
    IF NOT p_is_new AND p_quiz_id IS NOT NULL THEN
        SELECT count(*) INTO v_active_sessions
        FROM public.sessions
        WHERE quiz_id = p_quiz_id AND status IN ('waiting', 'active');

        IF v_active_sessions > 0 THEN
            RAISE EXCEPTION 'No se puede editar un cuestionario mientras hay una sesión activa o en espera.';
        END IF;
    END IF;

    -- 2. Update or Insert Quiz
    IF p_is_new THEN
        INSERT INTO public.quizzes (teacher_id, title, tags, folder_id)
        VALUES (p_teacher_id, p_title, p_tags, p_folder_id)
        RETURNING id INTO v_quiz_id;
    ELSE
        -- Ensure teacher owns the quiz
        UPDATE public.quizzes
        SET title = p_title,
            tags = p_tags,
            folder_id = p_folder_id
        WHERE id = p_quiz_id AND teacher_id = p_teacher_id
        RETURNING id INTO v_quiz_id;

        IF v_quiz_id IS NULL THEN
            RAISE EXCEPTION 'Quiz not found or unauthorized';
        END IF;

        -- Clean up old relations if updating
        DELETE FROM public.quiz_classes WHERE quiz_id = v_quiz_id;
        DELETE FROM public.questions WHERE quiz_id = v_quiz_id;
    END IF;

    -- 3. Insert Classes
    IF p_class_ids IS NOT NULL AND array_length(p_class_ids, 1) > 0 THEN
        INSERT INTO public.quiz_classes (quiz_id, class_id)
        SELECT v_quiz_id, unnest(p_class_ids);
    END IF;

    -- 4. Insert Questions
    -- Expected structure of p_questions: array of objects {question_text, question_type, options, correct_answer, time_limit, points, image_url}
    FOR v_q IN SELECT * FROM jsonb_to_recordset(p_questions) AS x(
        question_text TEXT,
        question_type TEXT,
        options JSONB,
        correct_answer TEXT,
        time_limit INT,
        points INT,
        image_url TEXT,
        sort_order INT
    ) LOOP
        INSERT INTO public.questions (
            quiz_id, question_text, question_type, options, correct_answer, time_limit, points, image_url, sort_order
        ) VALUES (
            v_quiz_id, v_q.question_text, v_q.question_type, v_q.options, v_q.correct_answer, 
            COALESCE(v_q.time_limit, 20), COALESCE(v_q.points, 1000), v_q.image_url, COALESCE(v_q.sort_order, 0)
        );
    END LOOP;

    RETURN jsonb_build_object('success', true, 'quiz_id', v_quiz_id);
END;
$$;
