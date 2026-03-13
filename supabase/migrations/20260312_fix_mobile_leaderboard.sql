-- Migration: Fix Leaderboard Visibility for Students
-- Ensures that students (anon users) can see scores and participants correctly.

-- 1. Ensure Scores are readable by everyone
DROP POLICY IF EXISTS "Scores select" ON public.scores;
CREATE POLICY "Scores select" ON public.scores 
FOR SELECT TO public 
USING (true);

-- 2. Ensure Participants are readable by everyone
DROP POLICY IF EXISTS "Participants select" ON public.participants;
CREATE POLICY "Participants select" ON public.participants 
FOR SELECT TO public 
USING (true);

-- 3. Ensure Realtime is enabled and filtering works
ALTER TABLE public.scores REPLICA IDENTITY FULL;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'scores') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE scores;
    END IF;
END $$;
