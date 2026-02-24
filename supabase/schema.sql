-- Supabase Schema for Kahoot-like Quiz Platform

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

----------------------------------------------------------
-- 1. TABLES
----------------------------------------------------------

-- Teachers (extends auth.users)
CREATE TABLE public.teachers (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Quizzes
CREATE TABLE public.quizzes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    teacher_id UUID NOT NULL REFERENCES public.teachers(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Questions
-- type can be: 'multiple_choice', 'true_false', 'short_answer'
CREATE TABLE public.questions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    quiz_id UUID NOT NULL REFERENCES public.quizzes(id) ON DELETE CASCADE,
    question_text TEXT NOT NULL,
    question_type TEXT NOT NULL DEFAULT 'multiple_choice',
    options JSONB, -- Array of strings for choices
    correct_answer TEXT NOT NULL,
    time_limit INT NOT NULL DEFAULT 20, -- seconds
    points INT NOT NULL DEFAULT 1000,
    sort_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Sessions (Active game instances)
-- status can be: 'waiting', 'active', 'finished'
CREATE TABLE public.sessions (
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
CREATE TABLE public.participants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
    nickname TEXT NOT NULL,
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(session_id, nickname) -- Prevent duplicate nicknames in the same session
);

-- Answers (Student submissions)
CREATE TABLE public.answers (
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
-- Can also be calculated dynamically, but we materialize it for easy rankings
CREATE TABLE public.scores (
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
ALTER PUBLICATION supabase_realtime ADD TABLE sessions;
ALTER PUBLICATION supabase_realtime ADD TABLE participants;
ALTER PUBLICATION supabase_realtime ADD TABLE answers;

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

-- Teachers RLS
CREATE POLICY "Teachers can view own profile" 
    ON public.teachers FOR SELECT 
    USING (auth.uid() = id);

-- Quizzes RLS
CREATE POLICY "Teachers can CRUD own quizzes" 
    ON public.quizzes FOR ALL 
    USING (auth.uid() = teacher_id);

CREATE POLICY "Anyone can view quizzes if they join a session (via session relation)"
    ON public.quizzes FOR SELECT
    USING (true); -- Simplified for students joining by PIN, restricts can be tighter

-- Questions RLS
CREATE POLICY "Teachers can CRUD questions for their quizzes" 
    ON public.questions FOR ALL 
    USING (
        EXISTS (
            SELECT 1 FROM public.quizzes 
            WHERE quizzes.id = questions.quiz_id 
            AND quizzes.teacher_id = auth.uid()
        )
    );

CREATE POLICY "Anyone can view questions"
    ON public.questions FOR SELECT
    USING (true); -- Students need to read questions when session is active. App logic will hide correct_answer until reveal.

-- Sessions RLS
CREATE POLICY "Teachers can CRUD own sessions" 
    ON public.sessions FOR ALL 
    USING (
        EXISTS (
            SELECT 1 FROM public.quizzes 
            WHERE quizzes.id = sessions.quiz_id 
            AND quizzes.teacher_id = auth.uid()
        )
    );

CREATE POLICY "Anyone can view sessions by PIN or ID"
    ON public.sessions FOR SELECT
    USING (true);

-- Participants RLS
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

CREATE POLICY "Anyone can insert participant (join session)"
    ON public.participants FOR INSERT
    WITH CHECK (true);

CREATE POLICY "Participants can view other participants in same session"
    ON public.participants FOR SELECT
    USING (true);

-- Answers RLS
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

CREATE POLICY "Anyone can insert answers"
    ON public.answers FOR INSERT
    WITH CHECK (true);

CREATE POLICY "Participants can view answers (for rankings)"
    ON public.answers FOR SELECT
    USING (true);

-- Scores RLS
CREATE POLICY "Anyone can view scores"
    ON public.scores FOR SELECT
    USING (true);

CREATE POLICY "Anyone can update/insert scores"
    ON public.scores FOR ALL
    USING (true)
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

CREATE TRIGGER on_answer_inserted
    AFTER INSERT ON public.answers
    FOR EACH ROW EXECUTE PROCEDURE public.update_participant_score();
