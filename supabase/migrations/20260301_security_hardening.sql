-- Migration: Database Security Hardening
-- Addresses warnings from Supabase Linter

-- 1. Fix mutable search_path for assign_participant_team
-- This prevents potential search_path injection by pinning the function to the 'public' schema.
ALTER FUNCTION public.assign_participant_team() SET search_path = public;

-- 2. Refine RLS for reactions INSERT
-- Replaces 'WITH CHECK (true)' with a validation that the session exists and is active.
DROP POLICY IF EXISTS "Anyone can send reactions to a session" ON public.reactions;
CREATE POLICY "Anyone can send reactions to a session"
ON public.reactions FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.sessions 
    WHERE public.sessions.id = session_id 
    AND public.sessions.status = 'active'
  )
);
