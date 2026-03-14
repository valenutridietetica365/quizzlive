import { Question } from "@/lib/schemas";
import { motion } from "framer-motion";

interface MultipleChoiceRendererProps {
    currentQuestion: Question;
    isSubmitting: boolean;
    answered: boolean;
    submitAnswer: (answer: string) => void;
    selectedOption: string | null;
    isSpyActive?: boolean;
    answerDistribution?: Record<string, number>;
}

export default function MultipleChoiceRenderer({ 
    currentQuestion, 
    isSubmitting, 
    answered, 
    submitAnswer, 
    selectedOption,
    isSpyActive,
    answerDistribution = {}
}: MultipleChoiceRendererProps) {
    const container = {
        hidden: { opacity: 0 },
        show: {
            opacity: 1,
            transition: {
                staggerChildren: 0.1
            }
        }
    };

    const item = {
        hidden: { y: 20, opacity: 0 },
        show: { 
            y: 0, 
            opacity: 1,
            transition: {
                type: "spring" as const,
                stiffness: 260,
                damping: 20
            }
        }
    };

    return (
        <motion.div 
            variants={container}
            initial="hidden"
            animate="show"
            className={`grid gap-2 md:gap-3 w-full ${currentQuestion.question_type === "true_false" ? "grid-cols-2" : "grid-cols-1 sm:grid-cols-2"}`}
        >
            {currentQuestion.options.map((opt: string, i: number) => {
                const count = answerDistribution[opt] || 0;
                const total = Object.values(answerDistribution).reduce((a, b) => a + b, 0) || 1;
                const percent = Math.round((count / total) * 100);

                return (
                    <motion.button
                        key={i}
                        variants={item}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.95 }}
                        disabled={isSubmitting || answered}
                        onClick={() => submitAnswer(opt)}
                        className={`group p-3 md:p-6 rounded-xl md:rounded-2xl text-left transition-shadow shadow-md border-b-[3px] flex flex-row items-center md:flex-col md:items-start md:justify-between min-h-[64px] md:h-auto overflow-hidden relative ${(isSubmitting || answered) && selectedOption !== opt ? "opacity-50 grayscale" : ""} ${selectedOption === opt ? "ring-4 ring-white shadow-2xl z-10 brightness-110" : ""
                            } ${currentQuestion.question_type === "true_false"
                                ? (opt === "Verdadero" || opt === "True" ? "bg-blue-600 border-blue-800 shadow-blue-200" : "bg-red-600 border-red-800 shadow-red-200")
                                : (i === 0 ? "bg-red-600 border-red-800 shadow-red-200" :
                                    i === 1 ? "bg-blue-600 border-blue-800 shadow-blue-200" :
                                        i === 2 ? "bg-amber-500 border-amber-700 shadow-amber-100" :
                                            "bg-emerald-600 border-emerald-800 shadow-emerald-100")
                            }`}
                    >
                        <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                        
                        {/* Spy Mode Percentage Badge */}
                        {isSpyActive && count > 0 && (
                            <motion.div 
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                className="absolute top-2 right-2 bg-white/90 backdrop-blur-sm px-2 py-0.5 rounded-full text-[10px] font-black text-slate-900 shadow-sm"
                            >
                                👀 {percent}%
                            </motion.div>
                        )}

                        <div className="shrink-0 w-8 h-8 md:w-12 md:h-12 bg-white/20 rounded-lg md:rounded-2xl flex items-center justify-center font-black text-white text-base md:text-xl relative z-10 mr-3 md:mr-0">
                            {String.fromCharCode(65 + i)}
                        </div>
                        <span className="text-base md:text-2xl font-bold md:font-black text-white mt-0 md:mt-4 relative z-10 line-clamp-3 md:line-clamp-none leading-snug w-full">{opt}</span>
                    </motion.button>
                );
            })}
        </motion.div>
    );
}
