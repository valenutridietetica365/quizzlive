"use client";

import Image from "next/image";
import CircularTimer from "@/components/CircularTimer";
import HangmanView from "@/components/game/HangmanView";
import MultipleChoiceRenderer from "@/components/game/MultipleChoiceRenderer";
import FillInBlankRenderer from "@/components/game/FillInBlankRenderer";
import MatchingRenderer from "@/components/game/MatchingRenderer";
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
    gameMode
}: QuestionViewProps) {
    return (
        <div className="w-full space-y-4 md:space-y-6 animate-in slide-in-from-bottom-12 duration-700">
            {/* Circular Timer (Self-managed) */}
            {startedAt !== null && !answered && (
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

                        // Intelligent Word Extraction for Hangman
                        // If correct_answer is short (e.g., "A", "1") or matches a prefix, find the full option text
                        if (currentQuestion.question_type === "multiple_choice" || currentQuestion.question_type === "true_false") {
                            const matchingOption = currentQuestion.options.find(opt => {
                                const normalizedOpt = opt.trim().toUpperCase();
                                const normalizedCorrect = targetWord.trim().toUpperCase();

                                // Match exact
                                if (normalizedOpt === normalizedCorrect) return true;

                                // Match prefix (e.g., correct is "A", option is "A) Paris")
                                const prefixMatch = normalizedOpt.match(/^[A-Z0-9][.)\-:]+\s*(.*)/);
                                if (prefixMatch && normalizedOpt.startsWith(normalizedCorrect)) return true;

                                return false;
                            });

                            if (matchingOption) {
                                targetWord = matchingOption;
                            }
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
        </div>
    );
}
