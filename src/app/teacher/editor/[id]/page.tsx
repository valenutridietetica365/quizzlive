"use client";

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { Plus, Trash2, Save, ArrowLeft, Loader2, Check, ToggleLeft, ListChecks, Image as ImageIcon, Share2, Type, FileUp } from "lucide-react";
import { useRouter, useParams } from "next/navigation";
import Image from "next/image";
import { Question, QuestionSchema } from "@/lib/schemas";
import { useQuizStore } from "@/lib/store";
import { getTranslation } from "@/lib/i18n";
import ImportModal from "@/components/ImportModal";

export default function QuizEditor() {
    const { id } = useParams();
    const isNew = id === "new";
    const { language } = useQuizStore();
    const [title, setTitle] = useState("");
    const [tags, setTags] = useState<string[]>([]);
    const [newTag, setNewTag] = useState("");
    const [questions, setQuestions] = useState<Question[]>([
        { question_text: "", question_type: "multiple_choice", options: ["", "", "", ""], correct_answer: "", time_limit: 20, points: 1000 }
    ]);
    const [loading, setLoading] = useState(false);
    const [fetching, setFetching] = useState(!isNew);
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    const router = useRouter();

    const t = useCallback((key: string, params?: Record<string, string | number>) => {
        let text = getTranslation(language, key);
        if (params) {
            Object.entries(params).forEach(([k, v]) => {
                text = text.replace(`{${k}}`, v.toString());
            });
        }
        return text;
    }, [language]);

    const fetchQuizData = useCallback(async () => {
        if (isNew) return;

        const { data: quiz, error: quizError } = await supabase
            .from("quizzes")
            .select("title, tags, questions(*)")
            .eq("id", id)
            .single();

        if (quizError || !quiz) {
            router.push("/teacher/dashboard");
            return;
        }

        setTitle(quiz.title);
        setTags(quiz.tags || []);
        const validQuestions = (quiz.questions as unknown[]).map((q) => {
            try {
                return QuestionSchema.parse(q);
            } catch (e) {
                console.warn("Pregunta inválida filtrada:", q, e);
                return null;
            }
        }).filter((q): q is Question => q !== null);

        setQuestions(validQuestions);
        setFetching(false);
    }, [id, isNew, router]);

    useEffect(() => {
        fetchQuizData();
    }, [fetchQuizData]);

    const handleAddQuestion = () => {
        setQuestions([...questions, {
            question_text: "",
            question_type: "multiple_choice",
            options: ["", "", "", ""],
            correct_answer: "",
            image_url: "",
            time_limit: 20,
            points: 1000
        }]);
    };

    const handleImportQuestions = (imported: Question[]) => {
        // Remove the first empty question if it's there
        const filteredExisting = questions.filter(q => q.question_text.trim() !== "" || q.options.some(o => o.trim() !== ""));
        setQuestions([...filteredExisting, ...imported]);
    };

    const updateQuestion = (index: number, field: keyof Question, value: string | number | string[]) => {
        const newQuestions = [...questions];

        if (field === "question_type") {
            if (value === "true_false") {
                newQuestions[index].options = [t('editor.true_text'), t('editor.false_text')];
                newQuestions[index].correct_answer = "";
            } else if (value === "fill_in_the_blank") {
                newQuestions[index].options = [];
                newQuestions[index].correct_answer = "";
            } else if (value === "matching") {
                newQuestions[index].options = [`${t('editor.term_placeholder')} 1:${t('editor.match_placeholder')} 1`];
                newQuestions[index].correct_answer = "MATCHING_MODE";
            } else {
                newQuestions[index].options = ["", "", "", ""];
                newQuestions[index].correct_answer = "";
            }
        }

        newQuestions[index] = { ...newQuestions[index], [field]: value } as Question;
        setQuestions(newQuestions);
    };

    const updateOption = (qIndex: number, oIndex: number, value: string) => {
        const newQuestions = [...questions];
        const oldOptionValue = newQuestions[qIndex].options[oIndex];
        newQuestions[qIndex].options[oIndex] = value;

        if (newQuestions[qIndex].correct_answer === oldOptionValue) {
            newQuestions[qIndex].correct_answer = value;
        }

        setQuestions(newQuestions);
    };

    const handleSave = async () => {
        if (!title.trim()) {
            toast.error(t('editor.error_title'));
            return;
        }

        const invalidQuestionIndex = questions.findIndex(q => {
            const hasText = q.question_text.trim().length > 0;
            const hasCorrectAnswer = (q.correct_answer?.trim() || "").length > 0;

            if (q.question_type === "fill_in_the_blank") return !hasText || !hasCorrectAnswer;
            if (q.question_type === "matching") return !hasText || q.options.length === 0;

            const isCorrectInOptions = q.options.includes(q.correct_answer || "");
            return !hasText || !hasCorrectAnswer || !isCorrectInOptions;
        });

        if (invalidQuestionIndex !== -1) {
            const q = questions[invalidQuestionIndex];
            if (!q.question_text.trim()) {
                toast.error(t('editor.error_no_text', { num: invalidQuestionIndex + 1 }));
            } else if (!q.correct_answer) {
                toast.error(t('editor.error_no_correct', { num: invalidQuestionIndex + 1 }));
            } else {
                toast.error(t('editor.error_mismatch', { num: invalidQuestionIndex + 1 }));
            }
            return;
        }

        setLoading(true);
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            toast.error(t('editor.login_required'));
            setLoading(false);
            return;
        }

        try {
            let quizId = id as string;

            if (!isNew) {
                // Check for active sessions before allowing save
                const { data: activeSessions, error: sessionCheckError } = await supabase
                    .from("sessions")
                    .select("id")
                    .eq("quiz_id", id)
                    .in("status", ["waiting", "active"]);

                if (sessionCheckError) throw new Error(t('common.error'));

                if (activeSessions && activeSessions.length > 0) {
                    toast.error("No se puede editar un cuestionario mientras hay una sesión activa o en espera.");
                    setLoading(false);
                    return;
                }

                const { error: quizError } = await supabase
                    .from("quizzes")
                    .update({ title, tags })
                    .eq("id", id);

                if (quizError) throw new Error(t('common.error'));

                const { error: deleteError } = await supabase.from("questions").delete().eq("quiz_id", id);
                if (deleteError) throw new Error(t('common.error'));
            } else {
                const { data: newQuiz, error: quizError } = await supabase
                    .from("quizzes")
                    .insert({ title, tags, teacher_id: user.id })
                    .select()
                    .single();

                if (quizError || !newQuiz) throw new Error(t('common.error'));
                quizId = newQuiz.id;
            }

            const questionsToInsert = questions.map((q, index) => ({
                quiz_id: quizId,
                question_text: q.question_text,
                question_type: q.question_type,
                options: q.options,
                correct_answer: q.correct_answer,
                image_url: q.image_url || null,
                time_limit: q.time_limit,
                points: q.points || 1000,
                sort_order: index
            }));

            const { error: questionsError } = await supabase.from("questions").insert(questionsToInsert);
            if (questionsError) throw new Error(t('common.error'));

            toast.success(t('editor.save_success'));
            router.push("/teacher/dashboard");
        } catch (error) {
            const err = error as Error;
            toast.error(err.message || t('common.error'));
        } finally {
            setLoading(false);
        }
    };

    if (fetching) return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50">
            <Loader2 className="w-10 h-10 animate-spin text-blue-600" />
        </div>
    );

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col selection:bg-blue-100 italic-none">
            <header className="fixed top-0 w-full bg-white/80 backdrop-blur-xl border-b border-slate-100 z-50 h-20 md:h-24">
                <div className="max-w-5xl mx-auto px-4 md:px-6 h-full flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3 min-w-0">
                        <button
                            onClick={() => router.push("/teacher/dashboard")}
                            className="p-2 md:p-3 hover:bg-slate-50 rounded-xl text-slate-400 hover:text-slate-900 transition-all flex-shrink-0"
                        >
                            <ArrowLeft className="w-5 md:w-6 h-5 md:h-6" />
                        </button>
                        <div className="h-8 w-px bg-slate-100 hidden sm:block" />
                        <div className="min-w-0 flex flex-col">
                            <span className="text-[8px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{t('editor.title')}</span>
                            <input
                                type="text"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                className="w-full bg-transparent border-none focus:ring-0 text-lg md:text-2xl font-black text-slate-900 placeholder:text-slate-200 truncate p-0 leading-none h-6 md:h-8"
                                placeholder={t('editor.untitled')}
                            />
                        </div>
                    </div>

                    <div className="hidden lg:flex items-center gap-2 bg-slate-50 px-4 py-2 rounded-2xl border border-slate-100 max-w-md overflow-hidden">
                        <div className="flex gap-2 overflow-x-auto no-scrollbar">
                            {tags.map(tag => (
                                <span key={tag} className="bg-blue-600 text-white text-[10px] font-black px-2 py-1 rounded-lg flex items-center gap-1 shrink-0">
                                    {tag}
                                    <button onClick={() => setTags(tags.filter(t => t !== tag))} className="hover:text-blue-200">
                                        <Plus className="w-3 h-3 rotate-45" />
                                    </button>
                                </span>
                            ))}
                        </div>
                        <input
                            type="text"
                            placeholder={t('editor.add_tag') || "+ Etiqueta"}
                            className="bg-transparent border-none focus:ring-0 text-[10px] font-black w-20 p-0"
                            value={newTag}
                            onChange={(e) => setNewTag(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && newTag.trim()) {
                                    if (!tags.includes(newTag.trim())) {
                                        setTags([...tags, newTag.trim()]);
                                    }
                                    setNewTag("");
                                }
                            }}
                        />
                    </div>
                    <div className="flex items-center gap-2 md:gap-3 flex-shrink-0">
                        <button
                            onClick={() => setIsImportModalOpen(true)}
                            className="p-2.5 md:px-6 md:py-3 bg-blue-50 text-blue-600 rounded-xl md:rounded-[1.25rem] font-black transition-all active:scale-95 flex items-center gap-2"
                            title={t('editor.import')}
                        >
                            <FileUp className="w-5 md:w-6 h-5 md:h-6" />
                            <span className="hidden md:inline">{t('editor.import_button')}</span>
                        </button>
                        <button
                            onClick={handleSave}
                            disabled={loading}
                            className="px-5 md:px-8 py-3 md:py-4 bg-slate-900 text-white rounded-xl md:rounded-[1.5rem] font-black shadow-xl shadow-slate-200 hover:bg-blue-600 transition-all active:scale-95 disabled:opacity-50 flex items-center gap-2"
                        >
                            {loading ? <Loader2 className="w-5 md:w-6 h-5 md:h-6 animate-spin" /> : <Save className="w-5 md:w-6 h-5 md:h-6" />}
                            <span className="hidden sm:inline">{isNew ? t('editor.publish_button') : t('editor.save_button')}</span>
                        </button>
                    </div>
                </div>
            </header>

            <main className="max-w-4xl mx-auto w-full p-4 md:p-12 pt-32 md:pt-40 space-y-8 md:space-y-12">
                {questions.map((q, qIndex) => (
                    <div key={qIndex} className="bg-white rounded-[3rem] p-10 md:p-14 shadow-sm border border-slate-50 space-y-10 relative group hover:shadow-2xl hover:shadow-slate-200/50 transition-all duration-500">
                        <div className="flex justify-between items-center">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-slate-900 text-white flex items-center justify-center rounded-2xl font-black text-lg shadow-lg rotate-3 group-hover:rotate-0 transition-transform">
                                    {qIndex + 1}
                                </div>
                                <div className="flex bg-slate-100 p-1.5 rounded-2xl overflow-x-auto no-scrollbar max-w-[200px] sm:max-w-none">
                                    <button
                                        onClick={() => updateQuestion(qIndex, "question_type", "multiple_choice")}
                                        className={`px-4 py-2 rounded-xl text-[10px] font-black transition-all flex items-center gap-2 whitespace-nowrap ${q.question_type === "multiple_choice" ? "bg-white shadow-md text-blue-600" : "text-slate-400"}`}
                                    >
                                        <ListChecks className="w-4 h-4" /> {t('editor.options_tab')}
                                    </button>
                                    <button
                                        onClick={() => updateQuestion(qIndex, "question_type", "true_false")}
                                        className={`px-4 py-2 rounded-xl text-[10px] font-black transition-all flex items-center gap-2 whitespace-nowrap ${q.question_type === "true_false" ? "bg-white shadow-md text-orange-600" : "text-slate-400"}`}
                                    >
                                        <ToggleLeft className="w-4 h-4" /> {t('editor.tf_tab')}
                                    </button>
                                    <button
                                        onClick={() => updateQuestion(qIndex, "question_type", "fill_in_the_blank")}
                                        className={`px-4 py-2 rounded-xl text-[10px] font-black transition-all flex items-center gap-2 whitespace-nowrap ${q.question_type === "fill_in_the_blank" ? "bg-white shadow-md text-emerald-600" : "text-slate-400"}`}
                                    >
                                        <Type className="w-4 h-4" /> {t('editor.sentence_tab')}
                                    </button>
                                    <button
                                        onClick={() => updateQuestion(qIndex, "question_type", "matching")}
                                        className={`px-4 py-2 rounded-xl text-[10px] font-black transition-all flex items-center gap-2 whitespace-nowrap ${q.question_type === "matching" ? "bg-white shadow-md text-purple-600" : "text-slate-400"}`}
                                    >
                                        <Share2 className="w-4 h-4" /> {t('editor.matching_tab')}
                                    </button>
                                </div>
                            </div>
                            <button onClick={() => setQuestions(questions.filter((_, i) => i !== qIndex))} className="p-4 text-slate-200 hover:text-red-500 hover:bg-red-50 rounded-[1.5rem] transition-all"><Trash2 className="w-6 h-6" /></button>
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-300 uppercase tracking-widest ml-1">{t('editor.question_label')}</label>
                            <textarea
                                placeholder={t('editor.question_placeholder')}
                                className="w-full text-2xl md:text-4xl font-black text-slate-900 border-none focus:ring-0 outline-none resize-none placeholder:text-slate-100 leading-tight"
                                rows={2}
                                value={q.question_text}
                                onChange={(e) => updateQuestion(qIndex, "question_text", e.target.value)}
                            />
                        </div>

                        <div className="space-y-4">
                            <div className="flex items-center gap-4 bg-slate-50 p-6 rounded-[2rem] border border-slate-100">
                                <ImageIcon className="w-6 h-6 text-slate-400" />
                                <input
                                    type="text"
                                    placeholder={t('editor.image_url_placeholder')}
                                    className="flex-1 bg-transparent border-none focus:ring-0 outline-none font-bold text-slate-700"
                                    value={q.image_url || ""}
                                    onChange={(e) => updateQuestion(qIndex, "image_url", e.target.value)}
                                />
                            </div>
                            {q.image_url && (
                                <div className="relative aspect-video rounded-[2rem] overflow-hidden border-4 border-white shadow-xl">
                                    <Image src={q.image_url} alt="Preview" fill className="object-cover" unoptimized />
                                    <button onClick={() => updateQuestion(qIndex, "image_url", "")} className="absolute top-4 right-4 bg-black/60 text-white p-2 rounded-full"><Trash2 className="w-4 h-4" /></button>
                                </div>
                            )}
                        </div>

                        <div className="space-y-4">
                            {q.question_type === "multiple_choice" && (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {q.options.map((option, oIndex) => (
                                        <div key={oIndex} className={`flex items-center p-2 rounded-2xl border-4 ${q.correct_answer === option && option !== "" ? "border-emerald-500 bg-emerald-50" : "border-slate-50 bg-white"}`}>
                                            <input
                                                type="text"
                                                placeholder={`${t('editor.options_tab').toLowerCase()} ${oIndex + 1}`}
                                                className="flex-1 bg-transparent border-none focus:ring-0 font-bold"
                                                value={option}
                                                onChange={(e) => updateOption(qIndex, oIndex, e.target.value)}
                                            />
                                            <button onClick={() => updateQuestion(qIndex, "correct_answer", option)} className={`p-3 rounded-xl ${q.correct_answer === option && option !== "" ? "bg-emerald-500 text-white" : "text-slate-200"}`}>
                                                <Check className="w-6 h-6" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {q.question_type === "true_false" && (
                                <div className="grid grid-cols-2 gap-4">
                                    {[t('editor.true_text'), t('editor.false_text')].map(val => (
                                        <button key={val} onClick={() => updateQuestion(qIndex, "correct_answer", val)} className={`py-8 rounded-3xl border-4 font-black text-xl ${q.correct_answer === val ? "border-emerald-500 bg-emerald-50 text-emerald-600" : "border-slate-50 text-slate-300"}`}>
                                            {val}
                                        </button>
                                    ))}
                                </div>
                            )}

                            {q.question_type === "fill_in_the_blank" && (
                                <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100">
                                    <input
                                        type="text"
                                        placeholder={t('editor.correct_answer_placeholder')}
                                        className="w-full bg-white p-4 rounded-xl border-none font-black text-xl"
                                        value={q.correct_answer || ""}
                                        onChange={(e) => updateQuestion(qIndex, "correct_answer", e.target.value)}
                                    />
                                </div>
                            )}

                            {q.question_type === "matching" && (
                                <div className="space-y-3">
                                    {q.options.map((pair, pIndex) => {
                                        const [term, match] = pair.includes(":") ? pair.split(":") : [pair, ""];
                                        return (
                                            <div key={pIndex} className="flex gap-2">
                                                <div className="flex-1 flex gap-2 bg-slate-50 p-3 rounded-xl border">
                                                    <input type="text" placeholder={t('editor.term_placeholder')} className="flex-1 bg-transparent border-none text-sm font-bold" value={term} onChange={(e) => {
                                                        const opts = [...q.options];
                                                        opts[pIndex] = `${e.target.value}:${match}`;
                                                        updateQuestion(qIndex, "options", opts);
                                                    }} />
                                                    <div className="w-px bg-slate-200" />
                                                    <input type="text" placeholder={t('editor.match_placeholder')} className="flex-1 bg-transparent border-none text-sm font-bold" value={match} onChange={(e) => {
                                                        const opts = [...q.options];
                                                        opts[pIndex] = `${term}:${e.target.value}`;
                                                        updateQuestion(qIndex, "options", opts);
                                                    }} />
                                                </div>
                                                <button onClick={() => updateQuestion(qIndex, "options", q.options.filter((_, i) => i !== pIndex))} className="text-slate-300 hover:text-red-500"><Trash2 className="w-4 h-4" /></button>
                                            </div>
                                        );
                                    })}
                                    <button onClick={() => updateQuestion(qIndex, "options", [...q.options, ":"])} className="w-full py-2 border-2 border-dashed rounded-xl text-slate-300 text-xs font-black">+ {t('editor.add_pair')}</button>
                                </div>
                            )}
                        </div>

                        <div className="flex items-center justify-between pt-6 border-t">
                            <div className="flex items-center gap-3 bg-slate-50 px-4 py-2 rounded-xl text-[10px] font-black uppercase text-slate-400">
                                {t('editor.time_limit')}
                                <select className="bg-transparent border-none p-0 text-slate-900" value={q.time_limit} onChange={(e) => updateQuestion(qIndex, "time_limit", parseInt(e.target.value))}>
                                    <option value={10}>10s</option>
                                    <option value={20}>20s</option>
                                    <option value={30}>30s</option>
                                    <option value={60}>60s</option>
                                </select>
                            </div>
                            <span className="text-[10px] font-black text-slate-200 uppercase tracking-widest flex items-center gap-1"><Check className="w-3 h-3" /> {t('editor.auto_save')}</span>
                        </div>
                    </div>
                ))}

                <button onClick={handleAddQuestion} className="w-full py-8 md:py-12 border-4 border-dashed rounded-[2rem] md:rounded-[3rem] text-slate-200 hover:text-blue-600 hover:border-blue-100 transition-all flex flex-col items-center gap-2 md:gap-4 font-black text-lg md:text-xl">
                    <Plus className="w-6 md:w-8 h-6 md:h-8" /> {t('editor.add_question')}
                </button>

                <div className="fixed bottom-6 left-1/2 -translate-x-1/2 w-full max-w-sm px-6 z-40 md:hidden">
                    <button
                        onClick={handleAddQuestion}
                        className="w-full bg-blue-600 text-white py-5 rounded-[2rem] font-black shadow-2xl shadow-blue-300 hover:bg-blue-700 transition-all active:scale-95 flex items-center justify-center gap-3 group"
                    >
                        <div className="bg-white/20 p-1.5 rounded-lg group-hover:rotate-90 transition-transform">
                            <Plus className="w-6 h-6" />
                        </div>
                        {t('editor.add_question')}
                    </button>
                </div>

                <div className="flex justify-center pt-8 pb-20 md:pb-10">
                    <button onClick={handleSave} disabled={loading} className="btn-premium !py-4 md:!py-5 !px-10 md:!px-12 text-lg md:text-xl flex items-center gap-3 shadow-xl shadow-blue-100 w-full md:w-auto">
                        {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : <Check className="w-6 h-6" />}
                        {isNew ? t('editor.publish_button') : t('editor.save_button')}
                    </button>
                </div>
            </main>

            <ImportModal
                isOpen={isImportModalOpen}
                onClose={() => setIsImportModalOpen(false)}
                onImport={handleImportQuestions}
            />
        </div>
    );
}
