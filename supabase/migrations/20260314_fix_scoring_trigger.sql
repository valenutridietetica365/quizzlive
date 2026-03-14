-- Migration: Fix Scoring Realtime Updates
-- This trigger ensures that the 'scores' table is always synchronized with the 'answers' table.

-- 1. Ensure the scores table has the correct structure
CREATE TABLE IF NOT EXISTS public.scores (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    participant_id UUID REFERENCES public.participants(id) ON DELETE CASCADE,
    session_id UUID REFERENCES public.sessions(id) ON DELETE CASCADE,
    total_points INT DEFAULT 0,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(participant_id, session_id)
);

-- 2. Create index for performance
CREATE INDEX IF NOT EXISTS idx_scores_session_participant ON public.scores(session_id, participant_id);

-- 3. Scoring Trigger Function
CREATE OR REPLACE FUNCTION public.update_participant_score()
RETURNS TRIGGER AS $$
BEGIN
    -- Only update if it's a correct answer or if points were awarded
    IF (NEW.points_awarded > 0) THEN
        INSERT INTO public.scores (participant_id, session_id, total_points, updated_at)
        VALUES (NEW.participant_id, NEW.session_id, NEW.points_awarded, now())
        ON CONFLICT (participant_id, session_id)
        DO UPDATE SET 
            total_points = public.scores.total_points + EXCLUDED.total_points,
            updated_at = now();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Attach Trigger to answers table
DROP TRIGGER IF EXISTS trigger_update_score ON public.answers;
CREATE TRIGGER trigger_update_score
AFTER INSERT ON public.answers
FOR EACH ROW EXECUTE FUNCTION public.update_participant_score();

-- 5. Backfill scores from existing answers (optional but recommended)
INSERT INTO public.scores (participant_id, session_id, total_points, updated_at)
SELECT participant_id, session_id, SUM(points_awarded), MAX(created_at)
FROM public.answers
GROUP BY participant_id, session_id
ON CONFLICT (participant_id, session_id)
DO UPDATE SET 
    total_points = EXCLUDED.total_points,
    updated_at = EXCLUDED.updated_at;
