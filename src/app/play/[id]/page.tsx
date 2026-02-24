"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useQuizStore } from "@/lib/store";
import { Loader2, CheckCircle2, Clock, Trophy, Frown } from "lucide-react";

interface Session {
    id: string;
    status: string;
    pin: string;
    current_question_id?: string;
}

interface Question {
    id: string;
    question_text: string;
    options: string[];
    correct_answer: string;
    points: number;
}

export default function StudentPlay() {
    const { id } = useParams();
    const router = useRouter();
    const { participantId, nickname } = useQuizStore();

    const [session, setSession] = useState<Session | null>(null);
    const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
    const [answered, setAnswered] = useState(false);
    const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
    const [loading, setLoading] = useState(true);

    const handleNewQuestion = useCallback(async (questionId: string) => {
        const { data: questionData } = await supabase
            .from("questions")
            .select("*")
            .eq("id", questionId)
            .single();

        setCurrentQuestion(questionData as Question);
        setAnswered(false);
        setIsCorrect(null);
    }, []);

    const fetchInitialState = useCallback(async () => {
        const { data: sessionData } = await supabase
            .from("sessions")
            .select("*")
            .eq("id", id)
            .single();

        setSession(sessionData as Session);
        if (sessionData?.current_question_id) {
            handleNewQuestion(sessionData.current_question_id);
        }
        setLoading(false);
    }, [id, handleNewQuestion]);

    useEffect(() => {
        if (!nickname || !participantId) {
            router.push("/join");
            return;
        }

        fetchInitialState();

        // Subscribe to Session changes
        const sessionChannel = supabase
            .channel(`play_session_${id}`)
            .on(
                'postgres_changes',
                { event: 'UPDATE', schema: 'public', table: 'sessions', filter: `id=eq.${id}` },
                (payload) => {
                    const newData = payload.new as Session;
                    setSession(newData);
                    if (newData.current_question_id !== session?.current_question_id) {
                        if (newData.current_question_id) {
                            handleNewQuestion(newData.current_question_id);
                        }
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(sessionChannel);
        };
    }, [id, nickname, participantId, fetchInitialState, handleNewQuestion, router, session?.current_question_id]);

    const submitAnswer = async (answer: string) => {
        if (answered || !currentQuestion) return;
        setAnswered(true);

        const correct = answer === currentQuestion.correct_answer;
        setIsCorrect(correct);

        const points = correct ? currentQuestion.points : 0;

        await supabase.from("answers").insert({
            participant_id: participantId,
            session_id: id,
            question_id: currentQuestion.id,
            answer_text: answer,
            is_correct: correct,
            points_awarded: points
        });
    };

    if (loading || !session) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col p-6 sm:p-12 items-center justify-center">
            {session.status === "waiting" && (
                <div className="max-w-md w-full text-center space-y-8 animate-in zoom-in duration-500">
                    <div className="bg-white p-12 rounded-[3rem] shadow-xl border border-slate-100 flex flex-col items-center gap-6">
                        <div className="w-24 h-24 bg-blue-50 rounded-full flex items-center justify-center animate-pulse">
                            <Clock className="w-12 h-12 text-blue-500" />
                        </div>
                        <div className="space-y-2">
                            <h1 className="text-3xl font-black text-slate-900">¡Estás dentro!</h1>
                            <p className="text-slate-500 font-medium">
                                Bienvenido, <span className="text-blue-600 font-bold">{nickname}</span>. Espera a que la profesora inicie el quiz.
                            </p>
                        </div>
                        <small className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">Esperando al anfitrión...</small>
                    </div>
                </div>
            )}

            {session.status === "active" && currentQuestion && (
                <div className="w-full max-w-2xl space-y-8">
                    {!answered ? (
                        <div className="space-y-8 animate-in slide-in-from-bottom-12 duration-500">
                            <h2 className="text-3xl font-black text-slate-900 text-center tracking-tight leading-tight">
                                {currentQuestion.question_text}
                            </h2>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {currentQuestion.options.map((opt, i) => (
                                    <button
                                        key={i}
                                        onClick={() => submitAnswer(opt)}
                                        className={`group p-8 rounded-[2rem] text-left transition-all active:scale-95 shadow-sm hover:shadow-xl border-b-8 ${i === 0 ? "bg-red-500 border-red-700" :
                                                i === 1 ? "bg-blue-500 border-blue-700" :
                                                    i === 2 ? "bg-yellow-500 border-yellow-700" :
                                                        "bg-green-500 border-green-700"
                                            }`}
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className="bg-white/20 w-10 h-10 rounded-xl flex items-center justify-center font-black text-white text-lg">
                                                {String.fromCharCode(65 + i)}
                                            </div>
                                            <span className="text-xl font-black text-white">{opt}</span>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <div className="text-center space-y-8 animate-in zoom-in duration-500">
                            <div className={`p-12 rounded-[3.5rem] shadow-2xl border-b-12 flex flex-col items-center gap-6 ${isCorrect ? "bg-green-500 border-green-700" : "bg-red-500 border-red-700"
                                }`}>
                                {isCorrect ? (
                                    <CheckCircle2 className="w-24 h-24 text-white" />
                                ) : (
                                    <Frown className="w-24 h-24 text-white" />
                                )}
                                <h1 className="text-5xl font-black text-white">{isCorrect ? "¡CORRECTO!" : "¡OH NO!"}</h1>
                                <p className="text-white/80 font-bold text-xl">
                                    {isCorrect ? "+1000 Puntos" : "Mejor suerte la próxima"}
                                </p>
                            </div>
                            <p className="text-slate-400 font-bold uppercase tracking-widest animate-pulse">
                                Espera a la siguiente pregunta...
                            </p>
                        </div>
                    )}
                </div>
            )}

            {session.status === "finished" && (
                <div className="max-w-md w-full text-center space-y-8 animate-in zoom-in duration-500">
                    <div className="bg-white p-12 rounded-[3rem] shadow-xl border border-slate-100 flex flex-col items-center gap-6">
                        <Trophy className="w-24 h-24 text-yellow-500" />
                        <div className="space-y-2">
                            <h1 className="text-4xl font-black text-slate-900 tracking-tight">¡Buen juego!</h1>
                            <p className="text-slate-500 font-medium">Mira el podio en la pantalla principal.</p>
                        </div>
                        <button
                            onClick={() => router.push("/")}
                            className="mt-4 px-8 py-4 bg-slate-900 text-white rounded-2xl font-bold hover:bg-slate-800 transition-all"
                        >
                            Volver al inicio
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
