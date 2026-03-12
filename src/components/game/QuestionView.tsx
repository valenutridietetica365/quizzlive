"use client";

import { useMemo } from "react";
import Image from "next/image";
import CircularTimer from "@/components/CircularTimer";
import HangmanView from "@/components/game/HangmanView";
import MultipleChoiceRenderer from "@/components/game/MultipleChoiceRenderer";
import FillInBlankRenderer from "@/components/game/FillInBlankRenderer";
import MatchingRenderer from "@/components/game/MatchingRenderer";
import RouletteWheel from "@/components/game/RouletteWheel";
import { Question, GameModeConfig } from "@/lib/schemas";
import { User, HelpCircle, Sparkles } from "lucide-react";

interface QuestionViewProps {
    currentQuestion: Question;
    startedAt: string | null;
    isSubmitting: boolean;
    answered: boolean;
    submitAnswer: (answer: string) => void;
    selectedOption: string | null;
    fillAnswer: string;
    setFillAnswer: (val: string) => void;
    matchingPairs: Record<string, string>;
    setMatchingPairs: (pairs: Record<string, string>) => void;
    selectedTerm: string | null;
    setSelectedTerm: (term: string | null) => void;
    shuffledMatches: string[];
    t: (key: string) => string;
    onTimeUp?: () => void;
    config?: GameModeConfig;
    gameMode?: string;
    rouletteItems?: string[];
    rouletteSpinning?: boolean;
    rouletteWinnerIndex?: number | null;
    rouletteType?: "participant" | "question" | null;
    userNickname?: string;
}

export default function QuestionView({
    currentQuestion,
    startedAt,
    isSubmitting,
    answered,
    submitAnswer,
    selectedOption,
    fillAnswer,
    setFillAnswer,
    matchingPairs,
    setMatchingPairs,
    selectedTerm,
    setSelectedTerm,
    shuffledMatches,
    t,
    onTimeUp,
    config,
    gameMode,
    rouletteItems = [],
    rouletteSpinning = false,
    rouletteWinnerIndex = null,
    rouletteType = null,
    userNickname
}: QuestionViewProps) {
    const isCurrentWinner = useMemo(() => {
        if (rouletteType !== "participant" || rouletteWinnerIndex === null || !userNickname) return false;
        const winnerName = rouletteItems[rouletteWinnerIndex]?.trim().toLowerCase();
        return winnerName === userNickname.trim().toLowerCase();
    }, [rouletteType, rouletteWinnerIndex, rouletteItems, userNickname]);

    const currentWinnerName = rouletteType === "participant" && rouletteWinnerIndex !== null
        ? rouletteItems[rouletteWinnerIndex]
        : null;

    return (
        <div className="w-full space-y-4 md:space-y-6 animate-in slide-in-from-bottom-12 duration-700">
            {gameMode === "roulette" && (
                <div className="flex flex-col gap-6">
                    {/* Main Roulette Container */}
                    <div className="bg-white/80 backdrop-blur-md p-8 rounded-[3rem] shadow-xl border border-white flex flex-col items-center gap-6 text-center overflow-hidden relative">
                        {isCurrentWinner && (
                            <div className="absolute inset-0 bg-blue-500/5 animate-pulse pointer-events-none" />
                        )}

                        <div className="space-y-2 z-10 w-full">
                            <h3 className="text-blue-600 font-black uppercase tracking-[0.2em] text-[10px]">
                                {rouletteType === "participant" ? t('roulette.spin_participant') : t('roulette.spin_question')}
                            </h3>
                            {rouletteWinnerIndex === null && !rouletteSpinning && (
                                <p className="text-slate-400 font-medium animate-pulse">{t('roulette.waiting_spin')}</p>
                            )}
                        </div>

                        <div className="z-10 w-full flex justify-center">
                            <RouletteWheel
                                items={rouletteItems}
                                spinning={rouletteSpinning}
                                winnerIndex={rouletteWinnerIndex}
                                onFinish={() => { }}
                            />
                        </div>

                        {rouletteWinnerIndex !== null && !rouletteSpinning && (
                            <div className="animate-in zoom-in duration-500 space-y-4 z-10 w-full">
                                {rouletteType === "participant" ? (
                                    <div className="space-y-4">
                                        {isCurrentWinner ? (
                                            <div className="bg-blue-600 p-6 rounded-[2rem] text-white shadow-2xl shadow-blue-500/40 animate-bounce mt-4">
                                                <div className="flex items-center justify-center gap-2 mb-1">
                                                    <Sparkles className="w-5 h-5 fill-white" />
                                                    <span className="font-black text-xs tracking-widest uppercase">{t('roulette.your_turn')}</span>
                                                    <Sparkles className="w-5 h-5 fill-white" />
                                                </div>
                                                <p className="text-4xl font-black truncate">{userNickname}</p>
                                            </div>
                                        ) : (
                                            <div className="bg-slate-100 p-6 rounded-[2rem] text-slate-800 border border-slate-200 mt-4">
                                                <div className="flex items-center justify-center gap-2 mb-1">
                                                    <User className="w-4 h-4 text-slate-400" />
                                                    <span className="font-black text-xs tracking-widest uppercase text-slate-400">Seleccionado</span>
                                                </div>
                                                <p className="text-3xl font-black truncate">{currentWinnerName}</p>
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <div className="space-y-6 pt-4 border-t border-slate-100 mt-2">
                                        <div className="bg-amber-500/10 p-2 rounded-xl inline-flex items-center gap-2 text-amber-600 border border-amber-500/20">
                                            <HelpCircle className="w-4 h-4" />
                                            <span className="text-[10px] font-black uppercase tracking-widest">{t('roulette.selected_question')}</span>
                                        </div>
                                        <div className="bg-white p-8 rounded-[2.5rem] shadow-inner border border-slate-100 relative group transition-transform hover:scale-[1.02]">
                                            <h2 className="text-2xl md:text-4xl font-black text-slate-900 leading-tight">
                                                &quot;{rouletteItems[rouletteWinnerIndex]}&quot;
                                            </h2>
                                            <div className="absolute -top-3 -right-3 w-10 h-10 bg-amber-500 rounded-2xl flex items-center justify-center text-white rotate-12 shadow-lg">
                                                <HelpCircle className="w-6 h-6" />
                                            </div>
                                        </div>
                                        <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">
                                            {t('roulette.instruction')}
                                        </p>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {gameMode !== "roulette" && (
                <>
                    {/* Circular Timer (Self-managed) - Disabled for Hangman Mode */}
                    {startedAt !== null && !answered && gameMode !== "hangman" && currentQuestion.question_type !== "hangman" && (
                        <div className="flex justify-center -mb-2">
                            <div className="scale-75 md:scale-100 origin-center">
                                <CircularTimer
                                    startedAt={startedAt}
                                    timeLimit={currentQuestion.time_limit || 20}
                                    size="sm"
                                    onTimeUp={onTimeUp}
                                />
                            </div>
                        </div>
                    )}

                    <div className="text-center space-y-1 px-4 mb-4">
                        <h2 className="text-xl md:text-3xl font-black text-slate-800 dark:text-white tracking-tight leading-tight">
                            {currentQuestion.question_text}
                        </h2>
                    </div>

                    {currentQuestion.image_url && (
                        <div className="w-full aspect-video rounded-3xl md:rounded-[2.5rem] overflow-hidden border-4 border-white shadow-2xl relative">
                            <Image src={currentQuestion.image_url} alt="Question" fill className="object-cover" unoptimized />
                            <div className="absolute inset-0 bg-gradient-to-t from-slate-900/20 to-transparent" />
                        </div>
                    )}

                    {(gameMode === "hangman" || currentQuestion.question_type === "hangman") && currentQuestion.question_type !== "matching" ? (
                        <div className="space-y-6">
                            {(() => {
                                let targetWord = currentQuestion.correct_answer || "";

                                if (currentQuestion.question_type === "multiple_choice" || currentQuestion.question_type === "true_false") {
                                    const matchingOption = currentQuestion.options.find(opt => {
                                        const normalizedOpt = opt.trim().toUpperCase();
                                        const normalizedCorrect = targetWord.trim().toUpperCase();
                                        if (normalizedOpt === normalizedCorrect) return true;
                                        const prefixMatch = normalizedOpt.match(/^[A-Z0-9][.)\-:]+\s*(.*)/);
                                        if (prefixMatch && normalizedOpt.startsWith(normalizedCorrect)) return true;
                                        return false;
                                    });
                                    if (matchingOption) targetWord = matchingOption;
                                }

                                return (
                                    <HangmanView
                                        key={currentQuestion.id}
                                        word={targetWord}
                                        options={currentQuestion.options}
                                        onComplete={submitAnswer}
                                        isSubmitting={isSubmitting}
                                        config={config}
                                        t={t}
                                    />
                                );
                            })()}
                        </div>
                    ) : currentQuestion.question_type === "multiple_choice" || currentQuestion.question_type === "true_false" ? (
                        <MultipleChoiceRenderer
                            currentQuestion={currentQuestion}
                            isSubmitting={isSubmitting}
                            answered={answered}
                            submitAnswer={submitAnswer}
                            selectedOption={selectedOption}
                        />
                    ) : currentQuestion.question_type === "fill_in_the_blank" ? (
                        <FillInBlankRenderer
                            fillAnswer={fillAnswer}
                            setFillAnswer={setFillAnswer}
                            isSubmitting={isSubmitting}
                            answered={answered}
                            submitAnswer={submitAnswer}
                            t={t}
                        />
                    ) : currentQuestion.question_type === "matching" ? (
                        <MatchingRenderer
                            currentQuestion={currentQuestion}
                            matchingPairs={matchingPairs}
                            setMatchingPairs={setMatchingPairs}
                            selectedTerm={selectedTerm}
                            setSelectedTerm={setSelectedTerm}
                            shuffledMatches={shuffledMatches}
                            isSubmitting={isSubmitting}
                            answered={answered}
                            submitAnswer={submitAnswer}
                            t={t}
                        />
                    ) : null}
                </>
            )}
        </div>
    );
}
