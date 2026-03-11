"use client";

import { CheckCircle2, Frown, Clock, Flame } from "lucide-react";
import Leaderboard from "@/components/Leaderboard";
import confetti from "canvas-confetti";
import { useEffect } from "react";

interface AnswerWaitingProps {
    isCorrect: boolean;
    pointsEarned: number;
    currentStreak: number;
    sessionId: string;
    participantId?: string;
    t: (key: string) => string;
    wasLate?: boolean;
}

export default function AnswerWaiting({
    isCorrect,
    pointsEarned,
    currentStreak,
    sessionId,
    participantId,
    t,
    wasLate
}: AnswerWaitingProps) {
    useEffect(() => {
        if (isCorrect && !wasLate) {
            // Basic burst
            confetti({
                particleCount: 100,
                spread: 70,
                origin: { y: 0.6 },
                colors: ['#10b981', '#3b82f6', '#f59e0b']
            });

            // If high streak, bigger celebration
            if (currentStreak >= 3) {
                const duration = 3 * 1000;
                const end = Date.now() + duration;

                const frame = () => {
                    confetti({
                        particleCount: 2,
                        angle: 60,
                        spread: 55,
                        origin: { x: 0 },
                        colors: ['#f59e0b', '#ef4444']
                    });
                    confetti({
                        particleCount: 2,
                        angle: 120,
                        spread: 55,
                        origin: { x: 1 },
                        colors: ['#f59e0b', '#ef4444']
                    });

                    if (Date.now() < end) {
                        requestAnimationFrame(frame);
                    }
                };
                frame();
            }
        }
    }, [isCorrect, wasLate, currentStreak]);

    if (wasLate) {
        return (
            <div className="w-full text-center space-y-10 animate-in zoom-in duration-700">
                <div className="p-16 rounded-[4rem] shadow-2xl border-b-[16px] bg-slate-100 border-slate-300 flex flex-col items-center gap-6">
                    <Clock className="w-32 h-32 text-slate-400 animate-in zoom-in-50" />
                    <h1 className="text-4xl font-black text-slate-800 tracking-tighter">
                        {t('play.joined_late_title') || "¡Llegaste justo a tiempo!"}
                    </h1>
                    <p className="text-slate-500 font-bold max-w-xs mx-auto">
                        {t('play.joined_late_subtitle') || "La pregunta ya terminó, pero prepárate para la siguiente."}
                    </p>
                </div>
                <div className="flex flex-col items-center gap-3">
                    <div className="h-2 w-48 bg-slate-200 rounded-full overflow-hidden">
                        <div className="h-full bg-blue-600 animate-pulse w-1/2" />
                    </div>
                    <p className="text-slate-400 font-black text-xs uppercase tracking-[0.3em]">
                        {t('play.next_question_coming')}
                    </p>
                </div>
                <div className="w-full bg-slate-950 rounded-[2rem] p-6 shadow-2xl">
                    <Leaderboard sessionId={sessionId} currentParticipantId={participantId} compact />
                </div>
            </div>
        );
    }

    return (
        <div className="w-full text-center space-y-10 animate-in zoom-in duration-700">
            <div className={`p-16 rounded-[4rem] shadow-2xl border-b-[16px] flex flex-col items-center gap-6 ${isCorrect
                ? "bg-emerald-500 border-emerald-700 shadow-emerald-200"
                : "bg-red-500 border-red-700 shadow-red-200"
                }`}>
                {isCorrect ? (
                    <CheckCircle2 className="w-32 h-32 text-white animate-in zoom-in-50" />
                ) : (
                    <Frown className="w-32 h-32 text-white animate-in zoom-in-50" />
                )}

                <h1 className="text-6xl font-black text-white tracking-tighter">
                    {isCorrect ? t('play.yes') : t('play.almost')}
                </h1>

                <div className="flex flex-col items-center gap-2">
                    <p className="text-white/90 font-black text-2xl uppercase tracking-widest">
                        {isCorrect
                            ? `+${pointsEarned.toLocaleString()} ${t('play.points_earned')}`
                            : t('play.next_adventure')}
                    </p>
                    {isCorrect && currentStreak > 1 && (
                        <div className="flex items-center gap-3 px-6 py-2 bg-white/20 backdrop-blur-sm rounded-full animate-bounce shadow-lg border border-white/20">
                            <Flame className={`w-5 h-5 ${currentStreak >= 5 ? "text-orange-400 animate-pulse" : "text-amber-300"}`} fill="currentColor" />
                            <span className="text-white font-black text-sm uppercase tracking-widest">
                                Racha de {currentStreak} 🔥
                            </span>
                        </div>
                    )}
                </div>
            </div>

            <div className="flex flex-col items-center gap-3">
                <div className="h-2 w-48 bg-slate-200 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-600 animate-pulse w-1/2" />
                </div>
                <p className="text-slate-400 font-black text-xs uppercase tracking-[0.3em]">
                    {t('play.next_question_coming')}
                </p>
            </div>

            {/* Live leaderboard after answering */}
            <div className="w-full bg-slate-950 rounded-[2rem] p-6 shadow-2xl">
                <Leaderboard sessionId={sessionId} currentParticipantId={participantId} compact />
            </div>
        </div>
    );
}
