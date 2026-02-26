-- Create reactions table for live interaction
CREATE TABLE IF NOT EXISTS public.reactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
    participant_id UUID REFERENCES public.participants(id) ON DELETE SET NULL,
    type TEXT NOT NULL, -- 'emoji' or 'text'
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.reactions ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Anyone can send reactions to a session"
ON public.reactions FOR INSERT
WITH CHECK (true);

CREATE POLICY "Anyone can view reactions from a session"
ON public.reactions FOR SELECT
USING (true);

-- Enable Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE reactions;
