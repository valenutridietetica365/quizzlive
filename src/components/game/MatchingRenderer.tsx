"use client";

import { CheckCircle2, ArrowRight } from "lucide-react";
import { Question } from "@/lib/schemas";

interface MatchingRendererProps {
    currentQuestion: Question;
    matchingPairs: Record<string, string>;
    setMatchingPairs: (pairs: Record<string, string>) => void;
    selectedTerm: string | null;
    setSelectedTerm: (term: string | null) => void;
    shuffledMatches: string[];
    isSubmitting: boolean;
    answered: boolean;
    submitAnswer: (answer: string) => void;
    t: (key: string) => string;
}

export default function MatchingRenderer({
    currentQuestion,
    matchingPairs,
    setMatchingPairs,
    selectedTerm,
    setSelectedTerm,
    shuffledMatches,
    isSubmitting,
    answered,
    submitAnswer,
    t
}: MatchingRendererProps) {
    return (
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
    );
}
