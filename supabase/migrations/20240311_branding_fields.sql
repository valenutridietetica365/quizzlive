-- Execute this SQL in your Supabase SQL Editor to enable Institutional Branding

ALTER TABLE public.teachers 
ADD COLUMN IF NOT EXISTS institution_name TEXT,
ADD COLUMN IF NOT EXISTS logo_url TEXT,
ADD COLUMN IF NOT EXISTS brand_color TEXT DEFAULT '#3b82f6',
ADD COLUMN IF NOT EXISTS signature_url TEXT;

-- Verify columns
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'teachers';
