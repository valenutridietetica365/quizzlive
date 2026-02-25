-- Supabase Schema for Kahoot-like Quiz Platform (Idempotent Version)

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

----------------------------------------------------------
-- 1. TABLES
----------------------------------------------------------

-- Teachers (extends auth.users)
CREATE TABLE IF NOT EXISTS public.teachers (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Quizzes
CREATE TABLE IF NOT EXISTS public.quizzes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    teacher_id UUID NOT NULL REFERENCES public.teachers(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Questions
-- type can be: 'multiple_choice', 'true_false', 'short_answer'
CREATE TABLE IF NOT EXISTS public.questions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    quiz_id UUID NOT NULL REFERENCES public.quizzes(id) ON DELETE CASCADE,
    question_text TEXT NOT NULL,
    question_type TEXT NOT NULL DEFAULT 'multiple_choice',
    options JSONB, -- Array of strings for choices
    correct_answer TEXT NOT NULL,
    time_limit INT NOT NULL DEFAULT 20, -- seconds
    points INT NOT NULL DEFAULT 1000,
    image_url TEXT,
    sort_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Sessions (Active game instances)
-- status can be: 'waiting', 'active', 'finished'
CREATE TABLE IF NOT EXISTS public.sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    quiz_id UUID NOT NULL REFERENCES public.quizzes(id) ON DELETE CASCADE,
    pin VARCHAR(6) UNIQUE NOT NULL,
    status TEXT NOT NULL DEFAULT 'waiting',
    current_question_id UUID REFERENCES public.questions(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    started_at TIMESTAMP WITH TIME ZONE,
    finished_at TIMESTAMP WITH TIME ZONE
);

-- Participants (Students who join a session)
CREATE TABLE IF NOT EXISTS public.participants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
    nickname TEXT NOT NULL,
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(session_id, nickname) -- Prevent duplicate nicknames in the same session
);

-- Answers (Student submissions)
CREATE TABLE IF NOT EXISTS public.answers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    participant_id UUID NOT NULL REFERENCES public.participants(id) ON DELETE CASCADE,
    question_id UUID NOT NULL REFERENCES public.questions(id) ON DELETE CASCADE,
    session_id UUID NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
    answer_text TEXT NOT NULL,
    is_correct BOOLEAN NOT NULL DEFAULT FALSE,
    points_awarded INT NOT NULL DEFAULT 0,
    answered_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(participant_id, question_id) -- Only one answer per question per participant
);

-- Scores (Aggregated scores per participant per session)
CREATE TABLE IF NOT EXISTS public.scores (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    participant_id UUID NOT NULL REFERENCES public.participants(id) ON DELETE CASCADE,
    session_id UUID NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
    total_points INT NOT NULL DEFAULT 0,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(participant_id, session_id)
);

----------------------------------------------------------
-- 2. REALTIME CONFIGURATION
----------------------------------------------------------
-- Enable Realtime for tables that need to be broadcasted
-- Note: 'ALTER PUBLICATION' can fail if already added, we wrap in DO block to be safe
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'sessions') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE sessions;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'participants') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE participants;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'answers') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE answers;
    END IF;
END $$;

----------------------------------------------------------
-- 3. ROW LEVEL SECURITY (RLS)
----------------------------------------------------------

ALTER TABLE public.teachers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scores ENABLE ROW LEVEL SECURITY;

-- Drop existing policies before creating to avoid "already exists" errors
DROP POLICY IF EXISTS "Teachers can view own profile" ON public.teachers;
CREATE POLICY "Teachers can view own profile" 
    ON public.teachers FOR SELECT 
    USING (auth.uid() = id);

-- Quizzes: Owner can do anything, others can only view if there is a session
DROP POLICY IF EXISTS "Teachers can CRUD own quizzes" ON public.quizzes;
CREATE POLICY "Teachers can CRUD own quizzes" 
    ON public.quizzes FOR ALL 
    USING (auth.uid() = teacher_id);

DROP POLICY IF EXISTS "Anyone can view quizzes if they join a session (via session relation)" ON public.quizzes;
CREATE POLICY "Anyone can view quizzes if they join a session (via session relation)"
    ON public.quizzes FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.sessions 
            WHERE sessions.quiz_id = quizzes.id
        )
    );

-- Questions: Owner can do anything, others can only view if there is a session
DROP POLICY IF EXISTS "Teachers can CRUD questions for their quizzes" ON public.questions;
CREATE POLICY "Teachers can CRUD questions for their quizzes" 
    ON public.questions FOR ALL 
    USING (
        EXISTS (
            SELECT 1 FROM public.quizzes 
            WHERE quizzes.id = questions.quiz_id 
            AND quizzes.teacher_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Anyone can view questions" ON public.questions;
CREATE POLICY "Anyone can view questions"
    ON public.questions FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.sessions 
            WHERE sessions.quiz_id = questions.quiz_id
        )
    );

-- Sessions: Anyone can search for a session (by PIN), but only teacher can manage
DROP POLICY IF EXISTS "Teachers can CRUD own sessions" ON public.sessions;
CREATE POLICY "Teachers can CRUD own sessions" 
    ON public.sessions FOR ALL 
    USING (
        EXISTS (
            SELECT 1 FROM public.quizzes 
            WHERE quizzes.id = sessions.quiz_id 
            AND quizzes.teacher_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Anyone can view sessions by PIN or ID" ON public.sessions;
CREATE POLICY "Anyone can view sessions by PIN or ID"
    ON public.sessions FOR SELECT
    USING (true);

-- Participants: Teacher can see all, students can see others in same session
DROP POLICY IF EXISTS "Teachers can view participants of their sessions" ON public.participants;
CREATE POLICY "Teachers can view participants of their sessions" 
    ON public.participants FOR SELECT 
    USING (
        EXISTS (
            SELECT 1 FROM public.sessions
            JOIN public.quizzes ON sessions.quiz_id = quizzes.id
            WHERE sessions.id = participants.session_id
            AND quizzes.teacher_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Anyone can insert participant (join session)" ON public.participants;
CREATE POLICY "Anyone can insert participant (join session)"
    ON public.participants FOR INSERT
    WITH CHECK (true);

DROP POLICY IF EXISTS "Participants can view other participants in same session" ON public.participants;
CREATE POLICY "Participants can view other participants in same session"
    ON public.participants FOR SELECT
    USING (true);

-- Answers: Teacher can see all, participants can only insert
DROP POLICY IF EXISTS "Teachers can view all answers for their sessions" ON public.answers;
CREATE POLICY "Teachers can view all answers for their sessions" 
    ON public.answers FOR SELECT 
    USING (
        EXISTS (
            SELECT 1 FROM public.sessions
            JOIN public.quizzes ON sessions.quiz_id = quizzes.id
            WHERE sessions.id = answers.session_id
            AND quizzes.teacher_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Anyone can insert answers" ON public.answers;
CREATE POLICY "Anyone can insert answers"
    ON public.answers FOR INSERT
    WITH CHECK (true);

DROP POLICY IF EXISTS "Participants can view answers (for rankings)" ON public.answers;
CREATE POLICY "Participants can view answers (for rankings)"
    ON public.answers FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.sessions
            WHERE sessions.id = answers.session_id
            AND sessions.status != 'finished'
        )
    );

-- Scores: Everyone in the session can see rankings
DROP POLICY IF EXISTS "Anyone can view scores" ON public.scores;
CREATE POLICY "Anyone can view scores"
    ON public.scores FOR SELECT
    USING (true);

DROP POLICY IF EXISTS "Anyone can update/insert scores" ON public.scores;
CREATE POLICY "Anyone can update/insert scores"
    ON public.scores FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.sessions
            WHERE sessions.id = scores.session_id
            AND sessions.status != 'finished'
        )
    )
    WITH CHECK (true);

----------------------------------------------------------
-- 4. FUNCTIONS & TRIGGERS
----------------------------------------------------------

-- Auto-create teacher profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.teachers (id, email)
    VALUES (new.id, new.email);
    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Auto-update score when an answer is inserted
CREATE OR REPLACE FUNCTION public.update_participant_score()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.scores (participant_id, session_id, total_points)
    VALUES (NEW.participant_id, NEW.session_id, NEW.points_awarded)
    ON CONFLICT (participant_id, session_id) 
    DO UPDATE SET 
        total_points = public.scores.total_points + NEW.points_awarded,
        updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_answer_inserted ON public.answers;
CREATE TRIGGER on_answer_inserted
    AFTER INSERT ON public.answers
    FOR EACH ROW EXECUTE PROCEDURE public.update_participant_score();
