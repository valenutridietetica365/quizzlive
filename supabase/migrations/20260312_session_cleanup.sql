-- Migration: Automatic Session Cleanup
-- Deactivates sessions that have been "waiting" or "active" for more than 24 hours without updates

CREATE OR REPLACE FUNCTION public.cleanup_stale_sessions()
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_updated_count INT;
BEGIN
    UPDATE public.sessions
    SET status = 'finished',
        finished_at = NOW()
    WHERE status IN ('waiting', 'active')
      AND created_at < NOW() - INTERVAL '24 hours'
    RETURNING count(*) INTO v_updated_count;

    RETURN v_updated_count;
END;
$$;

-- Note: To automate this, the user should enable pg_cron in Supabase and run:
-- SELECT cron.schedule('cleanup-sessions', '0 * * * *', 'SELECT cleanup_stale_sessions()');
