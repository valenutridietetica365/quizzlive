"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { User, HelpCircle, RotateCw, CheckCircle2, XCircle, Sparkles } from "lucide-react";
import RouletteWheel from "../game/RouletteWheel";
import { Participant, Question } from "@/lib/schemas";
import { toast } from "sonner";

interface RouletteControllerProps {
    sessionId: string;
    participants: Participant[];
    questions: Question[];
    t: (key: string) => string;
    manualPoints: number;
}

export default function RouletteController({ sessionId, participants, questions, t, manualPoints }: RouletteControllerProps) {
    const [remainingParticipants, setRemainingParticipants] = useState<Participant[]>([]);
    const [remainingQuestions, setRemainingQuestions] = useState<Question[]>([]);

    const [selectedParticipant, setSelectedParticipant] = useState<Participant | null>(null);
    const [selectedQuestion, setSelectedQuestion] = useState<Question | null>(null);

    const [spinningType, setSpinningType] = useState<"participant" | "question" | null>(null);
    const [winnerIndex, setWinnerIndex] = useState<number | null>(null);

    const [step, setStep] = useState<"initial" | "spinning_p" | "selected_p" | "spinning_q" | "selected_q" | "scoring">("initial");

    useEffect(() => {
        // Initialize remaining items if they are empty
        if (remainingParticipants.length === 0 && participants.length > 0) {
            setRemainingParticipants(participants.filter(p => !p.is_eliminated));
        }
        if (remainingQuestions.length === 0 && questions.length > 0) {
            setRemainingQuestions(questions);
        }
    }, [participants, questions, remainingParticipants.length, remainingQuestions.length]);

    const broadcastSpin = useCallback(async (type: "participant" | "question", index: number, items: string[]) => {
        await supabase.channel(`roulette_${sessionId}`).send({
            type: "broadcast",
            event: "spin",
            payload: { type, index, items }
        });
    }, [sessionId]);

    const spinParticipant = async () => {
        if (remainingParticipants.length === 0) {
            toast.error("No quedan más alumnos en la ruleta.");
            return;
        }

        const index = Math.floor(Math.random() * remainingParticipants.length);
        setWinnerIndex(index);
        setSpinningType("participant");
        setStep("spinning_p");

        await broadcastSpin("participant", index, remainingParticipants.map(p => p.nickname));
    };

    const spinQuestion = async () => {
        if (remainingQuestions.length === 0) {
            toast.error("No quedan más preguntas en el cuestionario.");
            return;
        }

        const index = Math.floor(Math.random() * remainingQuestions.length);
        setWinnerIndex(index);
        setSpinningType("question");
        setStep("spinning_q");

        await broadcastSpin("question", index, remainingQuestions.map(q => q.question_text));
    };

    const onFinishSpin = (winner: string) => {
        setWinnerIndex(null);
        setSpinningType(null);

        if (step === "spinning_p") {
            const p = remainingParticipants.find(p => p.nickname === winner);
            if (p) {
                setSelectedParticipant(p);
                setStep("selected_p");
            }
        } else if (step === "spinning_q") {
            const q = remainingQuestions.find(q => q.question_text === winner);
            if (q) {
                setSelectedQuestion(q);
                setStep("selected_q");

                // Automatically move to scoring after showing the question
                setTimeout(() => setStep("scoring"), 2000);
            }
        }
    };

    const handleScore = async (correct: boolean) => {
        if (!selectedParticipant || !selectedQuestion) return;

        const points = correct ? manualPoints : 0;

        const { error } = await supabase.rpc("award_manual_points", {
            p_session_id: sessionId,
            p_participant_id: selectedParticipant.id,
            p_question_id: selectedQuestion.id,
            p_points: points
        });

        if (error) {
            toast.error("Error al asignar puntos.");
            return;
        }

        toast.success(correct ? "¡Puntos asignados!" : "Siguiente turno.");

        // Remove from remaining
        setRemainingParticipants(prev => prev.filter(p => p.id !== selectedParticipant.id));
        setRemainingQuestions(prev => prev.filter(q => q.id !== selectedQuestion.id));

        // Reset state for next round
        setSelectedParticipant(null);
        setSelectedQuestion(null);
        setStep("initial");

        // Broadcast reset to students
        await supabase.channel(`roulette_${sessionId}`).send({
            type: "broadcast",
            event: "reset",
            payload: {}
        });
    };

    return (
        <div className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-2 gap-8 items-center bg-slate-900/40 p-8 rounded-[3rem] border border-white/5 backdrop-blur-xl">

            {/* Left side: Roulette Panel */}
            <div className="space-y-6 flex flex-col items-center">
                <div className="bg-slate-800/50 p-6 rounded-[2.5rem] border border-white/5 w-full">
                    <h3 className="text-blue-400 font-black uppercase tracking-[0.2em] text-[10px] mb-4 text-center">
                        {step.includes("_p") ? "Sorteo de Alumnos" : "Sorteo de Preguntas"}
                    </h3>

                    <RouletteWheel
                        items={step.includes("_q") || step === "selected_q" || step === "scoring"
                            ? remainingQuestions.map(q => q.question_text)
                            : remainingParticipants.map(p => p.nickname)}
                        spinning={spinningType !== null}
                        winnerIndex={winnerIndex}
                        onFinish={onFinishSpin}
                    />
                </div>

                {step === "initial" && (
                    <button
                        onClick={spinParticipant}
                        className="btn-premium w-full !rounded-2xl flex items-center justify-center gap-3 !py-4"
                    >
                        <RotateCw className="w-5 h-5" />
                        {t('roulette.spin_participant')}
                    </button>
                )}

                {step === "selected_p" && (
                    <button
                        onClick={spinQuestion}
                        className="btn-premium w-full !bg-amber-500 !text-white !rounded-2xl flex items-center justify-center gap-3 !py-4"
                    >
                        <HelpCircle className="w-5 h-5" />
                        {t('roulette.spin_question')}
                    </button>
                )}
            </div>

            {/* Right side: Status and Controls */}
            <div className="space-y-6">
                <div className="bg-white/5 p-8 rounded-[2.5rem] border border-white/10 min-h-[300px] flex flex-col items-center justify-center text-center gap-6">
                    {step === "initial" && (
                        <div className="space-y-4 animate-in fade-in zoom-in duration-500">
                            <div className="w-16 h-16 bg-blue-500/20 rounded-2xl flex items-center justify-center text-blue-400 mx-auto">
                                <Sparkles className="w-8 h-8" />
                            </div>
                            <h2 className="text-2xl font-black">{t('roulette.name')}</h2>
                            <p className="text-slate-400 text-sm font-medium">{t('roulette.desc')}</p>
                        </div>
                    )}

                    {(step === "spinning_p" || step === "selected_p" || step === "spinning_q" || step === "selected_q" || step === "scoring") && selectedParticipant && (
                        <div className="space-y-4 animate-in slide-in-from-bottom-4 duration-500">
                            <div className="w-20 h-20 bg-blue-600 rounded-[2rem] flex items-center justify-center text-white shadow-xl shadow-blue-500/20 mx-auto">
                                <User className="w-10 h-10" />
                            </div>
                            <div>
                                <h3 className="text-blue-400 font-black uppercase tracking-widest text-xs mb-1">Participante Elegido</h3>
                                <p className="text-3xl font-black text-white">{selectedParticipant.nickname}</p>
                            </div>
                        </div>
                    )}

                    {(step === "selected_q" || step === "scoring") && selectedQuestion && (
                        <div className="space-y-4 animate-in slide-in-from-bottom-4 duration-500 border-t border-white/5 pt-6 mt-2 w-full">
                            <h3 className="text-amber-400 font-black uppercase tracking-widest text-xs mb-1">Pregunta Seleccionada</h3>
                            <p className="text-xl font-bold text-slate-200 line-clamp-3">{selectedQuestion.question_text}</p>
                        </div>
                    )}

                    {step === "scoring" && (
                        <div className="grid grid-cols-2 gap-4 w-full mt-4 animate-in fade-in duration-700">
                            <button
                                onClick={() => handleScore(true)}
                                className="flex flex-col items-center gap-2 p-4 bg-emerald-500/10 hover:bg-emerald-500 text-emerald-400 hover:text-white rounded-3xl border border-emerald-500/20 transition-all font-black"
                            >
                                <CheckCircle2 className="w-8 h-8" />
                                {t('roulette.correct')}
                            </button>
                            <button
                                onClick={() => handleScore(false)}
                                className="flex flex-col items-center gap-2 p-4 bg-red-500/10 hover:bg-red-500 text-red-400 hover:text-white rounded-3xl border border-red-500/20 transition-all font-black"
                            >
                                <XCircle className="w-8 h-8" />
                                {t('roulette.incorrect')}
                            </button>
                        </div>
                    )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="bg-slate-800/80 p-4 rounded-3xl border border-white/5 flex flex-col items-center">
                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Alumnos Restantes</span>
                        <span className="text-2xl font-black text-white">{remainingParticipants.length}</span>
                    </div>
                    <div className="bg-slate-800/80 p-4 rounded-3xl border border-white/5 flex flex-col items-center">
                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Preguntas Restantes</span>
                        <span className="text-2xl font-black text-white">{remainingQuestions.length}</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
