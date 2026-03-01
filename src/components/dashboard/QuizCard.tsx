"use client";

import { BookOpen, Play, Pencil, Trash2, Users } from "lucide-react";
import { useRouter } from "next/navigation";
import { Quiz, DashboardClass } from "@/hooks/useDashboardData";

interface QuizCardProps {
    quiz: Quiz;
    classes: DashboardClass[];
    t: (key: string) => string;
    onPlay: (quizId: string) => void;
    onDelete: (quizId: string) => void;
}

export default function QuizCard({ quiz, classes, t, onPlay, onDelete }: QuizCardProps) {
    const router = useRouter();

    return (
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-50 transition-all hover:shadow-2xl hover:shadow-slate-200/50 flex flex-col justify-between space-y-4 relative group overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50/50 rounded-bl-[4rem] -mr-8 -mt-8 -z-0 transition-all group-hover:scale-110" />

            <div className="space-y-4 relative z-10">
                <div className="w-14 h-14 bg-white shadow-lg rounded-2xl flex items-center justify-center text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-all duration-500">
                    <BookOpen className="w-7 h-7" />
                </div>
                <div>
                    <h3 className="font-black text-2xl text-slate-900 leading-tight group-hover:text-blue-600 transition-colors">{quiz.title}</h3>
                    <div className="flex flex-wrap gap-2 mt-2">
                        <span className="bg-slate-100 px-3 py-1 rounded-full text-[10px] font-black text-slate-400 uppercase tracking-widest">
                            {quiz.questions.length} {t('common.questions')}
                        </span>
                        {quiz.class_id && classes.find(c => c.id === quiz.class_id) && (
                            <span className="bg-slate-900 px-3 py-1 rounded-full text-[10px] font-black text-white uppercase tracking-widest flex items-center gap-1">
                                <Users className="w-3 h-3" />
                                {classes.find(c => c.id === quiz.class_id)?.name}
                            </span>
                        )}
                        {quiz.tags?.map((tag: string) => (
                            <span key={tag} className="bg-blue-50 px-3 py-1 rounded-full text-[10px] font-black text-blue-400 uppercase tracking-widest">
                                #{tag}
                            </span>
                        ))}
                    </div>
                </div>
            </div>

            <div className="flex items-center gap-3 pt-6 border-t border-slate-50 relative z-10">
                <button
                    onClick={() => onPlay(quiz.id)}
                    className="flex-1 flex items-center justify-center gap-2 bg-slate-900 text-white font-black py-4 rounded-2xl hover:bg-blue-600 transition-all active:scale-95 shadow-xl shadow-slate-200"
                >
                    <Play className="w-5 h-5 fill-white" />
                    {t('dashboard.present')}
                </button>
                <div className="flex gap-2">
                    <button
                        onClick={() => router.push(`/teacher/editor/${quiz.id}`)}
                        className="p-4 bg-slate-50 rounded-2xl text-slate-400 hover:text-blue-600 hover:bg-white hover:shadow-lg transition-all"
                        title={t('dashboard.edit')}
                    >
                        <Pencil className="w-5 h-5" />
                    </button>
                    <button
                        onClick={() => onDelete(quiz.id)}
                        className="p-4 bg-slate-50 rounded-2xl text-slate-400 hover:text-red-500 hover:bg-white hover:shadow-lg transition-all"
                        title={t('common.delete')}
                    >
                        <Trash2 className="w-5 h-5" />
                    </button>
                </div>
            </div>
        </div>
    );
}
