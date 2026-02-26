"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useQuizStore } from "@/lib/store";
import { Loader2, Clock, Sparkles, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { getTranslation } from "@/lib/i18n";

import { Question, QuestionSchema, Session, SessionSchema } from "@/lib/schemas";
import { StudentPlaySkeleton } from "@/components/Skeleton";
import AudioController, { playSFX } from "@/components/AudioController";
import FinalPodium from "@/components/FinalPodium";
import QuestionView from "@/components/game/QuestionView";
import AnswerWaiting from "@/components/game/AnswerWaiting";
import ParticipantMarquee from "@/components/game/ParticipantMarquee";

export default function StudentPlay() {
    const { id } = useParams();
    const router = useRouter();
    const { participantId, nickname, language } = useQuizStore();

    const [session, setSession] = useState<Session | null>(null);
    const [participants, setParticipants] = useState<{ id: string; nickname: string; current_streak?: number }[]>([]);
    const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
    const [answered, setAnswered] = useState(false);
    const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
    const [loading, setLoading] = useState(true);
    const [selectedOption, setSelectedOption] = useState<string | null>(null);
    const [totalScore, setTotalScore] = useState<number | null>(null);
    const [fetchingScore, setFetchingScore] = useState(false);

    const [pointsEarned, setPointsEarned] = useState<number>(0);
    const [currentStreak, setCurrentStreak] = useState<number>(0);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [timeLeft, setTimeLeft] = useState<number | null>(null);
    const [timesUp, setTimesUp] = useState(false);

    // States for new question types
    const [fillAnswer, setFillAnswer] = useState("");
    const [matchingPairs, setMatchingPairs] = useState<{ [key: string]: string }>({});
    const [selectedTerm, setSelectedTerm] = useState<string | null>(null);
    const [shuffledMatches, setShuffledMatches] = useState<string[]>([]);

    const t = (key: string) => getTranslation(language, key);


    const handleNewQuestion = useCallback(async (questionId: string) => {
        const { data, error } = await supabase
            .from("questions")
            .select("id, quiz_id, question_text, question_type, options, image_url, time_limit, points, sort_order")
            .eq("id", questionId)
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
                setTimeLeft(null);

                if (q.question_type === "matching") {
                    const matches = q.options.map(opt => opt.split(":")[1]);
                    setShuffledMatches([...matches].sort(() => Math.random() - 0.5));
                }
            } catch (e) {
                console.error("Error validando pregunta:", e);
                toast.error("Error al cargar los datos de la pregunta");
            }
        }
    }, []);

    const fetchInitialState = useCallback(async () => {
        const { data: sessionData } = await supabase
            .from("sessions")
            .select("*")
            .eq("id", id)
            .single();

        if (sessionData) {
            try {
                const s = SessionSchema.parse(sessionData);
                setSession(s);
                if (s.current_question_id) {
                    handleNewQuestion(s.current_question_id);
                }
            } catch (e) {
                console.error("Error validando sesión:", e);
                toast.error("Error al conectar con la sesión");
            }
        }
        setLoading(false);
    }, [id, handleNewQuestion]);

    const fetchParticipants = useCallback(async () => {
        const { data } = await supabase
            .from("participants")
            .select("id, nickname")
            .eq("session_id", id);
        if (data) setParticipants(data);
    }, [id]);

    const fetchTotalScore = useCallback(async () => {
        setFetchingScore(true);
        try {
            const { data } = await supabase
                .from("scores")
                .select("total_points")
                .eq("participant_id", participantId)
                .eq("session_id", id)
                .maybeSingle();

            if (data) {
                setTotalScore(data.total_points);
            }
        } catch (err) {
            console.error("Error fetching score:", err);
        } finally {
            setFetchingScore(false);
        }
    }, [id, participantId]);

    useEffect(() => {
        if (!nickname || !participantId) {
            router.push("/join");
            return;
        }

        fetchInitialState();

        if (session?.status === "finished" && totalScore === null && !fetchingScore) {
            fetchTotalScore();
        }

        const sessionChannel = supabase
            .channel(`play_session_${id}`)
            .on(
                'postgres_changes',
                { event: 'UPDATE', schema: 'public', table: 'sessions', filter: `id=eq.${id}` },
                (payload) => {
                    try {
                        const newData = SessionSchema.parse(payload.new);

                        setSession(prevSession => {
                            if (newData.current_question_id !== prevSession?.current_question_id) {
                                if (newData.current_question_id) {
                                    handleNewQuestion(newData.current_question_id);
                                }
                            }
                            if (newData.status === "finished" && prevSession?.status !== "finished") {
                                fetchTotalScore();
                            }
                            return newData;
                        });
                    } catch (e) {
                        console.error("Error en actualización de tiempo real:", e);
                    }
                }
            )
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'participants', filter: `session_id=eq.${id}` },
                () => {
                    fetchParticipants();
                }
            )
            .subscribe();

        fetchParticipants();

        return () => {
            supabase.removeChannel(sessionChannel);
        };
    }, [id, nickname, participantId, fetchInitialState, handleNewQuestion, router, totalScore, fetchingScore, fetchTotalScore, fetchParticipants, session?.status]);

    // Countdown timer synchronized with session's current_question_started_at
    useEffect(() => {
        if (!currentQuestion || answered || timesUp || session?.status !== "active") {
            return;
        }

        const timer = setInterval(() => {
            const startedAt = session?.current_question_started_at
                ? new Date(session.current_question_started_at).getTime()
                : Date.now();
            const timeLimit = currentQuestion.time_limit || 20;
            const elapsed = Math.floor((Date.now() - startedAt) / 1000);
            const remaining = Math.max(0, timeLimit - elapsed);

            setTimeLeft(remaining);

            if (remaining <= 0) {
                clearInterval(timer);
                setTimesUp(true);
                setAnswered(true); // prevent submission
            }
        }, 1000);

        return () => clearInterval(timer);
    }, [currentQuestion, answered, timesUp, session?.status, session?.current_question_started_at]);

    const submitAnswer = async (answer: string) => {
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
            setAnswered(false); // Rollback optimistic UI if it failed
        }
    };

    if (loading || !session) return <StudentPlaySkeleton />;

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col p-3 md:p-8 items-center justify-center selection:bg-blue-100">
            {session.status === "waiting" && (
                <div className="max-w-md w-full text-center space-y-10 animate-in zoom-in duration-700">
                    <div className="bg-white p-12 rounded-[3.5rem] shadow-xl border border-slate-100 flex flex-col items-center gap-8 relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50/50 rounded-bl-full -mr-8 -mt-8" />
                        <div className="w-24 h-24 bg-blue-600 rounded-[2rem] flex items-center justify-center text-white shadow-xl shadow-blue-200 animate-bounce">
                            <Sparkles className="w-12 h-12" />
                        </div>
                        <div className="space-y-3 relative z-10">
                            <h1 className="text-4xl font-black text-slate-900 tracking-tight">{t('play.waiting_title')}</h1>
                            <p className="text-lg text-slate-500 font-medium">
                                Hola <span className="text-blue-600 font-black">{nickname}</span>, {t('play.waiting_subtitle')}
                            </p>
                        </div>
                        <div className="flex items-center gap-2 justify-center relative z-10">
                            <Clock className="w-4 h-4 text-slate-400" />
                            <small className="text-slate-400 font-black uppercase tracking-[0.2em] text-[10px]">{t('play.waiting_teacher')}</small>
                        </div>
                    </div>
                </div>
            )}

            {session.status === "active" && (
                <div className="w-full max-w-2xl flex flex-col items-center">
                    {!currentQuestion ? (
                        <div className="flex flex-col items-center gap-6 animate-pulse">
                            <div className="w-20 h-20 bg-blue-100 rounded-3xl flex items-center justify-center text-blue-500">
                                <Loader2 className="w-10 h-10 animate-spin" />
                            </div>
                            <p className="text-slate-400 font-black uppercase tracking-[0.3em] text-xs">Cargando siguiente pregunta...</p>
                        </div>
                    ) : timesUp ? (
                        <div className="w-full text-center space-y-6 animate-in zoom-in duration-700">
                            <div className="p-12 rounded-[4rem] bg-slate-800 border-b-[12px] border-slate-900 flex flex-col items-center gap-4 shadow-xl">
                                <Clock className="w-20 h-20 text-amber-400 animate-pulse" />
                                <h1 className="text-4xl font-black text-white">{t('play.time_up')}</h1>
                                <p className="text-slate-400 font-bold">{t('play.next_question_coming')}</p>
                            </div>
                        </div>
                    ) : !answered ? (
                        <QuestionView
                            currentQuestion={currentQuestion}
                            timeLeft={timeLeft}
                            isSubmitting={isSubmitting}
                            answered={answered}
                            submitAnswer={submitAnswer}
                            selectedOption={selectedOption}
                            fillAnswer={fillAnswer}
                            setFillAnswer={setFillAnswer}
                            matchingPairs={matchingPairs}
                            setMatchingPairs={setMatchingPairs}
                            selectedTerm={selectedTerm}
                            setSelectedTerm={setSelectedTerm}
                            shuffledMatches={shuffledMatches}
                            t={t}
                        />
                    ) : (
                        <AnswerWaiting
                            isCorrect={isCorrect ?? false}
                            pointsEarned={pointsEarned}
                            currentStreak={currentStreak}
                            sessionId={id as string}
                            participantId={participantId ?? undefined}
                            t={t}
                        />
                    )}
                </div>
            )}

            {session.status === "finished" && (
                <div className="max-w-md w-full text-center space-y-6 animate-in zoom-in duration-700">
                    {/* Animated Podium with confetti */}
                    <div className="bg-slate-900 p-8 rounded-[3rem] border border-white/5 shadow-2xl">
                        <FinalPodium sessionId={id as string} highlightId={participantId ?? undefined} />
                    </div>

                    {/* Personal score card */}
                    <div className="bg-white p-10 rounded-[3rem] shadow-2xl border border-slate-100 flex flex-col items-center gap-6">
                        <h1 className="text-4xl font-black text-slate-900 tracking-tight">{t('play.incredible')}, <span className="text-blue-600">{nickname}</span>!</h1>
                        <p className="text-slate-500 font-medium">{t('play.finished_subtitle')}</p>
                        <div className="bg-slate-900 p-8 rounded-[2rem] w-full">
                            <span className="text-xs font-black text-blue-400 uppercase tracking-[0.4em] block mb-2">{t('play.total_score')}</span>
                            {fetchingScore ? <Loader2 className="w-10 h-10 animate-spin text-white mx-auto" /> : <span className="text-6xl font-black text-white tracking-tighter tabular-nums">{(totalScore ?? 0).toLocaleString()}</span>}
                        </div>
                        <button onClick={() => router.push("/")} className="btn-premium w-full !bg-blue-600 !text-white !rounded-[2rem] !py-5 !text-xl flex items-center justify-center gap-3">
                            {t('play.go_home')} <ArrowRight className="w-6 h-6" />
                        </button>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('play.thanks')}</p>
                    </div>
                </div>
            )}
            <AudioController type={session.status} />

            <div className="fixed bottom-0 left-0 right-0 z-50">
                <ParticipantMarquee
                    participants={participants}
                    waitingText={t('session.waiting_participants')}
                />
            </div>
        </div>
    );
}
