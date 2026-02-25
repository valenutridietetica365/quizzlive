"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useQuizStore } from "@/lib/store";
import { Loader2, CheckCircle2, Clock, Trophy, Frown, Sparkles, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import Image from "next/image";
import { getTranslation } from "@/lib/i18n";

import { Question, QuestionSchema, Session, SessionSchema } from "@/lib/schemas";
import { StudentPlaySkeleton } from "@/components/Skeleton";
import AudioController, { playSFX } from "@/components/AudioController";

export default function StudentPlay() {
    const { id } = useParams();
    const router = useRouter();
    const { participantId, nickname, language } = useQuizStore();

    const [session, setSession] = useState<Session | null>(null);
    const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
    const [answered, setAnswered] = useState(false);
    const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
    const [loading, setLoading] = useState(true);
    const [selectedOption, setSelectedOption] = useState<string | null>(null);
    const [totalScore, setTotalScore] = useState<number | null>(null);
    const [fetchingScore, setFetchingScore] = useState(false);
    const [questionStartTime, setQuestionStartTime] = useState<number>(0);
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
        const { data: questionData } = await supabase
            .from("questions")
            .select("*")
            .eq("id", questionId)
            .single();

        if (questionData) {
            try {
                const q = QuestionSchema.parse(questionData);
                setCurrentQuestion(q);
                setAnswered(false);
                setIsCorrect(null);
                setPointsEarned(0);
                setQuestionStartTime(Date.now());
                setSelectedOption(null);
                setFillAnswer("");
                setMatchingPairs({});
                setSelectedTerm(null);
                setIsSubmitting(false); // Crucial fix: allow interaction in the new question
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
        } else {
            console.error("No question data found for ID:", questionId);
            toast.error("Error: No se pudo encontrar la pregunta");
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
            .subscribe();

        return () => {
            supabase.removeChannel(sessionChannel);
        };
        // Removed session?.current_question_id and session?.status from dependencies to stabilize subscription
    }, [id, nickname, participantId, fetchInitialState, handleNewQuestion, router, totalScore, fetchingScore, fetchTotalScore]);

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

        let correct = false;

        if (currentQuestion.question_type === "fill_in_the_blank") {
            const normalizedAnswer = answer.trim().toLowerCase();
            const normalizedCorrect = currentQuestion.correct_answer.trim().toLowerCase();
            correct = normalizedAnswer === normalizedCorrect;
        } else if (currentQuestion.question_type === "matching") {
            const expectedPairs = currentQuestion.options.reduce((acc: Record<string, string>, opt) => {
                const [t, m] = opt.split(":");
                acc[t] = m;
                return acc;
            }, {});

            const studentPairCount = Object.keys(matchingPairs).length;
            const targetPairCount = currentQuestion.options.length;

            if (studentPairCount === targetPairCount) {
                correct = Object.entries(matchingPairs).every(([t, m]) => expectedPairs[t] === m);
            }
        } else {
            correct = answer === currentQuestion.correct_answer;
        }

        setIsCorrect(correct);
        playSFX(correct ? "correct" : "wrong");
        if (correct && currentStreak >= 2) playSFX("streak");

        let points = 0;
        if (correct) {
            const timeTaken = (Date.now() - questionStartTime) / 1000;
            const timeLimit = currentQuestion.time_limit || 20;
            const percentage = Math.min(timeTaken / timeLimit, 1);
            points = Math.round(currentQuestion.points * (1 - (percentage / 2)));
        }

        setPointsEarned(points);
        setCurrentStreak(prev => correct ? prev + 1 : 0);

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
            }
            setIsSubmitting(false); // Clean up state after successful sync
        } catch (e) {
            console.error("Error al enviar respuesta:", e);
            toast.error("Error de conexión al enviar tu respuesta");
            setIsSubmitting(false);
            setAnswered(false); // Rollback optimistic UI if it failed
        }
    };

    if (loading || !session) return <StudentPlaySkeleton />;

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col p-6 md:p-12 items-center justify-center selection:bg-blue-100">
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
                        <div className="w-full space-y-8 md:space-y-10 animate-in slide-in-from-bottom-12 duration-700">
                            {/* Timer Bar */}
                            {timeLeft !== null && (
                                <div className="w-full space-y-1">
                                    <div className="flex justify-between items-center px-1">
                                        <span className="text-xs font-black text-slate-400 uppercase tracking-widest">{t('play.time_left')}</span>
                                        <span className={`text-xs font-black tabular-nums ${timeLeft < 5 ? 'text-red-500 animate-pulse' : 'text-slate-500'}`}>{timeLeft}s</span>
                                    </div>
                                    <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                                        <div
                                            className="h-full rounded-full transition-all duration-1000 ease-linear"
                                            style={{
                                                width: `${(timeLeft / (currentQuestion.time_limit || 20)) * 100}%`,
                                                backgroundColor: timeLeft < 5 ? '#ef4444' : timeLeft < 10 ? '#f59e0b' : '#3b82f6'
                                            }}
                                        />
                                    </div>
                                </div>
                            )}
                            <div className="text-center space-y-4 px-4">
                                <h2 className="text-2xl md:text-5xl font-black text-slate-900 tracking-tight leading-tight">
                                    {currentQuestion.question_text}
                                </h2>
                            </div>

                            {currentQuestion.image_url && (
                                <div className="w-full aspect-video rounded-3xl md:rounded-[2.5rem] overflow-hidden border-4 border-white shadow-2xl relative">
                                    <Image src={currentQuestion.image_url} alt="Question" fill className="object-cover" unoptimized />
                                    <div className="absolute inset-0 bg-gradient-to-t from-slate-900/20 to-transparent" />
                                </div>
                            )}

                            {currentQuestion.question_type === "multiple_choice" || currentQuestion.question_type === "true_false" ? (
                                <div className={`grid gap-4 w-full ${currentQuestion.question_type === "true_false" ? "grid-cols-2" : "grid-cols-1 sm:grid-cols-2"}`}>
                                    {currentQuestion.options.map((opt, i) => (
                                        <button
                                            key={i}
                                            disabled={isSubmitting || answered}
                                            onClick={() => submitAnswer(opt)}
                                            className={`group p-8 rounded-[2rem] text-left transition-all active:scale-95 shadow-lg border-b-[8px] flex flex-col justify-between h-48 sm:h-auto overflow-hidden relative ${(isSubmitting || answered) && selectedOption !== opt ? "opacity-50 grayscale" : ""} ${selectedOption === opt ? "scale-105 brightness-110 z-10 ring-4 ring-white shadow-2xl" : ""
                                                } ${currentQuestion.question_type === "true_false"
                                                    ? (opt === "Verdadero" || opt === "True" ? "bg-blue-600 border-blue-800 shadow-blue-200" : "bg-red-600 border-red-800 shadow-red-200")
                                                    : (i === 0 ? "bg-red-600 border-red-800 shadow-red-200" :
                                                        i === 1 ? "bg-blue-600 border-blue-800 shadow-blue-200" :
                                                            i === 2 ? "bg-amber-500 border-amber-700 shadow-amber-100" :
                                                                "bg-emerald-600 border-emerald-800 shadow-emerald-100")
                                                }`}
                                        >
                                            <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                                            <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center font-black text-white text-xl relative z-10">
                                                {String.fromCharCode(65 + i)}
                                            </div>
                                            <span className="text-2xl font-black text-white mt-4 relative z-10">{opt}</span>
                                        </button>
                                    ))}
                                </div>
                            ) : currentQuestion.question_type === "fill_in_the_blank" ? (
                                <div className="w-full space-y-6">
                                    <div className="bg-white p-8 rounded-[3rem] shadow-xl border-4 border-slate-100 relative group overflow-hidden">
                                        <input
                                            type="text"
                                            placeholder="..."
                                            className="w-full bg-transparent border-none focus:ring-0 text-3xl font-black text-slate-800 placeholder:text-slate-200 text-center"
                                            value={fillAnswer}
                                            disabled={isSubmitting || answered}
                                            onChange={(e) => setFillAnswer(e.target.value)}
                                            onKeyDown={(e) => e.key === 'Enter' && fillAnswer.trim() && !isSubmitting && submitAnswer(fillAnswer)}
                                            autoFocus
                                        />
                                    </div>
                                    <button
                                        onClick={() => fillAnswer.trim() && !isSubmitting && submitAnswer(fillAnswer)}
                                        disabled={!fillAnswer.trim() || isSubmitting || answered}
                                        className="btn-premium w-full !rounded-[2rem] !py-6 !text-2xl flex items-center justify-center gap-4 active:scale-95 disabled:opacity-50 shadow-2xl shadow-blue-100"
                                    >
                                        {t('play.submit_answer')} <ArrowRight className="w-8 h-8" />
                                    </button>
                                </div>
                            ) : (
                                <div className="w-full space-y-8">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
                                        <div className="space-y-3">
                                            <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest pl-2">{t('play.concepts')}</span>
                                            {currentQuestion.options.map((pair, i) => {
                                                const term = pair.split(":")[0];
                                                const isPaired = matchingPairs[term];
                                                const isSelected = selectedTerm === term;
                                                return (
                                                    <button
                                                        key={i}
                                                        onClick={() => !isPaired && setSelectedTerm(isSelected ? null : term)}
                                                        className={`w-full p-4 md:p-5 rounded-xl md:rounded-2xl border-b-4 font-black transition-all text-left flex items-center justify-between text-sm md:text-base ${isPaired
                                                            ? "bg-slate-100 border-slate-200 text-slate-300 cursor-not-allowed"
                                                            : isSelected
                                                                ? "bg-purple-600 border-purple-800 text-white scale-[1.02] md:scale-105 shadow-lg"
                                                                : "bg-white border-slate-100 text-slate-600 hover:border-slate-200"
                                                            }`}
                                                    >
                                                        {term}
                                                        {isPaired && <CheckCircle2 className="w-4 h-4 text-emerald-500" />}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                        <div className="space-y-3">
                                            <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest pl-2">{t('play.pairs')}</span>
                                            {shuffledMatches.map((match, i) => {
                                                const isPaired = Object.values(matchingPairs).includes(match);
                                                return (
                                                    <button
                                                        key={i}
                                                        onClick={() => {
                                                            if (selectedTerm && !isPaired) {
                                                                setMatchingPairs({ ...matchingPairs, [selectedTerm]: match });
                                                                setSelectedTerm(null);
                                                            }
                                                        }}
                                                        className={`w-full p-4 md:p-5 rounded-xl md:rounded-2xl border-b-4 font-black transition-all text-left text-sm md:text-base ${isPaired
                                                            ? "bg-slate-100 border-slate-200 text-slate-300 cursor-not-allowed opacity-50"
                                                            : selectedTerm
                                                                ? "bg-purple-50 border-purple-200 text-purple-600 hover:bg-purple-600 hover:text-white"
                                                                : "bg-white border-slate-100 text-slate-600 cursor-default"
                                                            }`}
                                                    >
                                                        {match}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    {Object.keys(matchingPairs).length > 0 && (
                                        <button onClick={() => setMatchingPairs({})} className="text-[10px] font-black text-red-400 hover:text-red-500 uppercase tracking-widest w-full text-center">{t('play.reset_pairs')}</button>
                                    )}

                                    <button
                                        onClick={() => submitAnswer("MATCHING_COMPLETE")}
                                        disabled={Object.keys(matchingPairs).length < currentQuestion.options.length}
                                        className="btn-premium w-full !bg-purple-600 hover:!bg-purple-700 !rounded-[2rem] !py-6 !text-2xl flex items-center justify-center gap-4 active:scale-95 disabled:opacity-50 shadow-2xl shadow-purple-100"
                                    >
                                        {t('play.verify_pairs')} <CheckCircle2 className="w-8 h-8" />
                                    </button>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="w-full text-center space-y-10 animate-in zoom-in duration-700">
                            <div className={`p-16 rounded-[4rem] shadow-2xl border-b-[16px] flex flex-col items-center gap-6 ${isCorrect
                                ? "bg-emerald-500 border-emerald-700 shadow-emerald-200"
                                : "bg-red-500 border-red-700 shadow-red-200"
                                }`}>
                                {isCorrect ? <CheckCircle2 className="w-32 h-32 text-white animate-in zoom-in-50" /> : <Frown className="w-32 h-32 text-white animate-in zoom-in-50" />}
                                <h1 className="text-6xl font-black text-white tracking-tighter">{isCorrect ? t('play.yes') : t('play.almost')}</h1>
                                <div className="flex flex-col items-center gap-2">
                                    <p className="text-white/90 font-black text-2xl uppercase tracking-widest">{isCorrect ? `+${pointsEarned.toLocaleString()} ${t('play.points_earned')}` : t('play.next_adventure')}</p>
                                    {isCorrect && currentStreak > 1 && (
                                        <div className="flex items-center gap-2 px-4 py-1 bg-white/20 rounded-full animate-bounce">
                                            <Sparkles className="w-4 h-4 text-amber-300" />
                                            <span className="text-white font-black text-xs uppercase tracking-widest">{currentStreak} {t('play.streak_fire')} 🔥</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div className="flex flex-col items-center gap-3">
                                <div className="h-2 w-48 bg-slate-200 rounded-full overflow-hidden"><div className="h-full bg-blue-600 animate-pulse w-1/2" /></div>
                                <p className="text-slate-400 font-black text-xs uppercase tracking-[0.3em]">{t('play.next_question_coming')}</p>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {session.status === "finished" && (
                <div className="max-w-md w-full text-center space-y-10 animate-in zoom-in duration-700">
                    <div className="bg-white p-12 md:p-16 rounded-[4rem] shadow-2xl border border-slate-100 flex flex-col items-center gap-10 relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-blue-50/50 to-transparent -z-10" />
                        <div className="relative">
                            <Trophy className="w-32 h-32 text-amber-500 animate-float active:scale-110 transition-transform" />
                            <div className="absolute -top-2 -right-2 w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-lg"><Sparkles className="w-6 h-6 text-amber-400" /></div>
                        </div>
                        <div className="space-y-4">
                            <h1 className="text-5xl font-black text-slate-900 tracking-tight leading-none">{t('play.incredible')}, <span className="text-blue-600 font-black">{nickname}</span>!</h1>
                            <p className="text-lg text-slate-500 font-medium max-w-[280px] mx-auto">{t('play.finished_subtitle')}</p>
                        </div>
                        <div className="bg-slate-900 p-10 rounded-[3rem] w-full shadow-2xl shadow-slate-200 group relative">
                            <div className="absolute inset-0 bg-blue-600/10 opacity-50" />
                            <div className="relative z-10 flex flex-col items-center gap-2">
                                <span className="text-xs font-black text-blue-400 uppercase tracking-[0.4em] mb-2">{t('play.total_score')}</span>
                                {fetchingScore ? <Loader2 className="w-12 h-12 animate-spin text-white" /> : <span className="text-7xl font-black text-white tracking-tighter tabular-nums">{(totalScore ?? 0).toLocaleString()}</span>}
                            </div>
                        </div>
                        <div className="w-full space-y-4">
                            <button onClick={() => router.push("/")} className="btn-premium w-full !bg-blue-600 !text-white !rounded-[2rem] !py-6 !text-xl flex items-center justify-center gap-3 shadow-xl shadow-blue-100">{t('play.go_home')} <ArrowRight className="w-6 h-6" /></button>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('play.thanks')}</p>
                        </div>
                    </div>
                </div>
            )}
            <AudioController type={session.status} />
        </div>
    );
}
