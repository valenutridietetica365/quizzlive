"use client";

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { useParams, useRouter } from "next/navigation";
import { Users, Play, ChevronRight, BarChart3, Trophy, LogOut, Loader2, Sparkles, MessageSquare } from "lucide-react";
import { toast } from "sonner";
import Image from "next/image";
import QRDisplay from "@/components/QRDisplay";
import ShareModal from "@/components/ShareModal";
import { QrCode } from "lucide-react";

interface Quiz {
    id: string;
    title: string;
}

interface Session {
    id: string;
    pin: string;
    status: string;
    quiz_id: string;
    current_question_id?: string | null;
    quiz?: Quiz;
}

interface Question {
    id: string;
    question_text: string;
    question_type: "multiple_choice" | "true_false";
    options: string[];
    image_url?: string;
    sort_order: number;
}

interface Participant {
    id: string;
    nickname: string;
}

export default function TeacherSession() {
    const { id } = useParams();
    const router = useRouter();
    const [session, setSession] = useState<Session | null>(null);
    const [quiz, setQuiz] = useState<Quiz | null>(null);
    const [questions, setQuestions] = useState<Question[]>([]);
    const [participants, setParticipants] = useState<Participant[]>([]);
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(-1);
    const [loading, setLoading] = useState(true);
    const [responsesCount, setResponsesCount] = useState(0);
    const [isShareModalOpen, setIsShareModalOpen] = useState(false);

    const fetchSessionData = useCallback(async () => {
        try {
            const { data: sessionData, error: sessionErr } = await supabase
                .from("sessions")
                .select("*, quiz:quizzes(*)")
                .eq("id", id)
                .single();

            if (sessionErr || !sessionData) {
                toast.error("No se pudo cargar la sesión");
                return router.push("/teacher/dashboard");
            }

            const { data: questionsData, error: questionsErr } = await supabase
                .from("questions")
                .select("*")
                .eq("quiz_id", sessionData.quiz_id)
                .order("sort_order", { ascending: true });

            if (questionsErr) {
                toast.error("Error al cargar las preguntas");
            }

            const { data: participantsData } = await supabase
                .from("participants")
                .select("*")
                .eq("session_id", id);

            setSession(sessionData as Session);
            setQuiz(sessionData.quiz as Quiz);
            setQuestions(questionsData as Question[] || []);
            setParticipants(participantsData || []);
            console.log("Sesión cargada:", sessionData.id);
            console.log("Preguntas cargadas:", (questionsData || []).length);
        } catch (err) {
            console.error(err);
            toast.error("Error inesperado en la conexión");
        } finally {
            setLoading(false);
        }
    }, [id, router]);

    useEffect(() => {
        fetchSessionData();

        const participantsChannel = supabase
            .channel(`session_participants_${id}`)
            .on(
                'postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'participants' },
                (payload) => {
                    // Filter in JS to avoid replica identity issues with 'session_id' filter
                    if (payload.new.session_id === id) {
                        console.log("Nuevo participante detectado via Realtime:", payload.new);
                        setParticipants((prev) => {
                            const exists = prev.some(p => p.id === payload.new.id);
                            if (exists) return prev;
                            return [...prev, payload.new as Participant];
                        });
                    }
                }
            )
            .subscribe((status) => {
                console.log("Estado suscripción participantes:", status);
                if (status === 'CHANNEL_ERROR') toast.error("Error de conexión Realtime");
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
    }, [id, fetchSessionData]);

    const startQuiz = async () => {
        if (!session) return;
        if (questions.length === 0) {
            toast.error("Este quiz no tiene preguntas");
            return;
        }

        try {
            const firstQuestion = questions[0];
            const { error: updateError } = await supabase
                .from("sessions")
                .update({
                    status: "active",
                    current_question_id: firstQuestion.id,
                    started_at: new Date().toISOString()
                })
                .eq("id", id);

            if (updateError) throw updateError;

            setSession({ ...session, status: "active", current_question_id: firstQuestion.id });
            setCurrentQuestionIndex(0);
            setResponsesCount(0);
            toast.success("¡Que comience el juego!");
        } catch (err: any) {
            toast.error("Error al iniciar el quiz: " + err.message);
        }
    };

    const nextQuestion = async () => {
        if (!session) return;
        const nextIndex = currentQuestionIndex + 1;
        if (nextIndex < questions.length) {
            const nextQuestion = questions[nextIndex];
            await supabase
                .from("sessions")
                .update({ current_question_id: nextQuestion.id })
                .eq("id", id);

            setCurrentQuestionIndex(nextIndex);
            setResponsesCount(0);
        } else {
            await supabase
                .from("sessions")
                .update({ status: "finished", finished_at: new Date().toISOString() })
                .eq("id", id);
            setSession({ ...session, status: "finished" });
        }
    };

    if (loading || !session || !quiz) return (
        <div className="min-h-screen flex items-center justify-center bg-slate-950">
            <Loader2 className="w-10 h-10 animate-spin text-blue-500" />
        </div>
    );

    const joinUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/join?pin=${session.pin}`;

    return (
        <div className="min-h-screen bg-slate-950 text-white flex flex-col selection:bg-blue-500/30">
            {/* Top Bar - More sophisticated */}
            <div className="p-6 md:p-8 flex justify-between items-center bg-slate-900/50 backdrop-blur-2xl border-b border-white/5 sticky top-0 z-50">
                <div className="flex items-center gap-6">
                    <div className="hidden sm:flex items-center gap-2 px-4 py-2 bg-blue-500/10 rounded-full border border-blue-500/20">
                        <Sparkles className="w-4 h-4 text-blue-400" />
                        <span className="text-xs font-black text-blue-400 uppercase tracking-widest">{quiz.title}</span>
                    </div>
                    <div className="flex items-center gap-3">
                        <Users className="w-5 h-5 text-slate-500" />
                        <span className="text-lg font-black text-white">{participants.length} <span className="text-slate-500 font-bold ml-1">ALUMNOS</span></span>
                        <button
                            onClick={fetchSessionData}
                            className="p-2 hover:bg-slate-800 rounded-lg text-slate-500 hover:text-white transition-all"
                            title="Refrescar participantes"
                        >
                            <Loader2 className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                        </button>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2 bg-slate-800/50 px-5 py-2.5 rounded-2xl border border-white/5">
                        <span className="text-xs font-black text-slate-400 uppercase tracking-widest">PIN</span>
                        <span className="text-xl font-black text-blue-400 font-mono tracking-widest">{session.pin}</span>
                    </div>

                    <button
                        onClick={() => setIsShareModalOpen(true)}
                        className="p-3 bg-blue-500/10 hover:bg-blue-500 text-blue-400 hover:text-white rounded-2xl transition-all border border-blue-500/20 active:scale-95 group"
                        title="Compartir sesión"
                    >
                        <QrCode className="w-5 h-5 group-hover:scale-110 transition-transform" />
                    </button>

                    <button
                        onClick={() => router.push("/teacher/dashboard")}
                        className="p-3 bg-red-500/10 hover:bg-red-500 text-red-400 hover:text-white rounded-2xl transition-all border border-red-500/20 active:scale-95 group"
                        title="Abandonar sesión"
                    >
                        <LogOut className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
                    </button>
                </div>
            </div>

            <main className="flex-1 flex flex-col items-center justify-center p-8 md:p-12 w-full max-w-7xl mx-auto">
                {session.status === "waiting" && (
                    <div className="w-full grid md:grid-cols-2 gap-16 items-center animate-in fade-in zoom-in duration-700">
                        <div className="space-y-10 text-center md:text-left">
                            <div className="space-y-4">
                                <h1 className="text-6xl md:text-8xl font-black tracking-tighter leading-none">
                                    ¡Es hora de <br />
                                    <span className="text-blue-500">jugar!</span>
                                </h1>
                                <p className="text-xl text-slate-400 font-medium max-w-md">
                                    Comparte el código con tus alumnos o escanea el QR para entrar al instante.
                                </p>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-4">
                                <div className="bg-slate-900/50 p-6 rounded-[2rem] border border-white/5 text-center">
                                    <p className="text-xs font-black text-slate-500 uppercase tracking-[0.2em] mb-4">Código de Acceso</p>
                                    <h2 className="text-5xl font-black text-white tracking-[0.2em] font-mono">{session.pin}</h2>
                                </div>
                                <button
                                    onClick={startQuiz}
                                    disabled={participants.length === 0}
                                    className="btn-premium !bg-blue-600 !hover:bg-blue-700 !shadow-blue-900/40 text-2xl flex items-center justify-center gap-3 disabled:opacity-30 disabled:grayscale transition-all"
                                >
                                    <Play className="w-8 h-8 fill-white" />
                                    EMPEZAR
                                </button>
                            </div>
                        </div>

                        <div className="flex flex-col items-center gap-8">
                            <div className="p-8 bg-white rounded-[3rem] shadow-2xl rotate-2 hover:rotate-0 transition-transform duration-500 group">
                                <QRDisplay value={joinUrl} />
                                <div className="mt-8 text-center text-slate-900">
                                    <p className="font-black text-sm uppercase tracking-widest opacity-30 group-hover:opacity-100 transition-opacity">Únete ahora</p>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {session.status === "active" && currentQuestionIndex !== -1 && (
                    <div className="w-full grid lg:grid-cols-3 gap-8 animate-in slide-in-from-bottom-12 duration-700">
                        {/* Question Content */}
                        <div className="lg:col-span-2 space-y-10">
                            <div className="flex items-center gap-4">
                                <span className="px-4 py-2 bg-blue-500/10 rounded-xl text-blue-400 font-black text-xs uppercase tracking-[0.2em]">
                                    Pregunta {currentQuestionIndex + 1} / {questions.length}
                                </span>
                                <div className="h-1 flex-1 bg-slate-900 rounded-full overflow-hidden">
                                    <div className="h-full bg-blue-600 transition-all duration-1000" style={{ width: `${((currentQuestionIndex + 1) / questions.length) * 100}%` }} />
                                </div>
                            </div>

                            <h1 className="text-4xl md:text-6xl font-black tracking-tight leading-tight">
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

                            <div className="grid sm:grid-cols-2 gap-4">
                                {questions[currentQuestionIndex].options.map((opt, i) => (
                                    <div
                                        key={i}
                                        className={`p-6 md:p-8 rounded-[2rem] border-b-[6px] transition-all flex items-center gap-5 ${questions[currentQuestionIndex].question_type === "true_false"
                                            ? (opt === "Verdadero" ? "bg-blue-600/90 border-blue-800" : "bg-red-600/90 border-red-800")
                                            : (i === 0 ? "bg-red-600/90 border-red-800" :
                                                i === 1 ? "bg-blue-600/90 border-blue-800" :
                                                    i === 2 ? "bg-amber-500 border-amber-700" :
                                                        "bg-emerald-600/90 border-emerald-800")
                                            }`}
                                    >
                                        <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center text-xl font-black shadow-lg">
                                            {String.fromCharCode(65 + i)}
                                        </div>
                                        <span className="text-xl md:text-2xl font-black text-white">{opt}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Sidebar Stats */}
                        <div className="space-y-6">
                            <div className="bg-slate-900/80 backdrop-blur-xl p-10 rounded-[2.5rem] border border-white/5 flex flex-col items-center text-center space-y-4 shadow-2xl">
                                <div className="w-20 h-20 bg-blue-500/10 rounded-full flex items-center justify-center text-blue-500 ring-8 ring-blue-500/5">
                                    <MessageSquare className="w-10 h-10" />
                                </div>
                                <div>
                                    <p className="text-6xl font-black text-white tabular-nums tracking-tighter">{responsesCount}</p>
                                    <p className="text-sm font-black text-slate-500 uppercase tracking-widest mt-1">Respuestas</p>
                                </div>
                                <div className="pt-4 flex gap-1">
                                    {[...Array(5)].map((_, i) => (
                                        <div key={i} className={`h-1.5 w-1.5 rounded-full ${i < (responsesCount % 6) ? 'bg-blue-500' : 'bg-slate-800'}`} />
                                    ))}
                                </div>
                            </div>

                            <button
                                onClick={nextQuestion}
                                className="w-full btn-premium !bg-white !text-slate-950 !shadow-white/5 flex items-center justify-center gap-3 group"
                            >
                                <span className="text-xl">SIGUIENTE</span>
                                <ChevronRight className="w-7 h-7 group-hover:translate-x-1 transition-transform" />
                            </button>
                        </div>
                    </div>
                )}

                {session.status === "finished" && (
                    <div className="max-w-2xl w-full text-center space-y-12 animate-in zoom-in duration-1000">
                        <div className="relative">
                            <div className="absolute inset-0 bg-blue-500/20 blur-[100px] rounded-full -z-10" />
                            <div className="bg-slate-900/50 backdrop-blur-3xl p-16 rounded-[4rem] border border-white/5 shadow-[0_32px_128px_-16px_rgba(0,0,0,0.5)]">
                                <Trophy className="w-32 h-32 text-amber-400 mx-auto mb-10 animate-float" />
                                <h1 className="text-6xl font-black mb-6 tracking-tight leading-none">¡Misión <br /> <span className="text-blue-500">Cumplida!</span></h1>
                                <p className="text-xl text-slate-400 font-medium max-w-sm mx-auto leading-relaxed mb-10">
                                    Has completado el quiz satisfactoriamente. Todos los datos han sido guardados en el historial.
                                </p>
                                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                                    <button
                                        onClick={() => router.push("/teacher/dashboard")}
                                        className="btn-premium !bg-blue-600 !hover:bg-blue-700 flex items-center justify-center gap-2"
                                    >
                                        <BarChart3 className="w-5 h-5" />
                                        VER RESULTADOS
                                    </button>
                                    <button
                                        onClick={() => router.push("/teacher/dashboard")}
                                        className="btn-premium !bg-slate-800 flex items-center justify-center gap-2"
                                    >
                                        VOLVER
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </main>

            {/* Bottom Participants ticker - More discrete */}
            <div className="p-5 bg-black/40 backdrop-blur-lg flex gap-4 overflow-hidden border-t border-white/5 whitespace-nowrap">
                {participants.length === 0 ? (
                    <p className="text-slate-700 font-bold uppercase tracking-[0.3em] font-mono text-xs mx-auto animate-pulse">Esperando participantes...</p>
                ) : (
                    <div className="flex gap-6 animate-marquee">
                        {participants.map((p) => (
                            <div key={p.id} className="flex items-center gap-2 text-slate-400">
                                <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.8)]" />
                                <span className="text-xs font-black uppercase tracking-widest">{p.nickname}</span>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <ShareModal
                isOpen={isShareModalOpen}
                onClose={() => setIsShareModalOpen(false)}
                pin={session.pin}
                joinUrl={joinUrl}
            />
        </div>
    );
}
