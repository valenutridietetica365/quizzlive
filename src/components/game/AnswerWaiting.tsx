import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, Frown, Clock, Flame } from "lucide-react";
import Leaderboard from "@/components/Leaderboard";
import confetti from "canvas-confetti";
import { useEffect, useState } from "react";

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
    const [displayPoints, setDisplayPoints] = useState(0);

    useEffect(() => {
        if (isCorrect && !wasLate) {
            // Success burst
            const end = Date.now() + (currentStreak >= 3 ? 2000 : 500);
            const colors = isCorrect ? ['#10b981', '#34d399', '#ffffff'] : ['#ef4444', '#f87171'];

            const frame = () => {
                confetti({
                    particleCount: 2,
                    angle: 60,
                    spread: 55,
                    origin: { x: 0 },
                    colors: colors
                });
                confetti({
                    particleCount: 2,
                    angle: 120,
                    spread: 55,
                    origin: { x: 1 },
                    colors: colors
                });

                if (Date.now() < end) {
                    requestAnimationFrame(frame);
                }
            };
            frame();

            // Animate points counter
            const duration = 1000;
            const startTime = performance.now();

            const animatePoints = (now: number) => {
                const progress = Math.min((now - startTime) / duration, 1);
                const current = Math.floor(progress * pointsEarned);
                setDisplayPoints(current);
                if (progress < 1) {
                    requestAnimationFrame(animatePoints);
                }
            };
            requestAnimationFrame(animatePoints);
        }
    }, [isCorrect, wasLate, currentStreak, pointsEarned]);

    if (wasLate) {
        return (
            <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="w-full text-center space-y-10"
            >
                <div className="p-16 rounded-[4rem] shadow-2xl border-b-[16px] bg-slate-100 border-slate-300 flex flex-col items-center gap-6">
                    <Clock className="w-32 h-32 text-slate-400" />
                    <h1 className="text-4xl font-black text-slate-800 tracking-tighter">
                        {t('play.joined_late_title') || "¡Llegaste justo a tiempo!"}
                    </h1>
                    <p className="text-slate-500 font-bold max-w-xs mx-auto">
                        {t('play.joined_late_subtitle') || "La pregunta ya terminó, pero prepárate para la siguiente."}
                    </p>
                </div>
                <div className="flex flex-col items-center gap-3">
                    <div className="h-2 w-48 bg-slate-200 rounded-full overflow-hidden">
                        <motion.div 
                            className="h-full bg-blue-600"
                            animate={{ x: ["-100%", "200%"] }}
                            transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                        />
                    </div>
                    <p className="text-slate-400 font-black text-xs uppercase tracking-[0.3em]">
                        {t('play.next_question_coming')}
                    </p>
                </div>
                <div className="w-full bg-slate-950 rounded-[2rem] p-6 shadow-2xl">
                    <Leaderboard sessionId={sessionId} currentParticipantId={participantId} compact />
                </div>
            </motion.div>
        );
    }

    return (
        <motion.div 
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full text-center space-y-10"
        >
            <motion.div 
                layout
                className={`p-16 rounded-[4rem] shadow-2xl border-b-[16px] flex flex-col items-center gap-6 ${isCorrect
                    ? "bg-emerald-500 border-emerald-700 shadow-emerald-200/50"
                    : "bg-red-500 border-red-700 shadow-red-200/50"
                }`}
            >
                <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", damping: 10, stiffness: 100 }}
                >
                    {isCorrect ? (
                        <CheckCircle2 className="w-32 h-32 text-white" />
                    ) : (
                        <Frown className="w-32 h-32 text-white" />
                    )}
                </motion.div>

                <motion.h1 
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.2 }}
                    className="text-6xl font-black text-white tracking-tighter"
                >
                    {isCorrect ? t('play.yes') : t('play.almost')}
                </motion.h1>

                <div className="flex flex-col items-center gap-4">
                    <motion.p 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.4 }}
                        className="text-white/90 font-black text-2xl uppercase tracking-widest tabular-nums"
                    >
                        {isCorrect
                            ? `+${displayPoints.toLocaleString()} ${t('play.points_earned')}`
                            : t('play.next_adventure')}
                    </motion.p>

                    <AnimatePresence>
                        {isCorrect && currentStreak > 1 && (
                            <motion.div 
                                initial={{ scale: 0, rotate: -20 }}
                                animate={{ scale: 1, rotate: 0 }}
                                exit={{ scale: 0, opacity: 0 }}
                                transition={{ type: "spring", damping: 12 }}
                                className="flex items-center gap-3 px-8 py-3 bg-white/20 backdrop-blur-md rounded-full shadow-lg border border-white/30"
                            >
                                <motion.div
                                    animate={{ scale: [1, 1.3, 1], rotate: [0, 10, -10, 0] }}
                                    transition={{ duration: 1, repeat: Infinity }}
                                >
                                    <Flame className={`w-6 h-6 ${currentStreak >= 5 ? "text-orange-400" : "text-amber-300"}`} fill="currentColor" />
                                </motion.div>
                                <span className="text-white font-black text-lg tracking-tight">
                                    ¡RACHA DE {currentStreak}! 🔥
                                </span>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </motion.div>

            <div className="flex flex-col items-center gap-3">
                <div className="h-2 w-48 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                    <motion.div 
                        className="h-full bg-blue-600"
                        animate={{ x: ["-100%", "200%"] }}
                        transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                    />
                </div>
                <p className="text-slate-400 font-black text-xs uppercase tracking-[0.3em]">
                    {t('play.next_question_coming')}
                </p>
            </div>

            <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
                className="w-full bg-slate-950 rounded-[2rem] p-6 shadow-2xl border border-white/5"
            >
                <Leaderboard sessionId={sessionId} currentParticipantId={participantId} compact />
            </motion.div>
        </motion.div>
    );
}
