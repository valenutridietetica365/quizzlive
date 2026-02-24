"use client";

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { useParams, useRouter } from "next/navigation";
import { Users, Play, ChevronRight, BarChart3, Trophy, LogOut, Loader2 } from "lucide-react";
import QRDisplay from "@/components/QRDisplay";

interface Quiz {
    id: string;
    title: string;
}

interface Session {
    id: string;
    pin: string;
    status: string;
    quiz_id: string;
    quiz?: Quiz;
}

interface Question {
    id: string;
    question_text: string;
    options: string[];
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

    const fetchSessionData = useCallback(async () => {
        const { data: sessionData } = await supabase
            .from("sessions")
            .select("*, quiz:quizzes(*)")
            .eq("id", id)
            .single();

        if (!sessionData) return router.push("/teacher/dashboard");

        const { data: questionsData } = await supabase
            .from("questions")
            .select("*")
            .eq("quiz_id", sessionData.quiz_id)
            .order("sort_order", { ascending: true });

        const { data: participantsData } = await supabase
            .from("participants")
            .select("*")
            .eq("session_id", id);

        setSession(sessionData);
        setQuiz(sessionData.quiz);
        setQuestions(questionsData || []);
        setParticipants(participantsData || []);
        setLoading(false);
    }, [id, router]);

    useEffect(() => {
        fetchSessionData();

        // 1. Listen for new participants
        const participantsChannel = supabase
            .channel(`session_participants_${id}`)
            .on(
                'postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'participants', filter: `session_id=eq.${id}` },
                (payload) => {
                    setParticipants((prev) => [...prev, payload.new as Participant]);
                }
            )
            .subscribe();

        // 2. Listen for answers
        const answersChannel = supabase
            .channel(`session_answers_${id}`)
            .on(
                'postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'answers', filter: `session_id=eq.${id}` },
                () => {
                    setResponsesCount((prev) => prev + 1);
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(participantsChannel);
            supabase.removeChannel(answersChannel);
        };
    }, [id, fetchSessionData]);

    const startQuiz = async () => {
        if (questions.length === 0) return;

        const firstQuestion = questions[0];
        await supabase
            .from("sessions")
            .update({ status: "active", current_question_id: firstQuestion.id, started_at: new Date().toISOString() })
            .eq("id", id);

        setSession({ ...session, status: "active", current_question_id: firstQuestion.id });
        setCurrentQuestionIndex(0);
        setResponsesCount(0);
    };

    const nextQuestion = async () => {
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

    if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>;

    const joinUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/join?pin=${session.pin}`;

    return (
        <div className="min-h-screen bg-slate-900 text-white flex flex-col">
            {/* Top Bar */}
            <div className="p-6 flex justify-between items-center bg-slate-800/50 backdrop-blur-md">
                <div className="space-y-1">
                    <h2 className="text-xl font-bold">{quiz.title}</h2>
                    <div className="flex items-center gap-4 text-slate-400 text-sm">
                        <span className="flex items-center gap-1.5 font-medium">
                            <Users className="w-4 h-4" /> {participants.length} alumnos unidos
                        </span>
                    </div>
                </div>
                <button
                    onClick={() => router.push("/teacher/dashboard")}
                    className="p-2 hover:bg-slate-700 rounded-lg transition-colors border border-slate-700"
                >
                    <LogOut className="w-5 h-5" />
                </button>
            </div>

            <main className="flex-1 flex flex-col items-center justify-center p-8 text-center max-w-4xl mx-auto w-full">
                {session.status === "waiting" && (
                    <div className="space-y-12 animate-in fade-in zoom-in duration-500">
                        <div className="space-y-4">
                            <p className="text-slate-400 font-bold uppercase tracking-widest text-sm">Escanea para unirte</p>
                            <QRDisplay value={joinUrl} />
                            <div className="mt-8">
                                <p className="text-slate-500 mb-2">O ingresa el código en</p>
                                <h3 className="text-2xl font-medium tracking-tight">dominio.com/join</h3>
                                <h1 className="text-8xl font-black mt-4 tracking-tighter text-blue-500 drop-shadow-2xl">
                                    {session.pin}
                                </h1>
                            </div>
                        </div>

                        <button
                            onClick={startQuiz}
                            disabled={participants.length === 0}
                            className="px-12 py-5 bg-white text-slate-900 rounded-2xl font-black text-2xl hover:bg-blue-50 transition-all shadow-xl disabled:opacity-50 flex items-center gap-3 mx-auto"
                        >
                            <Play className="w-8 h-8 fill-current" />
                            EMPEZAR
                        </button>
                    </div>
                )}

                {session.status === "active" && currentQuestionIndex !== -1 && (
                    <div className="w-full space-y-12 animate-in slide-in-from-bottom-8 duration-500">
                        <div className="space-y-8">
                            <div className="flex justify-between items-end border-b border-slate-800 pb-6">
                                <div className="text-left">
                                    <p className="text-blue-500 font-bold mb-1 uppercase tracking-wider text-sm">Pregunta {currentQuestionIndex + 1} de {questions.length}</p>
                                    <h1 className="text-4xl font-extrabold tracking-tight max-w-2xl">{questions[currentQuestionIndex].question_text}</h1>
                                </div>
                                <div className="bg-slate-800/50 p-6 rounded-3xl border border-slate-700 min-w-[140px]">
                                    <p className="text-5xl font-black text-blue-500 mb-1">{responsesCount}</p>
                                    <p className="text-slate-500 font-medium text-xs uppercase tracking-widest">Respuestas</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                {questions[currentQuestionIndex].options.map((opt: string, i: number) => (
                                    <div key={i} className="bg-slate-800/30 p-8 rounded-3xl border border-slate-800 text-left flex items-center gap-4">
                                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm ${i === 0 ? "bg-red-500" : i === 1 ? "bg-blue-500" : i === 2 ? "bg-yellow-500" : "bg-green-500"}`}>
                                            {String.fromCharCode(65 + i)}
                                        </div>
                                        <span className="text-xl font-bold opacity-80">{opt}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <button
                            onClick={nextQuestion}
                            className="px-8 py-4 bg-blue-600 text-white rounded-2xl font-bold text-xl hover:bg-blue-700 transition-all flex items-center gap-2 mx-auto shadow-lg"
                        >
                            SIGUIENTE
                            <ChevronRight className="w-6 h-6" />
                        </button>
                    </div>
                )}

                {session.status === "finished" && (
                    <div className="space-y-8 animate-in zoom-in duration-500">
                        <div className="bg-slate-800/50 p-12 rounded-[3rem] border border-slate-700 shadow-2xl">
                            <Trophy className="w-24 h-24 text-yellow-500 mx-auto mb-6" />
                            <h1 className="text-5xl font-black mb-4 tracking-tight">¡Quiz Finalizado!</h1>
                            <p className="text-slate-400 text-lg mb-8 max-w-sm mx-auto font-medium">Todos los alumnos han terminado. Es hora de ver quién es el ganador.</p>
                            <div className="flex gap-4 justify-center">
                                <button className="px-8 py-4 bg-white text-slate-900 rounded-2xl font-bold hover:bg-slate-100 flex items-center gap-2">
                                    <BarChart3 className="w-5 h-5" />
                                    Ver Podio
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </main>

            {/* Bottom Participants ticker */}
            <div className="p-4 bg-slate-800/30 flex gap-4 overflow-hidden border-t border-slate-800">
                {participants.length === 0 ? (
                    <p className="text-slate-600 italic text-sm mx-auto">Esperando alumnos...</p>
                ) : (
                    <div className="flex gap-4 animate-marquee whitespace-nowrap">
                        {participants.map((p) => (
                            <div key={p.id} className="bg-slate-700/50 px-4 py-1.5 rounded-full text-sm font-bold border border-slate-600">
                                {p.nickname}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
