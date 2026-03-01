-- Migration: Enable Realtime for Scores
-- This allows the leaderboard to update instantly when points are awarded

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'scores') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE scores;
    END IF;
END $$;
