"use client";

import Image from "next/image";
import CircularTimer from "@/components/CircularTimer";
import HangmanView from "@/components/game/HangmanView";
import MultipleChoiceRenderer from "@/components/game/MultipleChoiceRenderer";
import FillInBlankRenderer from "@/components/game/FillInBlankRenderer";
import MatchingRenderer from "@/components/game/MatchingRenderer";
import RouletteWheel from "@/components/game/RouletteWheel";
import { Question, GameModeConfig } from "@/lib/schemas";

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
    rouletteType = null
}: QuestionViewProps) {
    return (
        <div className="w-full space-y-4 md:space-y-6 animate-in slide-in-from-bottom-12 duration-700">
            {gameMode === "roulette" && (
                <div className="bg-white/80 backdrop-blur-md p-8 rounded-[3rem] shadow-xl border border-white flex flex-col items-center gap-6 text-center">
                    <div className="space-y-2">
                        <h3 className="text-blue-600 font-black uppercase tracking-[0.2em] text-[10px]">
                            {rouletteType === "participant" ? t('roulette.spin_participant') : t('roulette.spin_question')}
                        </h3>
                        {rouletteWinnerIndex === null && !rouletteSpinning && (
                            <p className="text-slate-400 font-medium animate-pulse">{t('roulette.waiting_spin')}</p>
                        )}
                    </div>

                    <RouletteWheel
                        items={rouletteItems}
                        spinning={rouletteSpinning}
                        winnerIndex={rouletteWinnerIndex}
                        onFinish={() => { }}
                    />

                    {rouletteWinnerIndex !== null && !rouletteSpinning && (
                        <div className="animate-in zoom-in duration-500 space-y-2">
                            <p className="text-2xl font-black text-slate-900">
                                {rouletteType === "participant"
                                    ? t('roulette.selected_participant').replace('{name}', rouletteItems[rouletteWinnerIndex])
                                    : t('roulette.selected_question')
                                }
                            </p>
                            {rouletteType === "question" && (
                                <p className="text-lg font-bold text-blue-600 italic">&quot;{rouletteItems[rouletteWinnerIndex]}&quot;</p>
                            )}
                            {rouletteType === "question" && (
                                <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mt-4">
                                    {t('roulette.instruction')}
                                </p>
                            )}
                        </div>
                    )}
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

                    <div className="text-center space-y-1 px-1">
                        <h2 className="text-base md:text-3xl font-black text-slate-800 tracking-tight leading-tight">
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
