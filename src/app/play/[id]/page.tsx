"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useQuizStore } from "@/lib/store";
import { Loader2, CheckCircle2, Clock, Trophy, Frown, Sparkles, ArrowRight } from "lucide-react";
import Image from "next/image";

interface Session {
    id: string;
    status: string;
    pin: string;
    current_question_id?: string;
}

interface Question {
    id: string;
    question_text: string;
    question_type: "multiple_choice" | "true_false" | "fill_in_the_blank" | "matching";
    options: string[];
    correct_answer: string;
    image_url?: string;
    points: number;
    time_limit: number;
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
    const [selectedOption, setSelectedOption] = useState<string | null>(null);
    const [totalScore, setTotalScore] = useState<number | null>(null);
    const [fetchingScore, setFetchingScore] = useState(false);
    const [questionStartTime, setQuestionStartTime] = useState<number>(0);
    const [pointsEarned, setPointsEarned] = useState<number>(0);

    // States for new question types
    const [fillAnswer, setFillAnswer] = useState("");
    const [matchingPairs, setMatchingPairs] = useState<{ [key: string]: string }>({});
    const [selectedTerm, setSelectedTerm] = useState<string | null>(null);
    const [shuffledMatches, setShuffledMatches] = useState<string[]>([]);

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

        if (questionData) {
            const q = questionData as Question;
            setCurrentQuestion(q);
            setAnswered(false);
            setIsCorrect(null);
            setPointsEarned(0);
            setQuestionStartTime(Date.now());
            setSelectedOption(null);
            setFillAnswer("");
            setMatchingPairs({});
            setSelectedTerm(null);

            if (q.question_type === "matching") {
                const matches = q.options.map(opt => opt.split(":")[1]);
                setShuffledMatches([...matches].sort(() => Math.random() - 0.5));
            }
        }
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
                    const newData = payload.new as Session;
                    setSession(newData);
                    if (newData.status === "finished") {
                        fetchTotalScore();
                    }
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
    }, [id, nickname, participantId, fetchInitialState, handleNewQuestion, router, session?.current_question_id, session?.status, totalScore, fetchingScore, fetchTotalScore]);

    const submitAnswer = async (answer: string) => {
        if (answered || !currentQuestion) return;
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
        playSound(correct ? "correct" : "wrong");

        let points = 0;
        if (correct) {
            const timeTaken = (Date.now() - questionStartTime) / 1000;
            const timeLimit = currentQuestion.time_limit || 20;
            const percentage = Math.min(timeTaken / timeLimit, 1);
            points = Math.round(currentQuestion.points * (1 - (percentage / 2)));
        }

        setPointsEarned(points);

        await supabase.from("answers").insert({
            participant_id: participantId,
            session_id: id,
            question_id: currentQuestion.id,
            answer_text: currentQuestion.question_type === "matching" ? JSON.stringify(matchingPairs) : answer,
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
                    <div className="bg-white p-12 rounded-[3.5rem] shadow-xl border border-slate-100 flex flex-col items-center gap-8 relative overflow-hidden">
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
                        <div className="flex items-center gap-2 justify-center relative z-10">
                            <Clock className="w-4 h-4 text-slate-400" />
                            <small className="text-slate-400 font-black uppercase tracking-[0.2em] text-[10px]">Esperando al profesor...</small>
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
                                    <Image src={currentQuestion.image_url} alt="Question" fill className="object-cover" unoptimized />
                                    <div className="absolute inset-0 bg-gradient-to-t from-slate-900/20 to-transparent" />
                                </div>
                            )}

                            {currentQuestion.question_type === "multiple_choice" || currentQuestion.question_type === "true_false" ? (
                                <div className={`grid gap-4 w-full ${currentQuestion.question_type === "true_false" ? "grid-cols-2" : "grid-cols-1 sm:grid-cols-2"}`}>
                                    {currentQuestion.options.map((opt, i) => (
                                        <button
                                            key={i}
                                            onClick={() => submitAnswer(opt)}
                                            className={`group p-8 rounded-[2rem] text-left transition-all active:scale-95 shadow-lg border-b-[8px] flex flex-col justify-between h-48 sm:h-auto overflow-hidden relative ${selectedOption === opt ? "scale-105 brightness-110 z-10 ring-4 ring-white shadow-2xl" : ""
                                                } ${currentQuestion.question_type === "true_false"
                                                    ? (opt === "Verdadero" ? "bg-blue-600 border-blue-800 shadow-blue-200" : "bg-red-600 border-red-800 shadow-red-200")
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
                                            placeholder="Escribe tu respuesta..."
                                            className="w-full bg-transparent border-none focus:ring-0 text-3xl font-black text-slate-800 placeholder:text-slate-200 text-center"
                                            value={fillAnswer}
                                            onChange={(e) => setFillAnswer(e.target.value)}
                                            onKeyDown={(e) => e.key === 'Enter' && fillAnswer.trim() && submitAnswer(fillAnswer)}
                                            autoFocus
                                        />
                                    </div>
                                    <button
                                        onClick={() => fillAnswer.trim() && submitAnswer(fillAnswer)}
                                        disabled={!fillAnswer.trim()}
                                        className="btn-premium w-full !rounded-[2rem] !py-6 !text-2xl flex items-center justify-center gap-4 active:scale-95 disabled:opacity-50 shadow-2xl shadow-blue-100"
                                    >
                                        ENVIAR RESPUESTA <ArrowRight className="w-8 h-8" />
                                    </button>
                                </div>
                            ) : (
                                <div className="w-full space-y-8">
                                    <div className="grid grid-cols-2 gap-8">
                                        <div className="space-y-3">
                                            <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest pl-2">Conceptos</span>
                                            {currentQuestion.options.map((pair, i) => {
                                                const term = pair.split(":")[0];
                                                const isPaired = matchingPairs[term];
                                                const isSelected = selectedTerm === term;
                                                return (
                                                    <button
                                                        key={i}
                                                        onClick={() => !isPaired && setSelectedTerm(isSelected ? null : term)}
                                                        className={`w-full p-5 rounded-2xl border-b-4 font-black transition-all text-left flex items-center justify-between ${isPaired
                                                            ? "bg-slate-100 border-slate-200 text-slate-300 cursor-not-allowed"
                                                            : isSelected
                                                                ? "bg-purple-600 border-purple-800 text-white scale-105 shadow-lg"
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
                                            <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest pl-2">Parejas</span>
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
                                                        className={`w-full p-5 rounded-2xl border-b-4 font-black transition-all text-left ${isPaired
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
                                        <button onClick={() => setMatchingPairs({})} className="text-[10px] font-black text-red-400 hover:text-red-500 uppercase tracking-widest w-full text-center">Reiniciar parejas</button>
                                    )}

                                    <button
                                        onClick={() => submitAnswer("MATCHING_COMPLETE")}
                                        disabled={Object.keys(matchingPairs).length < currentQuestion.options.length}
                                        className="btn-premium w-full !bg-purple-600 hover:!bg-purple-700 !rounded-[2rem] !py-6 !text-2xl flex items-center justify-center gap-4 active:scale-95 disabled:opacity-50 shadow-2xl shadow-purple-100"
                                    >
                                        VERIFICAR PAREJAS <CheckCircle2 className="w-8 h-8" />
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
                                <h1 className="text-6xl font-black text-white tracking-tighter">{isCorrect ? "¡SÍÍÍ!" : "¡CASI!"}</h1>
                                <p className="text-white/90 font-black text-2xl uppercase tracking-widest">{isCorrect ? `+${pointsEarned.toLocaleString()} Puntos` : "A por la próxima"}</p>
                            </div>
                            <div className="flex flex-col items-center gap-3">
                                <div className="h-2 w-48 bg-slate-200 rounded-full overflow-hidden"><div className="h-full bg-blue-600 animate-pulse w-1/2" /></div>
                                <p className="text-slate-400 font-black text-xs uppercase tracking-[0.3em]">Siguiente pregunta en camino...</p>
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
                            <h1 className="text-5xl font-black text-slate-900 tracking-tight leading-none">¡Increíble, <span className="text-blue-600 font-black">{nickname}</span>!</h1>
                            <p className="text-lg text-slate-500 font-medium max-w-[280px] mx-auto">Has completado el desafío con éxito. Aquí tienes tu resultado:</p>
                        </div>
                        <div className="bg-slate-900 p-10 rounded-[3rem] w-full shadow-2xl shadow-slate-200 group relative">
                            <div className="absolute inset-0 bg-blue-600/10 opacity-50" />
                            <div className="relative z-10 flex flex-col items-center gap-2">
                                <span className="text-xs font-black text-blue-400 uppercase tracking-[0.4em] mb-2">PUNTUACIÓN TOTAL</span>
                                {fetchingScore ? <Loader2 className="w-12 h-12 animate-spin text-white" /> : <span className="text-7xl font-black text-white tracking-tighter tabular-nums">{(totalScore ?? 0).toLocaleString()}</span>}
                            </div>
                        </div>
                        <div className="w-full space-y-4">
                            <button onClick={() => router.push("/")} className="btn-premium w-full !bg-blue-600 !text-white !rounded-[2rem] !py-6 !text-xl flex items-center justify-center gap-3 shadow-xl shadow-blue-100">IR AL INICIO <ArrowRight className="w-6 h-6" /></button>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Gracias por jugar QuizzLive</p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
