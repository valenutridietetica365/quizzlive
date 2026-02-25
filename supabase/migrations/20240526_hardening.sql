-- Hardening: Audit Logs & Security Triggers

-- 1. Create audit_logs table
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    teacher_id UUID REFERENCES public.teachers(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id UUID,
    details JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Teachers can view own logs" 
    ON public.audit_logs FOR SELECT 
    USING (auth.uid() = teacher_id);

-- 2. Audit trigger for quiz changes
CREATE OR REPLACE FUNCTION public.log_quiz_changes()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.audit_logs (teacher_id, action, entity_type, entity_id, details)
    VALUES (
        COALESCE(auth.uid(), (SELECT teacher_id FROM public.quizzes WHERE id = COALESCE(NEW.id, OLD.id))),
        TG_OP,
        'quiz',
        COALESCE(NEW.id, OLD.id),
        jsonb_build_object('title', COALESCE(NEW.title, OLD.title))
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_quiz_change ON public.quizzes;
CREATE TRIGGER on_quiz_change
    AFTER INSERT OR UPDATE OR DELETE ON public.quizzes
    FOR EACH ROW EXECUTE PROCEDURE public.log_quiz_changes();
