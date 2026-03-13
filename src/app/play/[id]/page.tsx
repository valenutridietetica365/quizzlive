"use client";

import { useParams, useRouter } from "next/navigation";
import { useQuizStore } from "@/lib/store";
import { Loader2, Clock, Sparkles, ArrowRight, LogOut, Moon, Sun } from "lucide-react";
import { getTranslation } from "@/lib/i18n";
import { useState, useEffect } from "react";

import { StudentPlaySkeleton } from "@/components/Skeleton";
import AudioController from "@/components/AudioController";
import QuestionView from "@/components/game/QuestionView";
import AnswerWaiting from "@/components/game/AnswerWaiting";
import dynamic from "next/dynamic";
import { usePlaySession } from "@/hooks/usePlaySession";

const FinalPodium = dynamic(() => import("@/components/FinalPodium"), { ssr: false });
const Leaderboard = dynamic(() => import("@/components/Leaderboard"), { ssr: false });
const ParticipantMarquee = dynamic(() => import("@/components/game/ParticipantMarquee"), { ssr: false });

export default function StudentPlay() {
    const { id } = useParams();
    const router = useRouter();
    const { participantId, nickname, language, isEliminated } = useQuizStore();
    const t = (key: string) => getTranslation(language, key);
    const [isDark, setIsDark] = useState(false);

    useEffect(() => {
        if (isDark) {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
    }, [isDark]);

    const {
        session, participants, currentQuestion, loading,
        answered, setAnswered, isCorrect, isLate, setIsLate,
        selectedOption, totalScore, fetchingScore, pointsEarned, currentStreak,
        isSubmitting, timesUp, setTimesUp,
        fillAnswer, setFillAnswer, matchingPairs, setMatchingPairs,
        selectedTerm, setSelectedTerm, shuffledMatches, submitAnswer,
        rouletteItems, rouletteSpinning, rouletteWinnerIndex, rouletteType
    } = usePlaySession(id as string);

    if (loading || !session) return <StudentPlaySkeleton />;

    return (
        <div className={`min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col p-3 md:p-8 items-center justify-center transition-colors duration-500 selection:bg-blue-100`}>
            {/* Theme Toggle */}
            <button
                onClick={() => setIsDark(!isDark)}
                className="fixed top-4 right-4 z-[70] p-3 bg-white dark:bg-slate-800 rounded-2xl shadow-lg border border-slate-100 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:scale-110 transition-all"
            >
                {isDark ? <Sun className="w-5 h-5 text-amber-400" /> : <Moon className="w-5 h-5" />}
            </button>

            {(session.status === "active" || session.status === "waiting") && !isEliminated && (
                <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[60] scale-90 sm:scale-100">
                    <Leaderboard
                        sessionId={id as string}
                        currentParticipantId={participantId ?? undefined}
                        variant="minimal"
                    />
                </div>
            )}

            {session.status === "waiting" && (
                <div className="max-w-md w-full text-center space-y-10 animate-in zoom-in duration-700 mt-16 md:mt-0">
                    <div className="bg-white dark:bg-slate-900 p-12 rounded-[3.5rem] shadow-xl border border-slate-100 dark:border-slate-800 flex flex-col items-center gap-8 relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50/50 dark:bg-blue-900/10 rounded-bl-full -mr-8 -mt-8" />
                        <div className="w-24 h-24 bg-blue-600 rounded-[2rem] flex items-center justify-center text-white shadow-xl shadow-blue-200 dark:shadow-blue-900/20 animate-bounce">
                            <Sparkles className="w-12 h-12" />
                        </div>
                        <div className="space-y-3 relative z-10">
                            <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight">{t('play.waiting_title')}</h1>
                            <p className="text-lg text-slate-500 dark:text-slate-400 font-medium">
                                Hola <span className="text-blue-600 dark:text-blue-400 font-black">{nickname}</span>, {t('play.waiting_subtitle')}
                            </p>
                        </div>
                        <div className="flex items-center gap-2 justify-center relative z-10">
                            <Clock className="w-4 h-4 text-slate-400" />
                            <small className="text-slate-400 font-black uppercase tracking-[0.2em] text-[10px]">{t('play.waiting_teacher')}</small>
                        </div>
                    </div>
                </div>
            )}

            {session.status === "active" && (
                <div className="w-full max-w-2xl flex flex-col items-center mt-16 md:mt-0">
                    {isEliminated ? (
                        <div className="w-full text-center space-y-6 animate-in zoom-in duration-700">
                            <div className="p-12 rounded-[4rem] bg-red-900/20 border-b-[12px] border-red-900/40 flex flex-col items-center gap-6 shadow-xl backdrop-blur-md">
                                <div className="w-24 h-24 bg-red-600 rounded-[2rem] flex items-center justify-center text-white shadow-xl shadow-red-900/20 animate-bounce">
                                    <LogOut className="w-12 h-12 rotate-90" />
                                </div>
                                <h1 className="text-4xl font-black text-red-600">{t('game.eliminated')}</h1>
                                <p className="text-slate-500 font-bold max-w-xs text-balance">{t('game.eliminated_desc')}</p>
                            </div>
                        </div>
                    ) : !currentQuestion ? (
                        <div className="flex flex-col items-center gap-6 animate-pulse">
                            <div className="w-20 h-20 bg-blue-100 rounded-3xl flex items-center justify-center text-blue-500">
                                <Loader2 className="w-10 h-10 animate-spin" />
                            </div>
                            <p className="text-slate-400 font-black uppercase tracking-[0.3em] text-xs">{t('play.loading_next')}</p>
                        </div>
                    ) : timesUp ? (
                        <div className="w-full text-center space-y-6 animate-in zoom-in duration-700">
                            <div className="p-12 rounded-[4rem] bg-slate-800 border-b-[12px] border-slate-900 flex flex-col items-center gap-4 shadow-xl">
                                <Clock className="w-20 h-20 text-amber-400 animate-pulse" />
                                <h1 className="text-4xl font-black text-white">{t('play.time_up')}</h1>
                                <p className="text-slate-400 font-bold">{t('play.next_question_coming')}</p>
                            </div>
                        </div>
                    ) : !answered ? (
                        <QuestionView
                            currentQuestion={currentQuestion}
                            startedAt={session.current_question_started_at ?? null}
                            isSubmitting={isSubmitting}
                            answered={answered}
                            submitAnswer={submitAnswer}
                            selectedOption={selectedOption}
                            fillAnswer={fillAnswer}
                            setFillAnswer={setFillAnswer}
                            matchingPairs={matchingPairs}
                            setMatchingPairs={setMatchingPairs}
                            selectedTerm={selectedTerm}
                            setSelectedTerm={setSelectedTerm}
                            shuffledMatches={shuffledMatches}
                            t={t}
                            onTimeUp={() => {
                                if (!answered && !isSubmitting) setIsLate(true);
                                setTimesUp(true);
                                setAnswered(true);
                            }}
                            config={session.config}
                            gameMode={session.game_mode}
                            rouletteItems={rouletteItems}
                            rouletteSpinning={rouletteSpinning}
                            rouletteWinnerIndex={rouletteWinnerIndex}
                            rouletteType={rouletteType}
                            userNickname={nickname ?? undefined}
                        />
                    ) : (
                        <AnswerWaiting
                            isCorrect={isCorrect ?? false}
                            pointsEarned={pointsEarned}
                            currentStreak={currentStreak}
                            sessionId={id as string}
                            participantId={participantId ?? undefined}
                            t={t}
                            wasLate={isLate}
                        />
                    )}
                </div>
            )}

            {session.status === "finished" && (
                <div className="max-w-md w-full text-center space-y-6 animate-in zoom-in duration-700 relative z-[100] py-10">
                    <div className="bg-slate-900 p-4 md:p-8 rounded-[3rem] border border-white/5 shadow-2xl overflow-hidden min-h-[400px]">
                        <FinalPodium sessionId={id as string} highlightId={participantId ?? undefined} />
                    </div>
                    <div className="bg-white p-6 md:p-10 rounded-[3rem] shadow-2xl border border-slate-100 flex flex-col items-center gap-6">
                        <h1 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight leading-tight">
                            {t('play.incredible')}, <span className="text-blue-600">{nickname}</span>!
                        </h1>
                        <p className="text-slate-500 font-medium">{t('play.finished_subtitle')}</p>
                        <div className="bg-slate-900 p-6 md:p-8 rounded-[2rem] w-full">
                            <span className="text-xs font-black text-blue-400 uppercase tracking-[0.4em] block mb-2">{t('play.total_score')}</span>
                            {fetchingScore ? (
                                <Loader2 className="w-10 h-10 animate-spin text-white mx-auto" />
                            ) : (
                                <span className="text-5xl md:text-6xl font-black text-white tracking-tighter tabular-nums drop-shadow-lg">
                                    {(totalScore ?? 0).toLocaleString()}
                                </span>
                            )}
                        </div>
                        <button 
                            onClick={() => router.push("/")} 
                            className="btn-premium w-full !bg-blue-600 !text-white !rounded-[2rem] !py-4 md:!py-5 !text-lg md:!text-xl flex items-center justify-center gap-3 active:scale-95 transition-all shadow-xl shadow-blue-200"
                        >
                            {t('play.go_home')} <ArrowRight className="w-6 h-6" />
                        </button>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('play.thanks')}</p>
                    </div>
                </div>
            )}
            <AudioController type={session.status} />
            <div className="fixed bottom-0 left-0 right-0 z-50">
                <ParticipantMarquee participants={participants} waitingText={t('session.waiting_participants')} />
            </div>
        </div>
    );
}
