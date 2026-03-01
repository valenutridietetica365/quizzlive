"use client";

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { Question, QuestionSchema, ClassModel as Class } from "@/lib/schemas";
import { saveQuizData } from "@/actions/quiz";
import { useQuizStore } from "@/lib/store";
import { getTranslation } from "@/lib/i18n";
import { Plus, Loader2, Check } from "lucide-react";
import { useRouter, useParams } from "next/navigation";
import ImportModal from "@/components/ImportModal";
import AIGeneratorModal from "@/components/AIGeneratorModal";
import EditorHeader from "@/components/editor/EditorHeader";
import QuestionCard from "@/components/editor/QuestionCard";

export default function QuizEditor() {
    const { id } = useParams();
    const isNew = id === "new";
    const { language } = useQuizStore();
    const [title, setTitle] = useState("");
    const [tags, setTags] = useState<string[]>([]);
    const [newTag, setNewTag] = useState("");
    const [selectedClassId, setSelectedClassId] = useState<string | null>(null);
    const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
    const [classes, setClasses] = useState<Class[]>([]);
    const folders = useQuizStore((state) => state.dashboardFolders) as { id: string, name: string }[];
    const [questions, setQuestions] = useState<Question[]>([
        { question_text: "", question_type: "multiple_choice", options: ["", "", "", ""], correct_answer: "", time_limit: 20, points: 1000 }
    ]);
    const [loading, setLoading] = useState(false);
    const [fetching, setFetching] = useState(!isNew);
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    const [isAIModalOpen, setIsAIModalOpen] = useState(false);
    const router = useRouter();

    const t = useCallback((key: string, params?: Record<string, string | number>) => {
        let text = getTranslation(language, key);
        if (params) {
            Object.entries(params).forEach(([k, v]) => { text = text.replace(`{${k}}`, v.toString()); });
        }
        return text;
    }, [language]);

    // --- Data fetching ---
    const fetchQuizData = useCallback(async () => {
        if (isNew) return;
        const { data: quiz, error: quizError } = await supabase
            .from("quizzes").select("title, tags, class_id, folder_id, questions(*)").eq("id", id).single();
        if (quizError || !quiz) { router.push("/teacher/dashboard"); return; }
        setTitle(quiz.title);
        setTags(quiz.tags || []);
        setSelectedClassId(quiz.class_id);
        setSelectedFolderId(quiz.folder_id);
        const validQuestions = (quiz.questions as unknown[]).map((q) => {
            try { return QuestionSchema.parse(q); }
            catch (e) { console.warn("Pregunta inválida filtrada:", q, e); return null; }
        }).filter((q): q is Question => q !== null);
        setQuestions(validQuestions);
        setFetching(false);
    }, [id, isNew, router]);

    useEffect(() => {
        fetchQuizData();
        const fetchClasses = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;
            const { data } = await supabase.from("classes").select("*").eq("teacher_id", user.id);
            if (data) setClasses(data);
        };
        fetchClasses();
    }, [fetchQuizData]);

    // --- Question handlers ---
    const handleAddQuestion = () => {
        setQuestions([...questions, { question_text: "", question_type: "multiple_choice", options: ["", "", "", ""], correct_answer: "", image_url: "", time_limit: 20, points: 1000 }]);
    };

    const handleImportQuestions = (imported: Question[]) => {
        const filteredExisting = questions.filter(q => q.question_text.trim() !== "" || q.options.some(o => o.trim() !== ""));
        setQuestions([...filteredExisting, ...imported]);
    };

    const handleAIGenerated = (generated: Question[]) => {
        const filteredExisting = questions.filter(q => q.question_text.trim() !== "" || q.options.some(o => o.trim() !== ""));
        setQuestions([...filteredExisting, ...generated]);
    };

    const updateQuestion = (index: number, field: keyof Question, value: string | number | string[]) => {
        const newQuestions = [...questions];
        if (field === "question_type") {
            if (value === "true_false") { newQuestions[index].options = [t('editor.true_text'), t('editor.false_text')]; newQuestions[index].correct_answer = ""; }
            else if (value === "fill_in_the_blank") { newQuestions[index].options = []; newQuestions[index].correct_answer = ""; }
            else if (value === "matching") { newQuestions[index].options = [`${t('editor.term_placeholder')} 1:${t('editor.match_placeholder')} 1`]; newQuestions[index].correct_answer = "MATCHING_MODE"; }
            else { newQuestions[index].options = ["", "", "", ""]; newQuestions[index].correct_answer = ""; }
        }
        newQuestions[index] = { ...newQuestions[index], [field]: value } as Question;
        setQuestions(newQuestions);
    };

    const updateOption = (qIndex: number, oIndex: number, value: string) => {
        const newQuestions = [...questions];
        const oldOptionValue = newQuestions[qIndex].options[oIndex];
        newQuestions[qIndex].options[oIndex] = value;
        if (newQuestions[qIndex].correct_answer === oldOptionValue) { newQuestions[qIndex].correct_answer = value; }
        setQuestions(newQuestions);
    };

    const deleteQuestion = (index: number) => {
        setQuestions(questions.filter((_, i) => i !== index));
    };

    // --- Save ---
    const handleSave = async () => {
        if (!title.trim()) { toast.error(t('editor.error_title')); return; }
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
            if (!q.question_text.trim()) { toast.error(t('editor.error_no_text', { num: invalidQuestionIndex + 1 })); }
            else if (!q.correct_answer) { toast.error(t('editor.error_no_correct', { num: invalidQuestionIndex + 1 })); }
            else { toast.error(t('editor.error_mismatch', { num: invalidQuestionIndex + 1 })); }
            return;
        }

        setLoading(true);
        try {
            const currentNewTag = newTag.trim();
            const tagsToSave = currentNewTag && !tags.includes(currentNewTag) ? [...tags, currentNewTag] : tags;
            if (currentNewTag && !tags.includes(currentNewTag)) { setTags(tagsToSave); setNewTag(""); }

            await saveQuizData(isNew, isNew ? null : id as string, {
                title,
                tags: tagsToSave,
                class_id: selectedClassId || null,
                folder_id: selectedFolderId || null,
                questions
            });

            toast.success(t('editor.save_success'));
            router.push("/teacher/dashboard");
        } catch (error) {
            const err = error as Error;
            toast.error(err.message || t('common.error'));
        } finally { setLoading(false); }
    };

    if (fetching) return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50">
            <Loader2 className="w-10 h-10 animate-spin text-blue-600" />
        </div>
    );

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col selection:bg-blue-100 italic-none">
            <EditorHeader
                title={title} setTitle={setTitle}
                tags={tags} setTags={setTags}
                newTag={newTag} setNewTag={setNewTag}
                selectedClassId={selectedClassId} setSelectedClassId={setSelectedClassId}
                selectedFolderId={selectedFolderId} setSelectedFolderId={setSelectedFolderId}
                classes={classes} folders={folders}
                isNew={isNew} loading={loading}
                onSave={handleSave}
                onImport={() => setIsImportModalOpen(true)}
                onAI={() => setIsAIModalOpen(true)}
                t={t}
            />

            <main className="max-w-4xl mx-auto w-full p-4 md:p-12 pt-36 md:pt-44 space-y-8 md:space-y-12">
                {questions.map((q, qIndex) => (
                    <QuestionCard
                        key={qIndex}
                        question={q}
                        index={qIndex}
                        t={t}
                        onUpdate={updateQuestion}
                        onUpdateOption={updateOption}
                        onDelete={deleteQuestion}
                    />
                ))}

                <button onClick={handleAddQuestion} className="w-full py-8 md:py-12 border-4 border-dashed rounded-[2rem] md:rounded-[3rem] text-slate-200 hover:text-blue-600 hover:border-blue-100 transition-all flex flex-col items-center gap-2 md:gap-4 font-black text-lg md:text-xl">
                    <Plus className="w-6 md:w-8 h-6 md:h-8" /> {t('editor.add_question')}
                </button>

                <div className="fixed bottom-6 left-1/2 -translate-x-1/2 w-full max-w-sm px-6 z-40 md:hidden">
                    <button onClick={handleAddQuestion} className="w-full bg-blue-600 text-white py-5 rounded-[2rem] font-black shadow-2xl shadow-blue-300 hover:bg-blue-700 transition-all active:scale-95 flex items-center justify-center gap-3 group">
                        <div className="bg-white/20 p-1.5 rounded-lg group-hover:rotate-90 transition-transform"><Plus className="w-6 h-6" /></div>
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

            <ImportModal isOpen={isImportModalOpen} onClose={() => setIsImportModalOpen(false)} onImport={handleImportQuestions} />
            <AIGeneratorModal isOpen={isAIModalOpen} onClose={() => setIsAIModalOpen(false)} onGenerate={handleAIGenerated} />
        </div>
    );
}
