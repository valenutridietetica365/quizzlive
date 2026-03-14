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
    const [participants, setParticipants] = useState<{ id: string; nickname: string; current_streak?: number; is_eliminated?: boolean; team?: string | null; coins?: number; has_shield?: boolean }[]>([]);
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

    // Roulette specific state
    const [rouletteItems, setRouletteItems] = useState<string[]>([]);
    const [rouletteSpinning, setRouletteSpinning] = useState(false);
    const [rouletteWinnerIndex, setRouletteWinnerIndex] = useState<number | null>(null);
    const [rouletteType, setRouletteType] = useState<"participant" | "question" | null>(null);

    // Chaos Mode specific state
    const [myCoins, setMyCoins] = useState(0);
    const [hasShield, setHasShield] = useState(false);
    const [isFrozen, setIsFrozen] = useState(false);
    const [frozenBy, setFrozenBy] = useState<string | null>(null);
    const [freezeTimer, setFreezeTimer] = useState(0);
    const [isSpyActive, setIsSpyActive] = useState(false);
    const [answerDistribution, setAnswerDistribution] = useState<Record<string, number>>({});

    const handleNewQuestion = useCallback(async (questionId: string, isHangmanMode?: boolean) => {
        const selectFields = `id, quiz_id, question_text, question_type, options, image_url, time_limit, points, sort_order${isHangmanMode ? ", correct_answer" : ""}`;

        if (!session?.quiz_id) return;

        const { data, error } = await supabase.from("questions")
            .select(selectFields)
            .eq("id", questionId)
            .eq("quiz_id", session.quiz_id)
            .single();

        if (error) {
            console.error("No question data found for ID:", questionId, error);
            toast.error("Error: No se pudo encontrar la pregunta");
            return;
        }

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

                // Reset roulette on new question
                setRouletteSpinning(false);
                setRouletteWinnerIndex(null);
                setRouletteType(null);

                // Reset Chaos Mode power-ups
                setIsSpyActive(false);
                setAnswerDistribution({});

                if (q.question_type === "matching") {
                    const matches = q.options.map(opt => opt.split(":")[1]);
                    setShuffledMatches([...matches].sort(() => Math.random() - 0.5));
                }
            } catch (e) {
                console.error("Error validando pregunta:", e);
                toast.error("Error al cargar los datos de la pregunta");
            }
        }
    }, [session?.quiz_id]);

    const fetchInitialState = useCallback(async () => {
        const { data: sessionData } = await supabase.from("sessions")
            .select("id, pin, status, quiz_id, current_question_id, started_at, finished_at, game_mode, config")
            .eq("id", id)
            .single();
        if (sessionData) {
            try {
                const s = SessionSchema.parse(sessionData);
                setSession(s);
                if (s.current_question_id) {
                    handleNewQuestion(s.current_question_id, s.game_mode === "hangman");
                }
            } catch (e) {
                console.error("Error validando sesión:", e);
                toast.error("Error al conectar con la sesión");
            }
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
            setTotalScore(data ? data.total_points : 0);
        } catch (err) { console.error("Error fetching score:", err); } finally { setFetchingScore(false); }
    }, [id, participantId]);

    // Effect 1: Auth guard + initial data fetch
    useEffect(() => {
        if (!nickname || !participantId) { router.push("/join"); return; }
        fetchInitialState();
        fetchParticipants();
    }, [id, nickname, participantId, fetchInitialState, fetchParticipants, router]);

    // Effect 2: Realtime subscriptions (stable deps only)
    useEffect(() => {
        if (!nickname || !participantId) return;

        let lastKnownQuestionId: string | null = null;
        let lastKnownStatus: string | null = null;

        const sessionChannel = supabase.channel(`play_session_${id}`)
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'sessions', filter: `id=eq.${id}` }, (payload) => {
                try {
                    const newData = SessionSchema.parse(payload.new);
                    
                    if (newData.current_question_id && newData.current_question_id !== lastKnownQuestionId) {
                        lastKnownQuestionId = newData.current_question_id;
                        handleNewQuestion(newData.current_question_id, newData.game_mode === "hangman");
                    }
                    
                    if (newData.status === "finished" && lastKnownStatus !== "finished") {
                        lastKnownStatus = newData.status;
                        fetchTotalScore();
                    }

                    setSession(newData);
                } catch (e) { console.error("Error en actualización de tiempo real:", e); }
            })
            .on('postgres_changes', { event: '*', schema: 'public', table: 'participants', filter: `session_id=eq.${id}` }, (payload) => {
                const typedNew = payload.new as Participant;
                if (typedNew && typedNew.id === participantId) {
                    useQuizStore.getState().setIsEliminated(typedNew.is_eliminated || false);
                    if (typedNew.team) useQuizStore.getState().setTeam(typedNew.team);
                    if (typedNew.coins !== undefined) setMyCoins(typedNew.coins);
                    if (typedNew.has_shield !== undefined) setHasShield(typedNew.has_shield);
                }

                setParticipants((prev) => {
                    if (payload.eventType === 'INSERT') {
                        const exists = prev.find(p => p.id === typedNew.id);
                        if (exists) return prev;
                        return [...prev, typedNew];
                    }
                    if (payload.eventType === 'UPDATE') {
                        return prev.map(p => p.id === typedNew.id ? { ...p, ...typedNew } : p);
                    }
                    if (payload.eventType === 'DELETE') {
                        const oldId = (payload.old as Participant).id;
                        return prev.filter(p => p.id !== oldId);
                    }
                    return prev;
                });
            })
            .subscribe();

        const rouletteChannel = supabase.channel(`roulette_${id}`)
            .on('broadcast', { event: 'spin' }, ({ payload }) => {
                setRouletteItems(payload.items);
                setRouletteWinnerIndex(payload.index);
                setRouletteType(payload.type);
                setRouletteSpinning(true);
            })
            .on('broadcast', { event: 'spin_finish' }, () => {
                setRouletteSpinning(false);
            })
            .on('broadcast', { event: 'reset' }, () => {
                setRouletteSpinning(false);
                setRouletteWinnerIndex(null);
                setRouletteType(null);
            })
            .subscribe();

        const FREEZE_DURATION = 5; // 5 seconds freeze
        const chaosChannel = supabase.channel(`chaos_${id}`)
            .on('broadcast', { event: 'freeze' }, ({ payload }) => {
                if (payload.target_id === participantId) {
                    setIsFrozen(true);
                    setFrozenBy(payload.attacker_name || '???');
                    setFreezeTimer(FREEZE_DURATION);
                    // Countdown timer
                    let remaining = FREEZE_DURATION;
                    const interval = setInterval(() => {
                        remaining--;
                        setFreezeTimer(remaining);
                        if (remaining <= 0) {
                            clearInterval(interval);
                            setIsFrozen(false);
                            setFrozenBy(null);
                        }
                    }, 1000);
                }
            })
            .subscribe();

        // Spy Mode: Listen to all answers in the session
        const answersChannel = supabase.channel(`answers_stats_${id}`)
            .on('postgres_changes', { 
                event: 'INSERT', 
                schema: 'public', 
                table: 'answers', 
                filter: `session_id=eq.${id}` 
            }, (payload) => {
                const newAnswer = payload.new as { question_id: string; answer_text: string };
                if (newAnswer.question_id === currentQuestion?.id) {
                    setAnswerDistribution(prev => ({
                        ...prev,
                        [newAnswer.answer_text]: (prev[newAnswer.answer_text] || 0) + 1
                    }));
                }
            })
            .subscribe();

        return () => {
            supabase.removeChannel(sessionChannel);
            supabase.removeChannel(rouletteChannel);
            supabase.removeChannel(chaosChannel);
            supabase.removeChannel(answersChannel);
        };
    }, [id, nickname, participantId, handleNewQuestion, fetchParticipants, fetchTotalScore, currentQuestion?.id]);

    // Effect 3: Polling fallback for status (Safety for mobile/unstable connections)
    useEffect(() => {
        if (session?.status !== "active") return;

        const interval = setInterval(async () => {
            const { data } = await supabase.from("sessions").select("status, current_question_id").eq("id", id).maybeSingle();
            if (data && data.status === "finished") {
                setSession(prev => prev ? { ...prev, status: "finished" } : null);
                fetchTotalScore();
                clearInterval(interval);
            }
        }, 5000);

        return () => clearInterval(interval);
    }, [id, session?.status, fetchTotalScore]);

    // Effect 4: Fetch score when session finishes
    useEffect(() => {
        if (session?.status === "finished" && totalScore === null && !fetchingScore) {
            fetchTotalScore();
        }
    }, [session?.status, totalScore, fetchingScore, fetchTotalScore]);

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
                
                if (data.coins_total !== undefined) setMyCoins(data.coins_total);
                if (data.shield_consumed) toast("🛡️ Escudo usado", { duration: 1500, style: { fontSize: '11px', padding: '4px 10px', borderRadius: '999px', minHeight: 'auto' } });
                // Coins update is already visible via the ChaosStore UI — no toast needed

                if (data.speed_bonus) toast("⚡ Bonus de Velocidad x2", { duration: 1500, style: { fontSize: '11px', padding: '4px 10px', borderRadius: '999px', minHeight: 'auto', backgroundColor: '#f59e0b', color: '#fff' } });
                
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

    const buyPowerup = useCallback(async (powerupType: "shield" | "freeze" | "spy") => {
        if (!session || !participantId) return false;
        
        // Optimistic UI checks
        const cost = powerupType === 'shield' ? 30 : powerupType === 'freeze' ? 50 : 40;
        if (myCoins < cost) {
            toast.error("No tienes suficientes monedas 🪙");
            return false;
        }

        try {
            const { data, error } = await supabase.rpc('buy_powerup', {
                p_session_id: id,
                p_participant_id: participantId,
                p_powerup_type: powerupType
            });

            if (error) throw error;

            if (data && data.success) {
                setMyCoins(data.remaining_coins);
                if (powerupType === 'shield') {
                    setHasShield(true);
                    toast("🛡️ Escudo activo", { duration: 1500, style: { fontSize: '11px', padding: '4px 10px', borderRadius: '999px', minHeight: 'auto' } });
                    playSFX("correct");
                } else if (powerupType === 'freeze') {
                    const targetId = data.target_id;
                    if (targetId) {
                        // Send realtime broadcast with attacker's name
                        supabase.channel(`chaos_${id}`).send({
                            type: 'broadcast',
                            event: 'freeze',
                            payload: { target_id: targetId, attacker_name: nickname }
                        });
                        toast("❄️ ¡Rival congelado!", { duration: 1500, style: { fontSize: '11px', padding: '4px 10px', borderRadius: '999px', minHeight: 'auto' } });
                        playSFX("correct");
                    }
                } else if (powerupType === 'spy') {
                    // Fetch current distribution when activated
                    const { data: currentAnswers } = await supabase
                        .from('answers')
                        .select('answer_text')
                        .eq('session_id', id)
                        .eq('question_id', currentQuestion?.id);
                    
                    if (currentAnswers) {
                        const dist: Record<string, number> = {};
                        currentAnswers.forEach(a => {
                            dist[a.answer_text] = (dist[a.answer_text] || 0) + 1;
                        });
                        setAnswerDistribution(dist);
                    }

                    setIsSpyActive(true);
                    toast("👀 Espía activado", { duration: 1500, style: { fontSize: '11px', padding: '4px 10px', borderRadius: '999px', minHeight: 'auto' } });
                    playSFX("correct");
                }
                return true;
            } else {
                toast.error(data?.error || "Error al comprar el poder");
                return false;
            }
        } catch (e) {
            console.error("Error comprando poder:", e);
            toast.error("Error de conexión");
            return false;
        }
    }, [id, participantId, session, myCoins, nickname, currentQuestion?.id]);

    return {
        session, participants, currentQuestion, loading,
        answered, setAnswered, isCorrect, isLate, setIsLate,
        selectedOption, totalScore, fetchingScore, pointsEarned, currentStreak,
        isSubmitting, timesUp, setTimesUp,
        fillAnswer, setFillAnswer, matchingPairs, setMatchingPairs,
        selectedTerm, setSelectedTerm, shuffledMatches, submitAnswer,
        rouletteItems, rouletteSpinning, rouletteWinnerIndex, rouletteType,
        myCoins, hasShield, isFrozen, frozenBy, freezeTimer, isSpyActive, answerDistribution, buyPowerup
    };
}
