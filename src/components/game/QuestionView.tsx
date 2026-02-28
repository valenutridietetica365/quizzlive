"use client";

import Image from "next/image";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import CircularTimer from "@/components/CircularTimer";
import HangmanView from "@/components/game/HangmanView";

import { Question } from "@/lib/schemas";

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
    onTimeUp
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

            {currentQuestion.question_type === "multiple_choice" || currentQuestion.question_type === "true_false" ? (
                <div className={`grid gap-3 w-full ${currentQuestion.question_type === "true_false" ? "grid-cols-2" : "grid-cols-1 sm:grid-cols-2"}`}>
                    {currentQuestion.options.map((opt: string, i: number) => (
                        <button
                            key={i}
                            disabled={isSubmitting || answered}
                            onClick={() => submitAnswer(opt)}
                            style={{ animationDelay: `${i * 100}ms` }}
                            className={`group p-3 md:p-6 rounded-lg md:rounded-2xl text-left transition-all active:scale-95 shadow-md border-b-[3px] flex flex-col justify-between h-24 sm:h-auto overflow-hidden relative animate-in fade-in slide-in-from-bottom-8 fill-mode-both ${(isSubmitting || answered) && selectedOption !== opt ? "opacity-50 grayscale" : ""} ${selectedOption === opt ? "scale-105 brightness-110 z-10 ring-2 ring-white shadow-xl" : ""
                                } ${currentQuestion.question_type === "true_false"
                                    ? (opt === "Verdadero" || opt === "True" ? "bg-blue-600 border-blue-800 shadow-blue-200" : "bg-red-600 border-red-800 shadow-red-200")
                                    : (i === 0 ? "bg-red-600 border-red-800 shadow-red-200" :
                                        i === 1 ? "bg-blue-600 border-blue-800 shadow-blue-200" :
                                            i === 2 ? "bg-amber-500 border-amber-700 shadow-amber-100" :
                                                "bg-emerald-600 border-emerald-800 shadow-emerald-100")
                                }`}
                        >
                            <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                            <div className="w-8 h-8 md:w-12 md:h-12 bg-white/20 rounded-lg md:rounded-2xl flex items-center justify-center font-black text-white text-base md:text-xl relative z-10">
                                {String.fromCharCode(65 + i)}
                            </div>
                            <span className="text-xl md:text-2xl font-black text-white mt-2 md:mt-4 relative z-10">{opt}</span>
                        </button>
                    ))}
                </div>
            ) : currentQuestion.question_type === "fill_in_the_blank" ? (
                <div className="w-full space-y-6">
                    <div className="bg-white p-8 rounded-[3rem] shadow-xl border-4 border-slate-100 relative group overflow-hidden">
                        <input
                            type="text"
                            placeholder="..."
                            className="w-full bg-transparent border-none focus:ring-0 text-3xl font-black text-slate-800 placeholder:text-slate-200 text-center"
                            value={fillAnswer}
                            disabled={isSubmitting || answered}
                            onChange={(e) => setFillAnswer(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && fillAnswer.trim() && !isSubmitting && submitAnswer(fillAnswer)}
                            autoFocus
                        />
                    </div>
                    <button
                        onClick={() => fillAnswer.trim() && !isSubmitting && submitAnswer(fillAnswer)}
                        disabled={!fillAnswer.trim() || isSubmitting || answered}
                        className="btn-premium w-full !rounded-[2rem] !py-6 !text-2xl flex items-center justify-center gap-4 active:scale-95 disabled:opacity-50 shadow-2xl shadow-blue-100"
                    >
                        {t('play.submit_answer')} <ArrowRight className="w-8 h-8" />
                    </button>
                </div>
            ) : currentQuestion.question_type === "matching" ? (
                <div className="w-full space-y-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
                        <div className="space-y-3">
                            <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest pl-2">{t('play.concepts')}</span>
                            {currentQuestion.options.map((pair: string, i: number) => {
                                const term = pair.split(":")[0];
                                const isPaired = matchingPairs[term];
                                const isSelected = selectedTerm === term;
                                return (
                                    <button
                                        key={i}
                                        onClick={() => !isPaired && setSelectedTerm(isSelected ? null : term)}
                                        className={`w-full p-4 md:p-5 rounded-xl md:rounded-2xl border-b-4 font-black transition-all text-left flex items-center justify-between text-sm md:text-base ${isPaired
                                            ? "bg-slate-100 border-slate-200 text-slate-300 cursor-not-allowed"
                                            : isSelected
                                                ? "bg-purple-600 border-purple-800 text-white scale-[1.02] md:scale-105 shadow-lg"
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
                            <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest pl-2">{t('play.pairs')}</span>
                            {shuffledMatches.map((match: string, i: number) => {
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
                                        className={`w-full p-4 md:p-5 rounded-xl md:rounded-2xl border-b-4 font-black transition-all text-left text-sm md:text-base ${isPaired
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

                    {Object.keys(matchingPairs).length > 0 && !answered && (
                        <button onClick={() => setMatchingPairs({})} className="text-[10px] font-black text-red-400 hover:text-red-500 uppercase tracking-widest w-full text-center">{t('play.reset_pairs')}</button>
                    )}

                    {Object.keys(matchingPairs).length === currentQuestion.options.length && !answered && (
                        <button
                            onClick={() => submitAnswer(JSON.stringify(matchingPairs))}
                            disabled={isSubmitting}
                            className="btn-premium w-full !rounded-[2rem] !py-6 !text-2xl flex items-center justify-center gap-4 active:scale-95 shadow-2xl shadow-blue-100"
                        >
                            {t('play.submit_answer')} <ArrowRight className="w-8 h-8" />
                        </button>
                    )}
                </div>
            ) : currentQuestion.question_type === "hangman" ? (
                <HangmanView
                    word={currentQuestion.correct_answer || ""}
                    onComplete={submitAnswer}
                    isSubmitting={isSubmitting}
                />
            ) : null}
        </div>
    );
}
