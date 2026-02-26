"use client";

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { useParams, useRouter } from "next/navigation";
import { Users, Play, ChevronRight, BarChart3, LogOut, Loader2, MessageSquare, QrCode } from "lucide-react";
import { toast } from "sonner";
import Image from "next/image";
import QRDisplay from "@/components/QRDisplay";
import ShareModal from "@/components/ShareModal";
import { TeacherSessionSkeleton } from "@/components/Skeleton";
import { useQuizStore } from "@/lib/store";
import { getTranslation } from "@/lib/i18n";
import LanguageSelector from "@/components/LanguageSelector";
import AudioController from "@/components/AudioController";
import SessionAnalytics from "@/components/SessionAnalytics";
import SessionReport from "@/components/SessionReport";
import CircularTimer from "@/components/CircularTimer";
import Leaderboard from "@/components/Leaderboard";
import FinalPodium from "@/components/FinalPodium";
import ParticipantMarquee from "@/components/game/ParticipantMarquee";
import ReactionSystem from "@/components/game/ReactionSystem";

import { Quiz, QuizSchema, Question, QuestionSchema, Session, SessionSchema, Participant, ParticipantSchema } from "@/lib/schemas";

export default function TeacherSession() {
    const { id } = useParams();
    const router = useRouter();
    const { language } = useQuizStore();
    const [session, setSession] = useState<Session | null>(null);
    const [quiz, setQuiz] = useState<Quiz | null>(null);
    const [questions, setQuestions] = useState<Question[]>([]);
    const [participants, setParticipants] = useState<Participant[]>([]);
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(-1);
    const [loading, setLoading] = useState(true);
    const [responsesCount, setResponsesCount] = useState(0);
    const [isShareModalOpen, setIsShareModalOpen] = useState(false);
    const [showAnalytics, setShowAnalytics] = useState(false);
    const [timeLeft, setTimeLeft] = useState<number | null>(null);

    const t = useCallback((key: string) => getTranslation(language, key), [language]);

    const fetchSessionData = useCallback(async () => {
        try {
            const { data: sessionData, error: sessionErr } = await supabase
                .from("sessions")
                .select("*, quiz:quizzes(*)")
                .eq("id", id)
                .single();

            if (sessionErr || !sessionData) {
                toast.error(t('common.error'));
                return router.push("/teacher/dashboard");
            }

            const { data: questionsData, error: questionsErr } = await supabase
                .from("questions")
                .select("*")
                .eq("quiz_id", sessionData.quiz_id)
                .order("sort_order", { ascending: true });

            if (questionsErr) {
                console.error("Error fetching questions:", questionsErr);
                toast.error("Error al cargar las preguntas");
            }

            const { data: participantsData } = await supabase
                .from("participants")
                .select("*")
                .eq("session_id", id);

            if (sessionData) {
                try {
                    const s = SessionSchema.parse(sessionData);
                    setSession(s as Session);
                    setQuiz(QuizSchema.parse(sessionData.quiz));
                } catch {
                    console.error("Error validando sesión");
                }
            }

            const validQuestions = (questionsData || []).map(q => {
                try {
                    return QuestionSchema.parse(q);
                } catch {
                    return null;
                }
            }).filter((q): q is Question => q !== null);

            const validParticipants = (participantsData || []).map(p => {
                try {
                    return ParticipantSchema.parse(p);
                } catch {
                    return null;
                }
            }).filter((p): p is Participant => p !== null);

            setQuestions(validQuestions);
            setParticipants(validParticipants);

            if (sessionData.current_question_id) {
                const index = validQuestions.findIndex(q => q.id === sessionData.current_question_id);
                if (index !== -1) {
                    setCurrentQuestionIndex(index);
                    // Fetch initial responses count for current question
                    const { count } = await supabase
                        .from("answers")
                        .select("*", { count: 'exact', head: true })
                        .eq("session_id", id)
                        .eq("question_id", sessionData.current_question_id);
                    setResponsesCount(count || 0);
                }
            }
        } catch {
            toast.error(t('common.error'));
        } finally {
            setLoading(false);
        }
    }, [id, router, t]);

    useEffect(() => {
        fetchSessionData();

        const participantsChannel = supabase
            .channel(`session_participants_${id}`)
            .on(
                'postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'participants' },
                (payload) => {
                    if (payload.new.session_id === id) {
                        try {
                            const p = ParticipantSchema.parse(payload.new);
                            setParticipants((prev) => {
                                const exists = prev.some(p_prev => p_prev.id === p.id);
                                if (exists) return prev;
                                return [...prev, p];
                            });
                        } catch {
                            console.error("Error validando nuevo participante");
                        }
                    }
                }
            )
            .subscribe((status) => {
                if (status === 'CHANNEL_ERROR') toast.error(t('common.error'));
            });

        const answersChannel = supabase
            .channel(`session_answers_${id}`)
            .on(
                'postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'answers' },
                (payload) => {
                    if (payload.new.session_id === id) {
                        setResponsesCount((prev) => prev + 1);
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(participantsChannel);
            supabase.removeChannel(answersChannel);
        };
    }, [id, fetchSessionData, t]);

    const startQuiz = async () => {
        if (!session) return;
        if (questions.length === 0) {
            toast.error("El cuestionario no tiene preguntas guardadas.");
            return;
        }

        try {
            const firstQuestion = questions[0];
            const now = new Date().toISOString();
            const { error: updateError } = await supabase
                .from("sessions")
                .update({
                    status: "active",
                    current_question_id: firstQuestion.id,
                    started_at: now,
                    current_question_started_at: now
                })
                .eq("id", id);

            if (updateError) throw updateError;

            setSession({ ...session, status: "active", current_question_id: firstQuestion.id, current_question_started_at: now });
            setCurrentQuestionIndex(0);
            setResponsesCount(0);
        } catch (error) {
            console.error("Error starting quiz:", error);
            const errorMessage = error instanceof Error ? error.message : t('dashboard.error_launching');
            toast.error(`Error al iniciar: ${errorMessage}`);
        }
    };

    const nextQuestion = useCallback(async () => {
        if (!session) return;
        const nextIndex = currentQuestionIndex + 1;
        if (nextIndex < questions.length) {
            const nextQ = questions[nextIndex];
            const now = new Date().toISOString();
            await supabase
                .from("sessions")
                .update({
                    current_question_id: nextQ.id,
                    current_question_started_at: now
                })
                .eq("id", id);

            setSession(prev => prev ? { ...prev, current_question_id: nextQ.id, current_question_started_at: now } : prev);
            setCurrentQuestionIndex(nextIndex);
            setResponsesCount(0);
        } else {
            await supabase
                .from("sessions")
                .update({ status: "finished", finished_at: new Date().toISOString() })
                .eq("id", id);
            setSession(prev => prev ? { ...prev, status: "finished" } : prev);
        }
    }, [session, currentQuestionIndex, questions, id]);

    useEffect(() => {
        if (session?.status !== "active" || currentQuestionIndex === -1 || !questions[currentQuestionIndex]) {
            setTimeLeft(null);
            return;
        }

        const timer = setInterval(() => {
            const startedAt = session.current_question_started_at ? new Date(session.current_question_started_at).getTime() : Date.now();
            const timeLimit = questions[currentQuestionIndex].time_limit || 20;
            const elapsed = Math.floor((Date.now() - startedAt) / 1000);
            const remaining = Math.max(0, timeLimit - elapsed);

            setTimeLeft(remaining);

            if (remaining <= 0) {
                clearInterval(timer);
                nextQuestion();
            }
        }, 1000);

        return () => clearInterval(timer);
    }, [session?.status, session?.current_question_started_at, currentQuestionIndex, questions, nextQuestion]);

    if (loading) return <TeacherSessionSkeleton />;

    if (!session || !quiz) return (
        <div className="min-h-screen flex items-center justify-center bg-slate-950">
            <Loader2 className="w-10 h-10 animate-spin text-blue-500" />
        </div>
    );

    const joinUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/join?pin=${session.pin}`;

    return (
        <div className="min-h-screen bg-slate-950 text-white flex flex-col selection:bg-blue-500/30">
            {/* Top Bar */}
            <div className="p-3 md:p-4 flex justify-between items-center bg-slate-900/50 backdrop-blur-2xl border-b border-white/5 sticky top-0 z-50">
                <div className="flex items-center gap-6">
                    <div className="hidden lg:flex items-center gap-2 px-4 py-2 bg-blue-500/10 rounded-full border border-blue-500/20">
                        <span className="text-xs font-black text-blue-400 uppercase tracking-widest">{quiz.title}</span>
                    </div>
                    <div className="flex items-center gap-3">
                        <Users className="w-5 h-5 text-slate-500" />
                        <span className="text-lg font-black text-white">{participants.length} <span className="text-slate-500 font-bold ml-1">{t('session.participants')}</span></span>
                        <button
                            onClick={fetchSessionData}
                            className="p-2 hover:bg-slate-800 rounded-lg text-slate-500 hover:text-white transition-all"
                            title={t('session.refresh_participants')}
                        >
                            <Loader2 className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                        </button>
                    </div>
                </div>

                <div className="flex items-center gap-2 md:gap-4">
                    <div className="hidden sm:block">
                        <LanguageSelector />
                    </div>
                    <div className="flex items-center gap-2 bg-slate-800/50 px-5 py-2.5 rounded-2xl border border-white/5">
                        <span className="text-xs font-black text-slate-400 uppercase tracking-widest">PIN</span>
                        <span className="text-xl font-black text-blue-400 font-mono tracking-widest">{session.pin}</span>
                    </div>

                    <button
                        onClick={() => setIsShareModalOpen(true)}
                        className="p-3 bg-blue-500/10 hover:bg-blue-500 text-blue-400 hover:text-white rounded-2xl transition-all border border-blue-500/20 active:scale-95 group"
                        title={t('session.share_session')}
                    >
                        <QrCode className="w-5 h-5 group-hover:scale-110 transition-transform" />
                    </button>

                    <button
                        onClick={() => router.push("/teacher/dashboard")}
                        className="p-3 bg-red-500/10 hover:bg-red-500 text-red-400 hover:text-white rounded-2xl transition-all border border-red-500/20 active:scale-95 group"
                        title={t('session.leave_session')}
                    >
                        <LogOut className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
                    </button>
                </div>
            </div>

            <main className="flex-1 flex flex-col items-center justify-center p-8 md:p-12 w-full max-w-7xl mx-auto">
                {session.status === "waiting" && (
                    <div className="w-full grid md:grid-cols-2 gap-16 items-center animate-in fade-in zoom-in duration-700">
                        <div className="space-y-4 text-center md:text-left">
                            <div className="space-y-2">
                                <h1 className="text-4xl md:text-6xl font-black tracking-tighter leading-none">
                                    {t('session.it_is_time')} <br />
                                    <span className="text-blue-500">{t('session.to_play')}</span>
                                </h1>
                                <p className="text-lg text-slate-400 font-medium max-w-md">
                                    {t('session.share_desc')}
                                </p>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-4">
                                <div className="bg-slate-900/50 p-6 rounded-[2rem] border border-white/5 text-center">
                                    <p className="text-xs font-black text-slate-500 uppercase tracking-[0.2em] mb-4">{t('session.access_code')}</p>
                                    <h2 className="text-5xl font-black text-white tracking-[0.2em] font-mono">{session.pin}</h2>
                                </div>
                                <button
                                    onClick={startQuiz}
                                    disabled={participants.length === 0}
                                    className="btn-premium !bg-blue-600 !hover:bg-blue-700 !shadow-blue-900/40 text-2xl flex items-center justify-center gap-3 disabled:opacity-30 disabled:grayscale transition-all"
                                >
                                    <Play className="w-8 h-8 fill-white" />
                                    {t('session.start_action')}
                                </button>
                            </div>
                        </div>

                        <div className="flex flex-col items-center gap-8">
                            <div className="p-8 bg-white rounded-[3rem] shadow-2xl rotate-2 hover:rotate-0 transition-transform duration-500 group">
                                <QRDisplay value={joinUrl} />
                                <div className="mt-8 text-center text-slate-900">
                                    <p className="font-black text-sm uppercase tracking-widest opacity-30 group-hover:opacity-100 transition-opacity">{t('session.join_now')}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {session.status === "active" && currentQuestionIndex !== -1 && (
                    <div className="w-full grid lg:grid-cols-3 gap-6 animate-in slide-in-from-bottom-12 duration-700">
                        <div className="lg:col-span-2 space-y-4 md:space-y-6">
                            <div className="flex items-center gap-3">
                                <span className="px-3 py-1.5 bg-blue-500/10 rounded-lg text-blue-400 font-black text-[10px] uppercase tracking-[0.2em]">
                                    {t('session.question_of')} {currentQuestionIndex + 1} / {questions.length}
                                </span>
                                <div className="h-1 flex-1 bg-slate-900 rounded-full overflow-hidden">
                                    <div className="h-full bg-blue-600 transition-all duration-1000" style={{ width: `${((currentQuestionIndex + 1) / questions.length) * 100}%` }} />
                                </div>
                            </div>

                            <h1 className="text-2xl md:text-5xl font-black tracking-tight leading-tight">
                                {questions[currentQuestionIndex].question_text}
                            </h1>

                            {questions[currentQuestionIndex].image_url && (
                                <div className="relative w-full aspect-video rounded-[3rem] overflow-hidden border-8 border-slate-900 shadow-2xl group">
                                    <Image
                                        src={questions[currentQuestionIndex].image_url}
                                        alt="Question"
                                        fill
                                        className="object-cover group-hover:scale-105 transition-transform duration-1000"
                                        unoptimized
                                    />
                                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950/40 to-transparent" />
                                </div>
                            )}

                            {questions[currentQuestionIndex].question_type === "multiple_choice" || questions[currentQuestionIndex].question_type === "true_false" ? (
                                <div className="grid sm:grid-cols-2 gap-4">
                                    {questions[currentQuestionIndex].options.map((opt, i) => (
                                        <div
                                            key={i}
                                            className={`p-4 md:p-6 rounded-2xl border-b-4 transition-all flex items-center gap-4 ${questions[currentQuestionIndex].question_type === "true_false"
                                                ? (opt === "Verdadero" || opt === "True" ? "bg-blue-600/90 border-blue-800" : "bg-red-600/90 border-red-800")
                                                : (i === 0 ? "bg-red-600/90 border-red-800" :
                                                    i === 1 ? "bg-blue-600/90 border-blue-800" :
                                                        i === 2 ? "bg-amber-500 border-amber-700" :
                                                            "bg-emerald-600/90 border-emerald-800")
                                                }`}
                                        >
                                            <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center text-lg font-black shadow-lg">
                                                {String.fromCharCode(65 + i)}
                                            </div>
                                            <span className="text-lg md:text-xl font-black text-white">{opt}</span>
                                        </div>
                                    ))}
                                </div>
                            ) : questions[currentQuestionIndex].question_type === "fill_in_the_blank" ? (
                                <div className="bg-slate-900/50 p-10 rounded-[3rem] border-4 border-emerald-500/30 flex flex-col items-center gap-4 animate-in zoom-in">
                                    <span className="text-xs font-black text-emerald-400 uppercase tracking-[0.4em]">{t('session.expected_answer')}</span>
                                    <h3 className="text-4xl md:text-6xl font-black text-white tracking-tight">{questions[currentQuestionIndex].options.length > 0 ? questions[currentQuestionIndex].options[0] : "---"}</h3>
                                </div>
                            ) : (
                                <div className="grid sm:grid-cols-2 gap-4">
                                    {questions[currentQuestionIndex].options.map((pair, i) => {
                                        const [term, match] = pair.split(":");
                                        return (
                                            <div key={i} className="bg-purple-600/20 p-6 rounded-[2rem] border-2 border-purple-500/30 flex items-center justify-between group hover:bg-purple-600/30 transition-all">
                                                <span className="font-black text-purple-200">{term}</span>
                                                <div className="w-8 h-px bg-purple-500/30" />
                                                <span className="font-black text-white">{match}</span>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        <div className="space-y-6">
                            <div className="bg-slate-900/80 backdrop-blur-xl p-6 md:p-8 rounded-3xl border border-white/5 flex flex-col items-center text-center space-y-3 shadow-2xl">
                                <div className="w-14 h-14 bg-blue-500/10 rounded-full flex items-center justify-center text-blue-500 ring-4 ring-blue-500/5">
                                    <MessageSquare className="w-7 h-7" />
                                </div>
                                <div>
                                    <p className="text-4xl md:text-5xl font-black text-white tabular-nums tracking-tighter">{responsesCount}</p>
                                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mt-1">{t('session.responses')}</p>
                                </div>
                                <div className="pt-2 flex gap-1">
                                    {[...Array(5)].map((_, i) => (
                                        <div key={i} className={`h-1 w-1 rounded-full ${i < (responsesCount % 6) ? 'bg-blue-500' : 'bg-slate-800'}`} />
                                    ))}
                                </div>
                            </div>

                            {/* Live Ranking */}
                            <div className="bg-slate-900/80 backdrop-blur-xl p-4 rounded-3xl border border-white/5 shadow-2xl">
                                <Leaderboard sessionId={id as string} />
                            </div>

                            {/* Timer Card */}
                            {timeLeft !== null && (
                                <div className="bg-slate-900/80 backdrop-blur-xl p-6 md:p-8 rounded-3xl border border-white/5 flex flex-col items-center text-center space-y-3 shadow-2xl">
                                    <CircularTimer timeLeft={timeLeft} timeLimit={questions[currentQuestionIndex]?.time_limit || 20} size="sm" />
                                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{t('session.time_remaining')}</p>
                                </div>
                            )}

                            <button
                                onClick={nextQuestion}
                                className="w-full btn-premium !bg-white !text-slate-950 !shadow-white/5 flex items-center justify-center gap-3 group"
                            >
                                <span className="text-xl font-black">{t('session.next_action')}</span>
                                <ChevronRight className="w-7 h-7 group-hover:translate-x-1 transition-transform" />
                            </button>
                        </div>
                    </div>
                )}

                {session.status === "finished" && (
                    <div className="max-w-2xl w-full space-y-8 animate-in fade-in duration-1000">
                        <FinalPodium sessionId={id as string} />

                        <div className="flex flex-col sm:flex-row gap-4 justify-center">
                            <button
                                onClick={() => setShowAnalytics(!showAnalytics)}
                                className={`btn-premium flex items-center justify-center gap-2 ${showAnalytics ? "!bg-slate-700" : "!bg-emerald-600"}`}
                            >
                                <BarChart3 className="w-5 h-5" />
                                {t('session.view_detailed_analytics')}
                            </button>
                            <button
                                onClick={() => router.push("/teacher/dashboard")}
                                className="btn-premium !bg-blue-600 flex items-center justify-center gap-2"
                            >
                                <BarChart3 className="w-5 h-5" />
                                {t('session.view_results')}
                            </button>
                        </div>

                        {showAnalytics && (
                            <div className="w-full space-y-12 animate-in fade-in slide-in-from-top-4 duration-700">
                                <SessionAnalytics sessionId={id as string} />
                                <SessionReport sessionId={id as string} />
                            </div>
                        )}
                    </div>
                )}
            </main>

            <div className="fixed bottom-0 left-0 right-0 z-50">
                <ParticipantMarquee
                    participants={participants}
                    waitingText={t('session.waiting_participants')}
                />
            </div>

            <ShareModal
                isOpen={isShareModalOpen}
                onClose={() => setIsShareModalOpen(false)}
                pin={session.pin}
                joinUrl={joinUrl}
            />
            <AudioController type={session.status} />
            <ReactionSystem sessionId={id as string} isPresenter={true} />
        </div>
    );
}
