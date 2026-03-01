import { useState, useCallback, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { useQuizStore } from "@/lib/store";
import { Question, QuestionSchema, Session, SessionSchema, Participant } from "@/lib/schemas";
import { playSFX } from "@/components/AudioController";

export function usePlaySession(id: string) {
    const router = useRouter();
    const { participantId, nickname } = useQuizStore();

    const [session, setSession] = useState<Session | null>(null);
    const [participants, setParticipants] = useState<{ id: string; nickname: string; current_streak?: number; is_eliminated?: boolean; team?: string | null }[]>([]);
    const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);

    // Core game state
    const [answered, setAnswered] = useState(false);
    const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
    const [isLate, setIsLate] = useState(false);
    const [loading, setLoading] = useState(true);
    const [selectedOption, setSelectedOption] = useState<string | null>(null);
    const [totalScore, setTotalScore] = useState<number | null>(null);
    const [fetchingScore, setFetchingScore] = useState(false);
    const [pointsEarned, setPointsEarned] = useState<number>(0);
    const [currentStreak, setCurrentStreak] = useState<number>(0);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [timesUp, setTimesUp] = useState(false);

    // States for specific question types
    const [fillAnswer, setFillAnswer] = useState("");
    const [matchingPairs, setMatchingPairs] = useState<{ [key: string]: string }>({});
    const [selectedTerm, setSelectedTerm] = useState<string | null>(null);
    const [shuffledMatches, setShuffledMatches] = useState<string[]>([]);

    const handleNewQuestion = useCallback(async (questionId: string) => {
        const { data, error } = await supabase.from("questions").select("id, quiz_id, question_text, question_type, options, image_url, time_limit, points, sort_order").eq("id", questionId).single();
        if (error) { console.error("No question data found for ID:", questionId, error); toast.error("Error: No se pudo encontrar la pregunta"); return; }

        if (data) {
            try {
                const q = QuestionSchema.parse(data);
                setCurrentQuestion(q);
                setAnswered(false);
                setIsCorrect(null);
                setPointsEarned(0);
                setSelectedOption(null);
                setFillAnswer("");
                setMatchingPairs({});
                setSelectedTerm(null);
                setIsSubmitting(false);
                setTimesUp(false);
                setIsLate(false);

                if (q.question_type === "matching") {
                    const matches = q.options.map(opt => opt.split(":")[1]);
                    setShuffledMatches([...matches].sort(() => Math.random() - 0.5));
                }
            } catch (e) { console.error("Error validando pregunta:", e); toast.error("Error al cargar los datos de la pregunta"); }
        }
    }, []);

    const fetchInitialState = useCallback(async () => {
        const { data: sessionData } = await supabase.from("sessions").select("*").eq("id", id).single();
        if (sessionData) {
            try {
                const s = SessionSchema.parse(sessionData);
                setSession(s);
                if (s.current_question_id) handleNewQuestion(s.current_question_id);
            } catch (e) { console.error("Error validando sesión:", e); toast.error("Error al conectar con la sesión"); }
        }
        setLoading(false);
    }, [id, handleNewQuestion]);

    const fetchParticipants = useCallback(async () => {
        const { data } = await supabase.from("participants").select("id, nickname").eq("session_id", id);
        if (data) setParticipants(data);
    }, [id]);

    const fetchTotalScore = useCallback(async () => {
        setFetchingScore(true);
        try {
            const { data } = await supabase.from("scores").select("total_points").eq("participant_id", participantId).eq("session_id", id).maybeSingle();
            if (data) setTotalScore(data.total_points);
        } catch (err) { console.error("Error fetching score:", err); } finally { setFetchingScore(false); }
    }, [id, participantId]);

    useEffect(() => {
        if (!nickname || !participantId) { router.push("/join"); return; }
        fetchInitialState();
        if (session?.status === "finished" && totalScore === null && !fetchingScore) fetchTotalScore();

        const sessionChannel = supabase.channel(`play_session_${id}`)
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'sessions', filter: `id=eq.${id}` }, (payload) => {
                try {
                    const newData = SessionSchema.parse(payload.new);
                    setSession(prevSession => {
                        if (newData.current_question_id !== prevSession?.current_question_id && newData.current_question_id) {
                            handleNewQuestion(newData.current_question_id);
                        }
                        if (newData.status === "finished" && prevSession?.status !== "finished") fetchTotalScore();
                        return newData;
                    });
                } catch (e) { console.error("Error en actualización de tiempo real:", e); }
            })
            .on('postgres_changes', { event: '*', schema: 'public', table: 'participants', filter: `session_id=eq.${id}` }, (payload) => {
                const typedPayload = payload.new as Participant;
                if (typedPayload && typedPayload.id === participantId) {
                    useQuizStore.getState().setIsEliminated(typedPayload.is_eliminated || false);
                    if (typedPayload.team) useQuizStore.getState().setTeam(typedPayload.team);
                }
                fetchParticipants();
            })
            .subscribe();

        fetchParticipants();
        return () => { supabase.removeChannel(sessionChannel); };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id, nickname, participantId]);

    const submitAnswer = useCallback(async (answer: string) => {
        if (answered || isSubmitting || !currentQuestion) return;
        setIsSubmitting(true);
        setAnswered(true);
        setSelectedOption(answer);

        try {
            const { data, error } = await supabase.rpc('submit_answer', {
                p_session_id: id,
                p_participant_id: participantId,
                p_question_id: currentQuestion.id,
                p_answer_text: currentQuestion.question_type === "matching" ? JSON.stringify(matchingPairs) : answer
            });

            if (error) throw error;

            if (data && data.success) {
                setPointsEarned(data.points_earned);
                setIsCorrect(data.is_correct);
                setCurrentStreak(data.current_streak || 0);
                playSFX(data.is_correct ? "correct" : "wrong");
                if (data.is_correct && (data.current_streak || 0) >= 2) playSFX("streak");
            }
            setIsSubmitting(false);
        } catch (e) {
            console.error("Error al enviar respuesta:", e);
            toast.error("Error de conexión al enviar tu respuesta");
            setIsSubmitting(false);
            setAnswered(false);
        }
    }, [answered, isSubmitting, currentQuestion, id, participantId, matchingPairs]);

    return {
        session, participants, currentQuestion, loading,
        answered, setAnswered, isCorrect, isLate, setIsLate,
        selectedOption, totalScore, fetchingScore, pointsEarned, currentStreak,
        isSubmitting, timesUp, setTimesUp,
        fillAnswer, setFillAnswer, matchingPairs, setMatchingPairs,
        selectedTerm, setSelectedTerm, shuffledMatches, submitAnswer
    };
}
