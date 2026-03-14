-- Migration: Enable Realtime for Scores Table
-- This is crucial for the mini-leaderboard to update instantly.

BEGIN;
  -- Ensure the table is part of the realtime publication
  -- Note: If it's already there, this might throw a warning but it's safe.
  -- To be clean, we can try to add it.
  DO $$
  BEGIN
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables 
      WHERE pubname = 'supabase_realtime' 
      AND schemaname = 'public' 
      AND tablename = 'scores'
    ) THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.scores;
    END IF;
  END $$;
COMMIT;
