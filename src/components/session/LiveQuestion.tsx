"use client";

import Image from "next/image";
import { MessageSquare, ChevronRight } from "lucide-react";
import dynamic from "next/dynamic";
import { Question } from "@/lib/schemas";
import CircularTimer from "@/components/CircularTimer";

const Leaderboard = dynamic(() => import("@/components/Leaderboard"), { ssr: false });

interface LiveQuestionProps {
    sessionId: string;
    question: Question;
    questionIndex: number;
    totalQuestions: number;
    responsesCount: number;
    startedAt: string | null;
    t: (key: string) => string;
    onNext: () => void;
}

export default function LiveQuestion({
    sessionId, question, questionIndex, totalQuestions,
    responsesCount, startedAt, t, onNext
}: LiveQuestionProps) {
    return (
        <div className="w-full grid lg:grid-cols-3 gap-6 animate-in slide-in-from-bottom-12 duration-700">
            <div className="lg:col-span-2 space-y-4 md:space-y-6">
                <div className="flex items-center gap-3">
                    <span className="px-3 py-1.5 bg-blue-500/10 rounded-lg text-blue-400 font-black text-[10px] uppercase tracking-[0.2em]">
                        {t('session.question_of')} {questionIndex + 1} / {totalQuestions}
                    </span>
                    <div className="h-1 flex-1 bg-slate-900 rounded-full overflow-hidden">
                        <div className="h-full bg-blue-600 transition-all duration-1000" style={{ width: `${((questionIndex + 1) / totalQuestions) * 100}%` }} />
                    </div>
                </div>

                <h1 className="text-2xl md:text-5xl font-black tracking-tight leading-tight">
                    {question.question_text}
                </h1>

                {question.image_url && (
                    <div className="relative w-full aspect-video rounded-[3rem] overflow-hidden border-8 border-slate-900 shadow-2xl group">
                        <Image
                            src={question.image_url}
                            alt="Question"
                            fill
                            className="object-cover group-hover:scale-105 transition-transform duration-1000"
                            unoptimized
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/40 to-transparent" />
                    </div>
                )}

                {question.question_type === "multiple_choice" || question.question_type === "true_false" ? (
                    <div className="grid sm:grid-cols-2 gap-4">
                        {question.options.map((opt, i) => (
                            <div
                                key={i}
                                className={`p-4 md:p-6 rounded-2xl border-b-4 transition-all flex items-center gap-4 ${question.question_type === "true_false"
                                    ? (opt === "Verdadero" || opt === "True" ? "bg-blue-600/90 border-blue-800" : "bg-red-600/90 border-red-800")
                                    : (i === 0 ? "bg-red-600/90 border-red-800" :
                                        i === 1 ? "bg-blue-600/90 border-blue-800" :
                                            i === 2 ? "bg-amber-500 border-amber-700" :
                                                "bg-emerald-600/90 border-emerald-800")
                                    }`}
                            >
                                <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center text-lg font-black shadow-lg">
                                    {String.fromCharCode(65 + i)}
                                </div>
                                <span className="text-lg md:text-xl font-black text-white">{opt}</span>
                            </div>
                        ))}
                    </div>
                ) : question.question_type === "fill_in_the_blank" ? (
                    <div className="bg-slate-900/50 p-10 rounded-[3rem] border-4 border-emerald-500/30 flex flex-col items-center gap-4 animate-in zoom-in">
                        <span className="text-xs font-black text-emerald-400 uppercase tracking-[0.4em]">{t('session.expected_answer')}</span>
                        <h3 className="text-4xl md:text-6xl font-black text-white tracking-tight">{question.options.length > 0 ? question.options[0] : "---"}</h3>
                    </div>
                ) : (
                    <div className="grid sm:grid-cols-2 gap-4">
                        {question.options.map((pair, i) => {
                            const [term, match] = pair.split(":");
                            return (
                                <div key={i} className="bg-purple-600/20 p-6 rounded-[2rem] border-2 border-purple-500/30 flex items-center justify-between group hover:bg-purple-600/30 transition-all">
                                    <span className="font-black text-purple-200">{term}</span>
                                    <div className="w-8 h-px bg-purple-500/30" />
                                    <span className="font-black text-white">{match}</span>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            <div className="space-y-6">
                {/* Responses Counter */}
                <div className="bg-slate-900/80 backdrop-blur-xl p-6 md:p-8 rounded-3xl border border-white/5 flex flex-col items-center text-center space-y-3 shadow-2xl">
                    <div className="w-14 h-14 bg-blue-500/10 rounded-full flex items-center justify-center text-blue-500 ring-4 ring-blue-500/5">
                        <MessageSquare className="w-7 h-7" />
                    </div>
                    <div>
                        <p className="text-4xl md:text-5xl font-black text-white tabular-nums tracking-tighter">{responsesCount}</p>
                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mt-1">{t('session.responses')}</p>
                    </div>
                    <div className="pt-2 flex gap-1">
                        {[...Array(5)].map((_, i) => (
                            <div key={i} className={`h-1 w-1 rounded-full ${i < (responsesCount % 6) ? 'bg-blue-500' : 'bg-slate-800'}`} />
                        ))}
                    </div>
                </div>

                {/* Live Ranking */}
                <div className="bg-slate-900/80 backdrop-blur-xl p-4 rounded-3xl border border-white/5 shadow-2xl">
                    <Leaderboard sessionId={sessionId} />
                </div>

                {/* Timer Card */}
                <div className="bg-slate-900/80 backdrop-blur-xl p-6 md:p-8 rounded-3xl border border-white/5 flex flex-col items-center text-center space-y-3 shadow-2xl">
                    <CircularTimer
                        startedAt={startedAt}
                        timeLimit={question.time_limit || 20}
                        size="sm"
                        onTimeUp={onNext}
                    />
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{t('session.time_remaining')}</p>
                </div>

                <button
                    onClick={onNext}
                    className="w-full btn-premium !bg-white !text-slate-950 !shadow-white/5 flex items-center justify-center gap-3 group"
                >
                    <span className="text-xl font-black">{t('session.next_action')}</span>
                    <ChevronRight className="w-7 h-7 group-hover:translate-x-1 transition-transform" />
                </button>
            </div>
        </div>
    );
}
