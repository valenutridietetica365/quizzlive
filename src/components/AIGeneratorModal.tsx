"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Loader2, Sparkles, X, Brain, GraduationCap, Hash } from "lucide-react";
import { Question } from "@/lib/schemas";
import { getTranslation } from "@/lib/i18n";
import { useQuizStore } from "@/lib/store";

interface AIGeneratorModalProps {
    isOpen: boolean;
    onClose: () => void;
    onGenerate: (questions: Question[]) => void;
}

export default function AIGeneratorModal({ isOpen, onClose, onGenerate }: AIGeneratorModalProps) {
    const { language } = useQuizStore();
    const [topic, setTopic] = useState("");
    const [grade, setGrade] = useState("");
    const [count, setCount] = useState(5);
    const [loading, setLoading] = useState(false);

    const t = (key: string) => getTranslation(language, key);

    if (!isOpen) return null;

    const handleGenerate = async () => {
        if (!topic.trim()) {
            toast.error(t('ai.topic_error') || "Por favor ingresa un tema");
            return;
        }

        setLoading(true);
        try {
            const response = await fetch("/api/ai/generate", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ topic, count, grade, language }),
            });

            const data = await response.json();

            if (!response.ok) {
                const errorMsg = data.details || data.error || "Failed to generate";
                throw new Error(errorMsg);
            }

            onGenerate(data);
            toast.success(t('ai.success'));
            onClose();
            // Reset fields
            setTopic("");
            setGrade("");
        } catch (error: any) {
            console.error(error);
            toast.error(error.message || t('ai.error'));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-6">
            <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-md" onClick={onClose} />

            <div className="relative w-full max-w-xl bg-white rounded-[2.5rem] shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-300">
                {/* Header */}
                <div className="bg-slate-900 p-8 md:p-10 text-white relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/20 blur-3xl -mr-16 -mt-16 rounded-full" />
                    <div className="relative flex justify-between items-start">
                        <div className="space-y-2">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-blue-500 rounded-lg shadow-lg shadow-blue-500/20">
                                    <Sparkles className="w-5 h-5 text-white" />
                                </div>
                                <h2 className="text-xl md:text-2xl font-black uppercase tracking-tight">{t('ai.modal_title')}</h2>
                            </div>
                            <p className="text-slate-400 text-xs md:text-sm font-medium">{t('ai.generating_desc') || "Deja que la IA cree el contenido por ti en segundos."}</p>
                        </div>
                        <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-xl transition-all">
                            <X className="w-6 h-6" />
                        </button>
                    </div>
                </div>

                {/* Body */}
                <div className="p-8 md:p-10 space-y-8">
                    {/* Topic */}
                    <div className="space-y-3">
                        <label className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                            <Brain className="w-3 h-3" /> {t('ai.topic_label')}
                        </label>
                        <input
                            type="text"
                            value={topic}
                            onChange={(e) => setTopic(e.target.value)}
                            placeholder={t('ai.topic_placeholder')}
                            className="w-full bg-slate-50 border-2 border-transparent focus:border-blue-500 focus:bg-white rounded-2xl px-6 py-4 font-bold text-slate-900 outline-none transition-all placeholder:text-slate-300"
                        />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Grade */}
                        <div className="space-y-3">
                            <label className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                                <GraduationCap className="w-3 h-3" /> {t('ai.grade_label')}
                            </label>
                            <input
                                type="text"
                                value={grade}
                                onChange={(e) => setGrade(e.target.value)}
                                placeholder={t('ai.grade_placeholder')}
                                className="w-full bg-slate-50 border-2 border-transparent focus:border-blue-500 focus:bg-white rounded-2xl px-6 py-4 font-bold text-slate-900 outline-none transition-all placeholder:text-slate-300"
                            />
                        </div>

                        {/* Count */}
                        <div className="space-y-3">
                            <label className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                                <Hash className="w-3 h-3" /> {t('ai.count_label')}
                            </label>
                            <select
                                value={count}
                                onChange={(e) => setCount(parseInt(e.target.value))}
                                className="w-full bg-slate-50 border-2 border-transparent focus:border-blue-500 focus:bg-white rounded-2xl px-6 py-4 font-bold text-slate-900 outline-none transition-all"
                            >
                                {[3, 5, 8, 10, 15].map(v => (
                                    <option key={v} value={v}>{v} {t('common.questions')}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="pt-4">
                        <button
                            onClick={handleGenerate}
                            disabled={loading || !topic.trim()}
                            className="w-full py-5 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-black shadow-xl shadow-blue-200 transition-all active:scale-95 disabled:opacity-50 disabled:grayscale flex items-center justify-center gap-3 group"
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="w-6 h-6 animate-spin" />
                                    <span>{t('ai.generating')}</span>
                                </>
                            ) : (
                                <>
                                    <Sparkles className="w-6 h-6 group-hover:rotate-12 transition-transform" />
                                    <span>{t('ai.generate_button')}</span>
                                </>
                            )}
                        </button>
                    </div>
                </div>

                {/* Decorative bottom bar */}
                <div className="h-2 bg-gradient-to-r from-blue-500 via-indigo-500 to-emerald-500" />
            </div>
        </div>
    );
}
