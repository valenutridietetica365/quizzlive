"use client";

import { CheckCircle2, Frown, Sparkles, Clock } from "lucide-react";
import Leaderboard from "@/components/Leaderboard";

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
                        <div className="flex items-center gap-2 px-4 py-1 bg-white/20 rounded-full animate-bounce">
                            <Sparkles className="w-4 h-4 text-amber-300" />
                            <span className="text-white font-black text-xs uppercase tracking-widest">
                                {currentStreak} {t('play.streak_fire')} 🔥
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
