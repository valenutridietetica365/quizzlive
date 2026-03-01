"use client";

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { useParams, useRouter } from "next/navigation";
import { Users, LogOut, Loader2, QrCode } from "lucide-react";
import { toast } from "sonner";
import dynamic from "next/dynamic";
import ShareModal from "@/components/ShareModal";
import { TeacherSessionSkeleton } from "@/components/Skeleton";
import { useQuizStore } from "@/lib/store";
import { getTranslation } from "@/lib/i18n";
import LanguageSelector from "@/components/LanguageSelector";
import AudioController from "@/components/AudioController";

const ParticipantMarquee = dynamic(() => import("@/components/game/ParticipantMarquee"), { ssr: false });
import WaitingRoom from "@/components/session/WaitingRoom";
import LiveQuestion from "@/components/session/LiveQuestion";
import SessionResults from "@/components/session/SessionResults";

import { Quiz, quizSchema, Question, QuestionSchema, Session, SessionSchema, Participant, ParticipantSchema } from "@/lib/schemas";

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

    const t = useCallback((key: string) => getTranslation(language, key), [language]);

    const fetchSessionData = useCallback(async () => {
        try {
            const { data: sessionData, error: sessionErr } = await supabase.from("sessions").select("*, quiz:quizzes(*)").eq("id", id).single();
            if (sessionErr || !sessionData) { toast.error(t('common.error')); return router.push("/teacher/dashboard"); }
            const { data: questionsData, error: questionsErr } = await supabase.from("questions").select("*").eq("quiz_id", sessionData.quiz_id).order("sort_order", { ascending: true });
            if (questionsErr) { console.error("Error fetching questions:", questionsErr); toast.error("Error al cargar las preguntas"); }
            const { data: participantsData } = await supabase.from("participants").select("*").eq("session_id", id);

            if (sessionData) {
                try {
                    const s = SessionSchema.parse(sessionData);
                    setSession(s as Session);
                    setQuiz(quizSchema.parse(sessionData.quiz));
                } catch { console.error("Error validando sesión"); }
            }

            const validQuestions = (questionsData || []).map(q => { try { return QuestionSchema.parse(q); } catch { return null; } }).filter((q): q is Question => q !== null);
            const validParticipants = (participantsData || []).map(p => { try { return ParticipantSchema.parse(p); } catch { return null; } }).filter((p): p is Participant => p !== null);

            setQuestions(validQuestions);
            setParticipants(validParticipants);

            if (sessionData.current_question_id) {
                const index = validQuestions.findIndex(q => q.id === sessionData.current_question_id);
                if (index !== -1) {
                    setCurrentQuestionIndex(index);
                    const { count } = await supabase.from("answers").select("*", { count: 'exact', head: true }).eq("session_id", id).eq("question_id", sessionData.current_question_id);
                    setResponsesCount(count || 0);
                }
            }
        } catch { toast.error(t('common.error')); } finally { setLoading(false); }
    }, [id, router, t]);

    useEffect(() => {
        fetchSessionData();
        const participantsChannel = supabase.channel(`session_participants_${id}`).on('postgres_changes', { event: '*', schema: 'public', table: 'participants', filter: `session_id=eq.${id}` }, (payload) => {
            try {
                const p = ParticipantSchema.parse(payload.new);
                setParticipants((prev) => {
                    const index = prev.findIndex(p_prev => p_prev.id === p.id);
                    if (index !== -1) { const next = [...prev]; next[index] = p; return next; }
                    return [...prev, p];
                });
            } catch { console.error("Error validando datos de participante"); }
        }).subscribe((status) => { if (status === 'CHANNEL_ERROR') toast.error(t('common.error')); });

        const answersChannel = supabase.channel(`session_answers_${id}`).on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'answers' }, (payload) => {
            if (payload.new.session_id === id) setResponsesCount((prev) => prev + 1);
        }).subscribe();

        return () => { supabase.removeChannel(participantsChannel); supabase.removeChannel(answersChannel); };
    }, [id, fetchSessionData, t]);

    const startQuiz = async () => {
        if (!session) return;
        if (questions.length === 0) { toast.error("El cuestionario no tiene preguntas guardadas."); return; }
        try {
            const firstQuestion = questions[0];
            const now = new Date().toISOString();
            const { error: updateError } = await supabase.from("sessions").update({ status: "active", current_question_id: firstQuestion.id, started_at: now, current_question_started_at: now }).eq("id", id);
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
            await supabase.from("sessions").update({ current_question_id: nextQ.id, current_question_started_at: now }).eq("id", id);
            setSession(prev => prev ? { ...prev, current_question_id: nextQ.id, current_question_started_at: now } : prev);
            setCurrentQuestionIndex(nextIndex);
            setResponsesCount(0);
        } else {
            await supabase.from("sessions").update({ status: "finished", finished_at: new Date().toISOString() }).eq("id", id);
            setSession(prev => prev ? { ...prev, status: "finished" } : prev);
        }
    }, [session, currentQuestionIndex, questions, id]);

    useEffect(() => {
        if (session?.status !== "active" || currentQuestionIndex === -1) return;
        const activeParticipants = participants.filter(p => !p.is_eliminated);
        if (activeParticipants.length > 0 && responsesCount >= activeParticipants.length) {
            const timer = setTimeout(() => { nextQuestion(); }, 1500);
            return () => clearTimeout(timer);
        }
    }, [responsesCount, participants, session?.status, currentQuestionIndex, nextQuestion]);

    if (loading) return <TeacherSessionSkeleton />;
    if (!session || !quiz) return <div className="min-h-screen flex items-center justify-center bg-slate-950"><Loader2 className="w-10 h-10 animate-spin text-blue-500" /></div>;

    const joinUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/join?pin=${session.pin}`;

    return (
        <div className="min-h-screen bg-slate-950 text-white flex flex-col selection:bg-blue-500/30">
            {/* Top Bar */}
            <div className="p-3 md:p-4 flex justify-between items-center bg-slate-900/50 backdrop-blur-2xl border-b border-white/5 sticky top-0 z-50">
                <div className="flex items-center gap-6">
                    <div className="hidden lg:flex items-center gap-2 px-4 py-2 bg-blue-500/10 rounded-full border border-blue-500/20">
                        <span className="text-xs font-black text-blue-400 uppercase tracking-widest">{quiz.title}</span>
                    </div>
                    {session.game_mode !== 'classic' && (
                        <div className="hidden lg:flex items-center gap-2 px-4 py-2 bg-amber-500/10 rounded-full border border-amber-500/20">
                            <span className="text-xs font-black text-amber-500 uppercase tracking-widest">Modo: {session.game_mode}</span>
                        </div>
                    )}
                    <div className="flex items-center gap-3">
                        <Users className="w-5 h-5 text-slate-500" />
                        <span className="text-lg font-black text-white">{participants.length} <span className="text-slate-500 font-bold ml-1">{t('session.participants')}</span></span>
                        <button onClick={fetchSessionData} className="p-2 hover:bg-slate-800 rounded-lg text-slate-500 hover:text-white transition-all" title={t('session.refresh_participants')}>
                            <Loader2 className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                        </button>
                    </div>
                </div>

                <div className="flex items-center gap-2 md:gap-4">
                    <div className="hidden sm:block"><LanguageSelector /></div>
                    <div className="flex items-center gap-2 bg-slate-800/50 px-5 py-2.5 rounded-2xl border border-white/5">
                        <span className="text-xs font-black text-slate-400 uppercase tracking-widest">PIN</span>
                        <span className="text-xl font-black text-blue-400 font-mono tracking-widest">{session.pin}</span>
                    </div>

                    <button onClick={() => setIsShareModalOpen(true)} className="p-3 bg-blue-500/10 hover:bg-blue-500 text-blue-400 hover:text-white rounded-2xl transition-all border border-blue-500/20 active:scale-95 group" title={t('session.share_session')}>
                        <QrCode className="w-5 h-5 group-hover:scale-110 transition-transform" />
                    </button>

                    <button onClick={() => router.push("/teacher/dashboard")} className="p-3 bg-red-500/10 hover:bg-red-500 text-red-400 hover:text-white rounded-2xl transition-all border border-red-500/20 active:scale-95 group" title={t('session.leave_session')}>
                        <LogOut className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
                    </button>
                </div>
            </div>

            <main className="flex-1 flex flex-col items-center justify-center p-8 md:p-12 w-full max-w-7xl mx-auto">
                {session.status === "waiting" && (
                    <WaitingRoom
                        pin={session.pin}
                        joinUrl={joinUrl}
                        gameMode={session.game_mode as "classic" | "survival" | "teams" | "hangman"}
                        participantsCount={participants.length}
                        t={t}
                        onStart={startQuiz}
                    />
                )}

                {session.status === "active" && currentQuestionIndex !== -1 && questions[currentQuestionIndex] && (
                    <LiveQuestion
                        sessionId={session.id}
                        question={questions[currentQuestionIndex]}
                        questionIndex={currentQuestionIndex}
                        totalQuestions={questions.length}
                        responsesCount={responsesCount}
                        startedAt={session.current_question_started_at ?? null}
                        t={t}
                        onNext={nextQuestion}
                    />
                )}

                {session.status === "finished" && (
                    <SessionResults
                        sessionId={session.id}
                        t={t}
                    />
                )}
            </main>

            <div className="fixed bottom-0 left-0 right-0 z-50">
                <ParticipantMarquee participants={participants} waitingText={t('session.waiting_participants')} />
            </div>

            <ShareModal isOpen={isShareModalOpen} onClose={() => setIsShareModalOpen(false)} pin={session.pin} joinUrl={joinUrl} />
            <AudioController type={session.status} />
        </div>
    );
}
