"use client";

import { Question } from "@/lib/schemas";

interface MultipleChoiceRendererProps {
    currentQuestion: Question;
    isSubmitting: boolean;
    answered: boolean;
    submitAnswer: (answer: string) => void;
    selectedOption: string | null;
}

export default function MultipleChoiceRenderer({ currentQuestion, isSubmitting, answered, submitAnswer, selectedOption }: MultipleChoiceRendererProps) {
    return (
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
    );
}
