"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { Plus, Trash2, Save, ArrowLeft, Loader2, Check } from "lucide-react";
import { useRouter } from "next/navigation";

type Question = {
    id?: string;
    question_text: string;
    question_type: "multiple_choice" | "true_false";
    options: string[];
    correct_answer: string;
    time_limit: number;
};

export default function QuizEditor() {
    const [title, setTitle] = useState("");
    const [questions, setQuestions] = useState<Question[]>([
        { question_text: "", question_type: "multiple_choice", options: ["", "", "", ""], correct_answer: "", time_limit: 20 }
    ]);
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const handleAddQuestion = () => {
        setQuestions([...questions, {
            question_text: "",
            question_type: "multiple_choice",
            options: ["", "", "", ""],
            correct_answer: "",
            time_limit: 20
        }]);
    };

    const updateQuestion = (index: number, field: keyof Question, value: string | number | string[]) => {
        const newQuestions = [...questions];
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

        // 1. Create Quiz
        const { data: quiz, error: quizError } = await supabase
            .from("quizzes")
            .insert({ title, teacher_id: user.id })
            .select()
            .single();

        if (quizError || !quiz) {
            alert("Error al guardar quiz");
            setLoading(false);
            return;
        }

        // 2. Create Questions
        const questionsToInsert = questions.map((q, index) => ({
            quiz_id: quiz.id,
            question_text: q.question_text,
            question_type: q.question_type,
            options: q.options,
            correct_answer: q.correct_answer,
            time_limit: q.time_limit,
            sort_order: index
        }));

        const { error: questionsError } = await supabase
            .from("questions")
            .insert(questionsToInsert);

        if (questionsError) {
            alert("Error al guardar preguntas");
        } else {
            router.push("/teacher/dashboard");
        }
        setLoading(false);
    };

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col">
            <nav className="bg-white border-b border-slate-200 px-6 py-4 flex justify-between items-center shadow-sm sticky top-0 z-20">
                <div className="flex items-center gap-4">
                    <button onClick={() => router.back()} className="p-2 hover:bg-slate-100 rounded-lg text-slate-500">
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <input
                        type="text"
                        placeholder="Título del Quiz"
                        className="text-xl font-bold text-slate-900 border-none focus:ring-0 outline-none w-64 md:w-96"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                    />
                </div>
                <button
                    onClick={handleSave}
                    disabled={loading || !title || questions.some(q => !q.question_text || !q.correct_answer)}
                    className="flex items-center gap-2 bg-blue-600 text-white px-6 py-2.5 rounded-xl font-bold hover:bg-blue-700 transition-all shadow-md disabled:opacity-50"
                >
                    {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                    Guardar Quiz
                </button>
            </nav>

            <main className="max-w-4xl mx-auto w-full p-6 space-y-12">
                {questions.map((q, qIndex) => (
                    <div key={qIndex} className="bg-white rounded-3xl p-8 shadow-sm border border-slate-100 space-y-6 relative group">
                        <div className="flex justify-between items-start">
                            <span className="text-sm font-bold text-blue-600 bg-blue-50 px-3 py-1 rounded-full uppercase tracking-wider">
                                Pregunta {qIndex + 1}
                            </span>
                            <button
                                onClick={() => setQuestions(questions.filter((_, i) => i !== qIndex))}
                                className="p-2 text-slate-300 hover:text-red-500 transition-colors"
                            >
                                <Trash2 className="w-5 h-5" />
                            </button>
                        </div>

                        <textarea
                            placeholder="Escribe tu pregunta aquí..."
                            className="w-full text-2xl font-bold text-slate-900 border-none focus:ring-0 outline-none resize-none placeholder:text-slate-200"
                            rows={2}
                            value={q.question_text}
                            onChange={(e) => updateQuestion(qIndex, "question_text", e.target.value)}
                        />

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {q.options.map((option, oIndex) => (
                                <div
                                    key={oIndex}
                                    className={`relative flex items-center p-1 rounded-2xl border-2 transition-all ${q.correct_answer === option && option !== ""
                                        ? "border-green-500 bg-green-50"
                                        : "border-slate-100 hover:border-slate-200"
                                        }`}
                                >
                                    <div className={`w-10 h-10 flex items-center justify-center rounded-xl font-bold text-white mr-3 ${oIndex === 0 ? "bg-red-400" : oIndex === 1 ? "bg-blue-400" : oIndex === 2 ? "bg-yellow-400" : "bg-green-400"
                                        }`}>
                                        {String.fromCharCode(65 + oIndex)}
                                    </div>
                                    <input
                                        type="text"
                                        placeholder={`Opción ${oIndex + 1}`}
                                        className="flex-1 bg-transparent border-none focus:ring-0 outline-none text-slate-700 font-medium"
                                        value={option}
                                        onChange={(e) => updateOption(qIndex, oIndex, e.target.value)}
                                    />
                                    <button
                                        onClick={() => updateQuestion(qIndex, "correct_answer", option)}
                                        className={`p-2 rounded-lg transition-colors ${q.correct_answer === option && option !== "" ? "bg-green-500 text-white" : "text-slate-200 hover:text-green-500"
                                            }`}
                                    >
                                        <Check className="w-5 h-5" />
                                    </button>
                                </div>
                            ))}
                        </div>

                        <div className="flex items-center gap-6 pt-4 border-t border-slate-50">
                            <div className="flex items-center gap-2">
                                <span className="text-sm font-semibold text-slate-500">Tiempo:</span>
                                <select
                                    className="bg-slate-50 border-none rounded-lg text-sm font-bold text-slate-700 focus:ring-0"
                                    value={q.time_limit}
                                    onChange={(e) => updateQuestion(qIndex, "time_limit", parseInt(e.target.value))}
                                >
                                    <option value={10}>10 seg</option>
                                    <option value={20}>20 seg</option>
                                    <option value={30}>30 seg</option>
                                    <option value={60}>1 min</option>
                                </select>
                            </div>
                        </div>
                    </div>
                ))}

                <button
                    onClick={handleAddQuestion}
                    className="w-full py-12 border-4 border-dashed border-slate-200 rounded-3xl text-slate-300 hover:text-blue-500 hover:border-blue-200 hover:bg-blue-50 transition-all flex flex-col items-center gap-3 font-bold text-xl"
                >
                    <Plus className="w-10 h-10" />
                    Añadir Pregunta
                </button>
            </main>
        </div>
    );
}
