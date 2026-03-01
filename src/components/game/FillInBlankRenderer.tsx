"use client";

import { ArrowRight } from "lucide-react";

interface FillInBlankRendererProps {
    fillAnswer: string;
    setFillAnswer: (val: string) => void;
    isSubmitting: boolean;
    answered: boolean;
    submitAnswer: (answer: string) => void;
    t: (key: string) => string;
}

export default function FillInBlankRenderer({ fillAnswer, setFillAnswer, isSubmitting, answered, submitAnswer, t }: FillInBlankRendererProps) {
    return (
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
    );
}
