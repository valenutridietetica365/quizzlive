-- Migration: Allow NULL for correct_answer
-- This is needed for matching questions and AI generated placeholders

ALTER TABLE public.questions ALTER COLUMN correct_answer DROP NOT NULL;
