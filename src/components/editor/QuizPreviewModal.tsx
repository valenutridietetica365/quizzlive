"use client";

import { useState } from "react";
import { X, Play, Tablet, Smartphone, Laptop, MessageCircle } from "lucide-react";
import QuestionView from "@/components/game/QuestionView";
import { Question } from "@/lib/schemas";

interface QuizPreviewModalProps {
    isOpen: boolean;
    onClose: () => void;
    questions: Question[];
    title: string;
}

export default function QuizPreviewModal({ isOpen, onClose, questions, title }: QuizPreviewModalProps) {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [viewMode, setViewMode] = useState<"desktop" | "tablet" | "mobile">("desktop");
    const [answered, setAnswered] = useState(false);
    const [selectedOption, setSelectedOption] = useState<string | null>(null);
    const [fillAnswer, setFillAnswer] = useState("");
    const [matchingPairs, setMatchingPairs] = useState<Record<string, string>>({});

    if (!isOpen || questions.length === 0) return null;

    const currentQuestion = questions[currentIndex];

    const handleNext = () => {
        if (currentIndex < questions.length - 1) {
            setCurrentIndex(currentIndex + 1);
            setAnswered(false);
            setSelectedOption(null);
            setFillAnswer("");
            setMatchingPairs({});
        } else {
            onClose();
        }
    };

    const handleAnswer = (val: string) => {
        setAnswered(true);
        setSelectedOption(val);
    };

    const containerStyles = {
        desktop: "w-full max-w-4xl h-[80vh]",
        tablet: "w-[768px] h-[90vh]",
        mobile: "w-[375px] h-[80vh]"
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/90 backdrop-blur-sm p-4 animate-in fade-in duration-300">
            <div className="absolute top-6 left-6 text-white">
                <div className="flex items-center gap-3">
                    <div className="bg-blue-600 p-2 rounded-xl">
                        <Play className="w-5 h-5 fill-white" />
                    </div>
                    <div>
                        <h2 className="font-black text-lg">{title}</h2>
                        <p className="text-xs text-slate-400 font-bold uppercase tracking-widest flex items-center gap-2">
                             <MessageCircle className="w-3 h-3" /> Modo Previsualización
                        </p>
                    </div>
                </div>
            </div>

            <div className="absolute top-6 right-6 flex items-center gap-2">
                <div className="bg-slate-800 p-1 rounded-2xl flex border border-slate-700">
                    <button 
                        onClick={() => setViewMode("desktop")}
                        className={`p-2 rounded-xl transition-all ${viewMode === "desktop" ? "bg-blue-600 text-white" : "text-slate-400 hover:text-white"}`}
                    >
                        <Laptop className="w-5 h-5" />
                    </button>
                    <button 
                        onClick={() => setViewMode("tablet")}
                        className={`p-2 rounded-xl transition-all ${viewMode === "tablet" ? "bg-blue-600 text-white" : "text-slate-400 hover:text-white"}`}
                    >
                        <Tablet className="w-5 h-5" />
                    </button>
                    <button 
                        onClick={() => setViewMode("mobile")}
                        className={`p-2 rounded-xl transition-all ${viewMode === "mobile" ? "bg-blue-600 text-white" : "text-slate-400 hover:text-white"}`}
                    >
                        <Smartphone className="w-5 h-5" />
                    </button>
                </div>
                <button 
                    onClick={onClose}
                    className="p-3 bg-red-500 hover:bg-red-600 text-white rounded-2xl transition-all shadow-lg shadow-red-500/20"
                >
                    <X className="w-6 h-6" />
                </button>
            </div>

            <div className={`${containerStyles[viewMode]} bg-slate-50 rounded-[3rem] shadow-2xl overflow-hidden flex flex-col transition-all duration-500`}>
                <div className="flex-1 overflow-y-auto p-6 md:p-12 flex items-center justify-center">
                    <div className="w-full">
                         <QuestionView
                            currentQuestion={currentQuestion}
                            startedAt={null}
                            isSubmitting={false}
                            answered={answered}
                            submitAnswer={handleAnswer}
                            selectedOption={selectedOption}
                            fillAnswer={fillAnswer}
                            setFillAnswer={setFillAnswer}
                            matchingPairs={matchingPairs}
                            setMatchingPairs={setMatchingPairs}
                            selectedTerm={null}
                            setSelectedTerm={() => {}}
                            shuffledMatches={currentQuestion.question_type === 'matching' ? currentQuestion.options.map(o => o.split(':')[1]).sort(() => Math.random() - 0.5) : []}
                            t={(k) => k}
                        />

                        {answered && (
                            <div className="mt-12 animate-in slide-in-from-bottom-6 duration-500">
                                <button 
                                    onClick={handleNext}
                                    className="w-full btn-premium !py-5 !text-xl !rounded-[2rem] flex items-center justify-center gap-3"
                                >
                                    Siguiente Pregunta <ArrowNext className="w-6 h-6" />
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                <div className="p-4 bg-white border-t border-slate-100 flex items-center justify-between px-8">
                     <span className="text-xs font-black text-slate-400 uppercase tracking-widest">
                        Pregunta {currentIndex + 1} de {questions.length}
                    </span>
                    <div className="flex gap-1">
                        {questions.map((_, i) => (
                            <div key={i} className={`h-1.5 rounded-full transition-all ${i === currentIndex ? "w-8 bg-blue-600" : "w-1.5 bg-slate-200"}`} />
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}

function ArrowNext({ className }: { className?: string }) {
    return (
        <svg fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor" className={className}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
        </svg>
    );
}
