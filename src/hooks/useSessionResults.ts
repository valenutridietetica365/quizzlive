import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { ReportAnswer, ReportParticipant, ReportQuestion } from '@/lib/reports';

export interface SessionResultsData {
    answers: ReportAnswer[];
    participants: ReportParticipant[];
    questions: ReportQuestion[];
    session: {
        id: string;
        pin: string;
        created_at: string;
        finished_at: string;
        quiz: {
            id: string;
            title: string;
            teacher?: {
                institution_name: string | null;
                logo_url: string | null;
                brand_color: string | null;
            };
        } | null;
    } | null;
    loading: boolean;
    error: string | null;
    maxTotalScore: number;
}

export const useSessionResults = (sessionId: string) => {
    const [data, setData] = useState<Omit<SessionResultsData, 'maxTotalScore' | 'loading' | 'error'>>({
        answers: [],
        participants: [],
        questions: [],
        session: null,
    });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchData = useCallback(async () => {
        if (!sessionId) return;
        
        setLoading(true);
        setError(null);
        
        try {
            // 1. Fetch Session & Quiz info
            const { data: sessionData, error: sessionError } = await supabase
                .from("sessions")
                .select(`
                    id, pin, created_at, finished_at,
                    quiz:quizzes(
                        id, title,
                        teacher:teachers(institution_name, logo_url, brand_color)
                    )
                `)
                .eq("id", sessionId)
                .single();

            if (sessionError) throw sessionError;

            // 2. Fetch Answers, Participants, and Questions in parallel
            const [answersRes, participantsRes, questionsRes] = await Promise.all([
                supabase.from("answers").select("is_correct, points_awarded, question_id, participant_id").eq("session_id", sessionId),
                supabase.from("participants").select("id, nickname").eq("session_id", sessionId),
                supabase.from("questions").select("id, question_text, points").eq("quiz_id", (sessionData as unknown as SessionResultsData['session'])?.quiz?.id || "").order('sort_order', { ascending: true })
            ]);

            if (answersRes.error) throw answersRes.error;
            if (participantsRes.error) throw participantsRes.error;
            if (questionsRes.error) throw questionsRes.error;

            setData({
                session: sessionData as unknown as SessionResultsData['session'],
                answers: (answersRes.data || []) as ReportAnswer[],
                participants: (participantsRes.data || []) as ReportParticipant[],
                questions: (questionsRes.data || []) as ReportQuestion[],
            });
        } catch (err: unknown) {
            console.error("Error fetching session results:", err);
            const message = err instanceof Error ? err.message : "Failed to load session results";
            setError(message);
        } finally {
            setLoading(false);
        }
    }, [sessionId]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const maxTotalScore = useMemo(() => {
        return data.questions.reduce((sum, q) => sum + (q.points || 0), 0);
    }, [data.questions]);

    return {
        ...data,
        loading,
        error,
        maxTotalScore,
        refresh: fetchData
    };
};
