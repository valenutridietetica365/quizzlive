"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useQuizStore } from "@/lib/store";
import { Loader2, CheckCircle2, Clock, Trophy, Frown, Sparkles } from "lucide-react";
import Image from "next/image";
import { toast } from "sonner";

interface Session {
    id: string;
    status: string;
    pin: string;
    current_question_id?: string;
}

interface Question {
    id: string;
    question_text: string;
    question_type: "multiple_choice" | "true_false";
    options: string[];
    correct_answer: string;
    image_url?: string;
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

    const playSound = (type: "correct" | "wrong") => {
        const audio = new Audio(
            type === "correct"
                ? "https://assets.mixkit.co/active_storage/sfx/2000/2000-preview.mp3"
                : "https://assets.mixkit.co/active_storage/sfx/2001/2001-preview.mp3"
        );
        audio.play().catch(() => { });
    };

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
        playSound(correct ? "correct" : "wrong");

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
            <div className="min-h-screen flex items-center justify-center bg-white">
                <Loader2 className="w-10 h-10 animate-spin text-blue-600" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col p-6 md:p-12 items-center justify-center selection:bg-blue-100">
            {session.status === "waiting" && (
                <div className="max-w-md w-full text-center space-y-10 animate-in zoom-in duration-700">
                    <div className="bg-white p-12 rounded-[3.5rem] shadow-[0_24px_80px_-15px_rgba(0,0,0,0.08)] border border-slate-100 flex flex-col items-center gap-8 relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50/50 rounded-bl-[4rem] -mr-8 -mt-8" />

                        <div className="w-24 h-24 bg-blue-600 rounded-[2rem] flex items-center justify-center text-white shadow-xl shadow-blue-200 animate-bounce">
                            <Sparkles className="w-12 h-12" />
                        </div>

                        <div className="space-y-3 relative z-10">
                            <h1 className="text-4xl font-black text-slate-900 tracking-tight">¡Adentro!</h1>
                            <p className="text-lg text-slate-500 font-medium">
                                Hola <span className="text-blue-600 font-black">{nickname}</span>, prepárate. Esto va a empezar pronto.
                            </p>
                        </div>

                        <div className="space-y-1 relative z-10">
                            <div className="flex items-center gap-2 justify-center">
                                <Clock className="w-4 h-4 text-slate-400" />
                                <small className="text-slate-400 font-black uppercase tracking-[0.2em] text-[10px]">Esperando al profesor...</small>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {session.status === "active" && currentQuestion && (
                <div className="w-full max-w-2xl flex flex-col items-center">
                    {!answered ? (
                        <div className="w-full space-y-10 animate-in slide-in-from-bottom-12 duration-700">
                            <div className="text-center space-y-4 px-4">
                                <h2 className="text-3xl md:text-5xl font-black text-slate-900 tracking-tight leading-none">
                                    {currentQuestion.question_text}
                                </h2>
                            </div>

                            {currentQuestion.image_url && (
                                <div className="w-full aspect-video rounded-[2.5rem] overflow-hidden border-4 border-white shadow-2xl relative">
                                    <Image
                                        src={currentQuestion.image_url}
                                        alt="Question"
                                        fill
                                        className="object-cover"
                                        unoptimized
                                    />
                                    <div className="absolute inset-0 bg-gradient-to-t from-slate-900/20 to-transparent" />
                                </div>
                            )}

                            <div className={`grid gap-4 w-full ${currentQuestion.question_type === "true_false" ? "grid-cols-2" : "grid-cols-1 sm:grid-cols-2"}`}>
                                {currentQuestion.options.map((opt, i) => (
                                    <button
                                        key={i}
                                        onClick={() => submitAnswer(opt)}
                                        className={`group p-8 rounded-[2rem] text-left transition-all active:scale-95 shadow-lg border-b-[8px] flex flex-col justify-between h-48 sm:h-auto ${currentQuestion.question_type === "true_false"
                                            ? (opt === "Verdadero" ? "bg-blue-600 border-blue-800 shadow-blue-200" : "bg-red-600 border-red-800 shadow-red-200")
                                            : (i === 0 ? "bg-red-600 border-red-800 shadow-red-200" :
                                                i === 1 ? "bg-blue-600 border-blue-800 shadow-blue-200" :
                                                    i === 2 ? "bg-amber-500 border-amber-700 shadow-amber-100" :
                                                        "bg-emerald-600 border-emerald-800 shadow-emerald-100")
                                            }`}
                                    >
                                        <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center font-black text-white text-xl">
                                            {String.fromCharCode(65 + i)}
                                        </div>
                                        <span className="text-2xl font-black text-white mt-4">{opt}</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <div className="w-full text-center space-y-10 animate-in zoom-in duration-700">
                            <div className={`p-16 rounded-[4rem] shadow-2xl border-b-[16px] flex flex-col items-center gap-6 ${isCorrect
                                ? "bg-emerald-500 border-emerald-700 shadow-emerald-200"
                                : "bg-red-500 border-red-700 shadow-red-200"
                                }`}>
                                {isCorrect ? (
                                    <CheckCircle2 className="w-32 h-32 text-white animate-in zoom-in-50 duration-500" />
                                ) : (
                                    <Frown className="w-32 h-32 text-white animate-in zoom-in-50 duration-500" />
                                )}
                                <h1 className="text-6xl font-black text-white tracking-tighter">
                                    {isCorrect ? "¡SÍÍÍ!" : "¡CASI!"}
                                </h1>
                                <p className="text-white/90 font-black text-2xl uppercase tracking-widest">
                                    {isCorrect ? "+1,000 Puntos" : "A por la próxima"}
                                </p>
                            </div>
                            <div className="flex flex-col items-center gap-3">
                                <div className="h-2 w-48 bg-slate-200 rounded-full overflow-hidden">
                                    <div className="h-full bg-blue-600 animate-pulse w-1/2" />
                                </div>
                                <p className="text-slate-400 font-black text-xs uppercase tracking-[0.3em]">
                                    Siguiente pregunta en camino...
                                </p>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {session.status === "finished" && (
                <div className="max-w-md w-full text-center space-y-10 animate-in zoom-in duration-700">
                    <div className="bg-white p-16 rounded-[4rem] shadow-2xl border border-slate-100 flex flex-col items-center gap-8 relative overflow-hidden">
                        <div className="absolute inset-0 bg-blue-50/30 opacity-50 -z-10" />
                        <Trophy className="w-32 h-32 text-amber-500 animate-float" />
                        <div className="space-y-3">
                            <h1 className="text-5xl font-black text-slate-900 tracking-tight leading-none">¡Juego <span className="text-blue-600">terminado!</span></h1>
                            <p className="text-lg text-slate-500 font-medium">
                                Lo has hecho increíble. Mira la pantalla principal para descubrir quién ganó.
                            </p>
                        </div>
                        <button
                            onClick={() => router.push("/")}
                            className="btn-premium !bg-slate-900 !rounded-[2rem] w-full mt-4"
                        >
                            IR AL INICIO
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
