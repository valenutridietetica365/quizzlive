"use client";

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { Plus, Trash2, Save, ArrowLeft, Loader2, Check, ToggleLeft, ListChecks, Image as ImageIcon } from "lucide-react";
import { useRouter, useParams } from "next/navigation";

type Question = {
    id?: string;
    question_text: string;
    question_type: "multiple_choice" | "true_false";
    options: string[];
    correct_answer: string;
    image_url?: string;
    time_limit: number;
};

export default function QuizEditor() {
    const { id } = useParams();
    const isNew = id === "new";
    const [title, setTitle] = useState("");
    const [questions, setQuestions] = useState<Question[]>([
        { question_text: "", question_type: "multiple_choice", options: ["", "", "", ""], correct_answer: "", time_limit: 20 }
    ]);
    const [loading, setLoading] = useState(false);
    const [fetching, setFetching] = useState(!isNew);
    const router = useRouter();

    const fetchQuizData = useCallback(async () => {
        if (isNew) return;

        const { data: quiz, error: quizError } = await supabase
            .from("quizzes")
            .select("title, questions(*)")
            .eq("id", id)
            .single();

        if (quizError || !quiz) {
            router.push("/teacher/dashboard");
            return;
        }

        setTitle(quiz.title);
        // Sort questions by sort_order
        const sortedQuestions = (quiz.questions as any[]).sort((a, b) => a.sort_order - b.sort_order);
        setQuestions(sortedQuestions.map(q => ({
            id: q.id,
            question_text: q.question_text,
            question_type: q.question_type as any,
            options: q.options,
            correct_answer: q.correct_answer,
            image_url: q.image_url || "",
            time_limit: q.time_limit
        })));
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
            time_limit: 20
        }]);
    };

    const updateQuestion = (index: number, field: keyof Question, value: any) => {
        const newQuestions = [...questions];

        if (field === "question_type") {
            if (value === "true_false") {
                newQuestions[index].options = ["Verdadero", "Falso"];
                newQuestions[index].correct_answer = "";
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
        newQuestions[qIndex].options[oIndex] = value;
        setQuestions(newQuestions);
    };

    const handleSave = async () => {
        setLoading(true);
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        try {
            let quizId = id as string;

            if (isNew) {
                // 1. Create Quiz
                const { data: newQuiz, error: quizError } = await supabase
                    .from("quizzes")
                    .insert({ title, teacher_id: user.id })
                    .select()
                    .single();

                if (quizError || !newQuiz) throw new Error("Error al crear quiz");
                quizId = newQuiz.id;
            } else {
                // 1. Update Quiz
                const { error: quizError } = await supabase
                    .from("quizzes")
                    .update({ title })
                    .eq("id", id);

                if (quizError) throw new Error("Error al actualizar quiz");

                // 2. Delete existing questions (Simplest way to sync)
                await supabase.from("questions").delete().eq("quiz_id", id);
            }

            // 3. Create/Re-create Questions
            const questionsToInsert = questions.map((q, index) => ({
                quiz_id: quizId,
                question_text: q.question_text,
                question_type: q.question_type,
                options: q.options,
                correct_answer: q.correct_answer,
                image_url: q.image_url,
                time_limit: q.time_limit,
                sort_order: index
            }));

            const { error: questionsError } = await supabase
                .from("questions")
                .insert(questionsToInsert);

            if (questionsError) throw new Error("Error al guardar preguntas");

            router.push("/teacher/dashboard");
        } catch (error: any) {
            alert(error.message);
        } finally {
            setLoading(false);
        }
    };

    if (fetching) return <div className="min-h-screen flex items-center justify-center bg-slate-50"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>;

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col">
            <nav className="bg-white border-b border-slate-200 px-6 py-4 flex justify-between items-center shadow-sm sticky top-0 z-20">
                <div className="flex items-center gap-4">
                    <button onClick={() => router.back()} className="p-2 hover:bg-slate-100 rounded-lg text-slate-500 transition-all">
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <input
                        type="text"
                        placeholder="Título del Quiz"
                        className="text-xl font-black text-slate-900 border-none focus:ring-0 outline-none w-64 md:w-96 placeholder:text-slate-200"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                    />
                </div>
                <button
                    onClick={handleSave}
                    disabled={loading || !title || questions.some(q => !q.question_text || !q.correct_answer)}
                    className="flex items-center gap-2 bg-blue-600 text-white px-8 py-3 rounded-2xl font-black hover:bg-blue-700 transition-all shadow-lg shadow-blue-200 disabled:opacity-50 active:scale-95"
                >
                    {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                    {isNew ? "GUARDAR QUIZ" : "ACTUALIZAR QUIZ"}
                </button>
            </nav>

            <main className="max-w-4xl mx-auto w-full p-6 space-y-12 mb-10">
                {questions.map((q, qIndex) => (
                    <div key={qIndex} className="bg-white rounded-[2.5rem] p-10 shadow-sm border border-slate-100 space-y-8 relative group hover:shadow-xl transition-all">
                        <div className="flex justify-between items-center">
                            <div className="flex items-center gap-3">
                                <span className="bg-slate-900 text-white w-8 h-8 flex items-center justify-center rounded-xl font-black text-sm">
                                    {qIndex + 1}
                                </span>
                                <div className="flex bg-slate-50 p-1 rounded-xl border border-slate-100">
                                    <button
                                        onClick={() => updateQuestion(qIndex, "question_type", "multiple_choice")}
                                        className={`px-4 py-1.5 rounded-lg text-xs font-black transition-all flex items-center gap-2 ${q.question_type === "multiple_choice" ? "bg-white shadow-sm text-blue-600" : "text-slate-400"
                                            }`}
                                    >
                                        <ListChecks className="w-3.5 h-3.5" />
                                        OPCIONES
                                    </button>
                                    <button
                                        onClick={() => updateQuestion(qIndex, "question_type", "true_false")}
                                        className={`px-4 py-1.5 rounded-lg text-xs font-black transition-all flex items-center gap-2 ${q.question_type === "true_false" ? "bg-white shadow-sm text-orange-600" : "text-slate-400"
                                            }`}
                                    >
                                        <ToggleLeft className="w-3.5 h-3.5" />
                                        V / F
                                    </button>
                                </div>
                            </div>
                            <button
                                onClick={() => setQuestions(questions.filter((_, i) => i !== qIndex))}
                                className="p-3 text-slate-200 hover:text-red-500 hover:bg-red-50 rounded-2xl transition-all"
                            >
                                <Trash2 className="w-5 h-5" />
                            </button>
                        </div>

                        <textarea
                            placeholder="¿Qué quieres preguntar?"
                            className="w-full text-3xl font-black text-slate-900 border-none focus:ring-0 outline-none resize-none placeholder:text-slate-100"
                            rows={2}
                            value={q.question_text}
                            onChange={(e) => updateQuestion(qIndex, "question_text", e.target.value)}
                        />

                        <div className="flex items-center gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-100 group/img">
                            <ImageIcon className="w-5 h-5 text-slate-400" />
                            <input
                                type="text"
                                placeholder="URL de la imagen (Opcional)"
                                className="flex-1 bg-transparent border-none focus:ring-0 outline-none text-sm font-bold text-slate-600 placeholder:text-slate-200"
                                value={q.image_url}
                                onChange={(e) => updateQuestion(qIndex, "image_url", e.target.value)}
                            />
                            {q.image_url && (
                                <img src={q.image_url} alt="Preview" className="w-12 h-12 rounded-lg object-cover border border-slate-200" />
                            )}
                        </div>

                        {q.question_type === "multiple_choice" ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {q.options.map((option, oIndex) => (
                                    <div
                                        key={oIndex}
                                        className={`relative flex items-center p-2 rounded-2xl border-2 transition-all ${q.correct_answer === option && option !== ""
                                            ? "border-green-500 bg-green-50"
                                            : "border-slate-50 hover:border-slate-200"
                                            }`}
                                    >
                                        <div className={`w-12 h-12 flex items-center justify-center rounded-xl font-black text-white mr-4 shadow-sm ${oIndex === 0 ? "bg-red-500" : oIndex === 1 ? "bg-blue-500" : oIndex === 2 ? "bg-yellow-500" : "bg-green-500"
                                            }`}>
                                            {String.fromCharCode(65 + oIndex)}
                                        </div>
                                        <input
                                            type="text"
                                            placeholder={`Respuesta ${oIndex + 1}`}
                                            className="flex-1 bg-transparent border-none focus:ring-0 outline-none text-slate-700 font-bold"
                                            value={option}
                                            onChange={(e) => updateOption(qIndex, oIndex, e.target.value)}
                                        />
                                        <button
                                            onClick={() => updateQuestion(qIndex, "correct_answer", option)}
                                            className={`p-3 rounded-2xl transition-all ${q.correct_answer === option && option !== "" ? "bg-green-500 text-white shadow-lg shadow-green-200" : "text-slate-200 hover:text-green-500 hover:bg-green-50"
                                                }`}
                                        >
                                            <Check className="w-6 h-6" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="grid grid-cols-2 gap-6">
                                {["Verdadero", "Falso"].map((val) => (
                                    <button
                                        key={val}
                                        onClick={() => updateQuestion(qIndex, "correct_answer", val)}
                                        className={`py-8 rounded-3xl border-4 font-black text-2xl transition-all ${q.correct_answer === val
                                            ? "border-green-500 bg-green-50 text-green-600 shadow-xl shadow-green-100"
                                            : "border-slate-50 text-slate-300 hover:border-slate-100"
                                            }`}
                                    >
                                        {val}
                                    </button>
                                ))}
                            </div>
                        )}

                        <div className="flex items-center gap-6 pt-8 border-t border-slate-50">
                            <div className="flex items-center gap-3 bg-slate-50 px-4 py-2 rounded-2xl border border-slate-100">
                                <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Tiempo</span>
                                <select
                                    className="bg-transparent border-none rounded-lg text-sm font-black text-slate-900 focus:ring-0 cursor-pointer"
                                    value={q.time_limit}
                                    onChange={(e) => updateQuestion(qIndex, "time_limit", parseInt(e.target.value))}
                                >
                                    <option value={10}>10s</option>
                                    <option value={20}>20s</option>
                                    <option value={30}>30s</option>
                                    <option value={60}>1m</option>
                                </select>
                            </div>
                        </div>
                    </div>
                ))}

                <button
                    onClick={handleAddQuestion}
                    className="w-full py-16 border-4 border-dashed border-slate-200 rounded-[3rem] text-slate-300 hover:text-blue-500 hover:border-blue-200 hover:bg-blue-50/50 transition-all flex flex-col items-center gap-4 font-black text-2xl group"
                >
                    <div className="w-16 h-16 bg-slate-50 rounded-3xl flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-all shadow-sm">
                        <Plus className="w-8 h-8" />
                    </div>
                    AÑADIR OTRA PREGUNTA
                </button>
            </main>
        </div>
    );
}
