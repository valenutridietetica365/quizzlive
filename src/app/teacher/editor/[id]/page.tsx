"use client";

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { Plus, Trash2, Save, ArrowLeft, Loader2, Check, ToggleLeft, ListChecks, Image as ImageIcon } from "lucide-react";
import { useRouter, useParams } from "next/navigation";
import Image from "next/image";

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
        const sortedQuestions = (quiz.questions as unknown as (Question & { sort_order: number })[]).sort((a, b) => a.sort_order - b.sort_order);
        setQuestions(sortedQuestions.map(q => ({
            id: q.id,
            question_text: q.question_text,
            question_type: q.question_type as "multiple_choice" | "true_false",
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

    const updateQuestion = (index: number, field: keyof Question, value: string | number) => {
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
                const { data: newQuiz, error: quizError } = await supabase
                    .from("quizzes")
                    .insert({ title, teacher_id: user.id })
                    .select()
                    .single();

                if (quizError || !newQuiz) throw new Error("Error al crear quiz");
                quizId = newQuiz.id;
            } else {
                const { error: quizError } = await supabase
                    .from("quizzes")
                    .update({ title })
                    .eq("id", id);

                if (quizError) throw new Error("Error al actualizar quiz");
                await supabase.from("questions").delete().eq("quiz_id", id);
            }

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
        } catch (error: unknown) {
            alert(error instanceof Error ? error.message : "Error desconocido");
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
        <div className="min-h-screen bg-slate-50 flex flex-col selection:bg-blue-100">
            {/* Sticky Navigation */}
            <nav className="bg-white/80 backdrop-blur-2xl border-b border-slate-100 px-6 py-4 flex justify-between items-center sticky top-0 z-50">
                <div className="flex items-center gap-6">
                    <button
                        onClick={() => router.back()}
                        className="p-3 hover:bg-slate-50 rounded-2xl text-slate-400 hover:text-slate-900 transition-all active:scale-90"
                    >
                        <ArrowLeft className="w-6 h-6" />
                    </button>
                    <div className="h-10 w-px bg-slate-100 hidden md:block" />
                    <div className="flex flex-col">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Editor de Cuestionario</span>
                        <input
                            type="text"
                            placeholder="Título del Quiz..."
                            className="text-2xl font-black text-slate-900 border-none focus:ring-0 outline-none w-64 md:w-[30rem] bg-transparent placeholder:text-slate-200"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                        />
                    </div>
                </div>

                <button
                    onClick={handleSave}
                    disabled={loading || !title || questions.some(q => !q.question_text || !q.correct_answer)}
                    className="btn-premium !py-3.5 !px-8 flex items-center gap-2 disabled:opacity-30 disabled:grayscale transition-all"
                >
                    {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                    <span className="hidden sm:inline">{isNew ? "PUBLICAR QUIZ" : "GUARDAR CAMBIOS"}</span>
                </button>
            </nav>

            <main className="max-w-4xl mx-auto w-full p-6 md:p-12 space-y-12">
                {questions.map((q, qIndex) => (
                    <div key={qIndex} className="bg-white rounded-[3rem] p-10 md:p-14 shadow-sm border border-slate-50 space-y-10 relative group hover:shadow-2xl hover:shadow-slate-200/50 transition-all duration-500">
                        {/* Question Header */}
                        <div className="flex justify-between items-center">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-slate-900 text-white flex items-center justify-center rounded-2xl font-black text-lg shadow-lg rotate-3 group-hover:rotate-0 transition-transform">
                                    {qIndex + 1}
                                </div>
                                <div className="flex bg-slate-50 p-1.5 rounded-2xl border border-slate-100">
                                    <button
                                        onClick={() => updateQuestion(qIndex, "question_type", "multiple_choice")}
                                        className={`px-5 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 ${q.question_type === "multiple_choice"
                                            ? "bg-white shadow-md text-blue-600"
                                            : "text-slate-400 hover:text-slate-600"
                                            }`}
                                    >
                                        <ListChecks className="w-4 h-4" />
                                        OPCIONES
                                    </button>
                                    <button
                                        onClick={() => updateQuestion(qIndex, "question_type", "true_false")}
                                        className={`px-5 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 ${q.question_type === "true_false"
                                            ? "bg-white shadow-md text-orange-600"
                                            : "text-slate-400 hover:text-slate-600"
                                            }`}
                                    >
                                        <ToggleLeft className="w-4 h-4" />
                                        V / F
                                    </button>
                                </div>
                            </div>

                            <button
                                onClick={() => setQuestions(questions.filter((_, i) => i !== qIndex))}
                                className="p-4 text-slate-200 hover:text-red-500 hover:bg-red-50 rounded-[1.5rem] transition-all active:scale-90"
                                title="Eliminar pregunta"
                            >
                                <Trash2 className="w-6 h-6" />
                            </button>
                        </div>

                        {/* Question Text */}
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-300 uppercase tracking-widest ml-1">Texto de la pregunta</label>
                            <textarea
                                placeholder="Haz una pregunta increíble..."
                                className="w-full text-3xl md:text-5xl font-black text-slate-900 border-none focus:ring-0 outline-none resize-none placeholder:text-slate-100 leading-tight"
                                rows={2}
                                value={q.question_text}
                                onChange={(e) => updateQuestion(qIndex, "question_text", e.target.value)}
                            />
                        </div>

                        {/* Media Support */}
                        <div className="space-y-4">
                            <div className="flex items-center gap-4 bg-slate-50 p-6 rounded-[2rem] border border-slate-100 focus-within:ring-2 focus-within:ring-blue-500 transition-all">
                                <ImageIcon className="w-6 h-6 text-slate-400" />
                                <input
                                    type="text"
                                    placeholder="Pega aquí la URL de una imagen (Opcional)"
                                    className="flex-1 bg-transparent border-none focus:ring-0 outline-none text-base font-bold text-slate-700 placeholder:text-slate-300"
                                    value={q.image_url}
                                    onChange={(e) => updateQuestion(qIndex, "image_url", e.target.value)}
                                />
                            </div>

                            {q.image_url && (
                                <div className="relative w-full aspect-video rounded-[2.5rem] overflow-hidden border-4 border-white shadow-xl animate-in fade-in zoom-in duration-500">
                                    <Image
                                        src={q.image_url}
                                        alt="Preview"
                                        fill
                                        className="object-cover"
                                        unoptimized
                                    />
                                    <button
                                        onClick={() => updateQuestion(qIndex, "image_url", "")}
                                        className="absolute top-4 right-4 bg-black/60 hover:bg-red-500 text-white p-2 rounded-full backdrop-blur-md transition-all"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* Options Grid */}
                        <div className="space-y-4">
                            <label className="text-[10px] font-black text-slate-300 uppercase tracking-widest ml-1">Respuestas (Marca la correcta con el check)</label>

                            {q.question_type === "multiple_choice" ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {q.options.map((option, oIndex) => (
                                        <div
                                            key={oIndex}
                                            className={`relative flex items-center p-3 rounded-[2rem] border-4 transition-all duration-300 ${q.correct_answer === option && option !== ""
                                                ? "border-emerald-500 bg-emerald-50/50 shadow-lg shadow-emerald-100"
                                                : "border-slate-50 hover:border-slate-200 hover:bg-white"
                                                }`}
                                        >
                                            <div className={`w-14 h-14 flex items-center justify-center rounded-[1.25rem] font-black text-white text-xl mr-5 shadow-lg ${oIndex === 0 ? "bg-red-500" : oIndex === 1 ? "bg-blue-500" : oIndex === 2 ? "bg-amber-500" : "bg-emerald-500"
                                                }`}>
                                                {String.fromCharCode(65 + oIndex)}
                                            </div>
                                            <input
                                                type="text"
                                                placeholder={`Opción ${oIndex + 1}`}
                                                className="flex-1 bg-transparent border-none focus:ring-0 outline-none text-slate-700 font-black text-lg placeholder:text-slate-200"
                                                value={option}
                                                onChange={(e) => updateOption(qIndex, oIndex, e.target.value)}
                                            />
                                            <button
                                                onClick={() => updateQuestion(qIndex, "correct_answer", option)}
                                                className={`p-4 rounded-2xl transition-all active:scale-90 ${q.correct_answer === option && option !== ""
                                                    ? "bg-emerald-500 text-white shadow-xl shadow-emerald-300"
                                                    : "text-slate-200 hover:text-emerald-500 hover:bg-emerald-50"
                                                    }`}
                                            >
                                                <Check className="w-7 h-7" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                                    {["Verdadero", "Falso"].map((val) => (
                                        <button
                                            key={val}
                                            onClick={() => updateQuestion(qIndex, "correct_answer", val)}
                                            className={`py-12 rounded-[2.5rem] border-4 font-black text-3xl transition-all ${q.correct_answer === val
                                                ? "border-emerald-500 bg-emerald-50 text-emerald-600 shadow-2xl shadow-emerald-100 scale-[1.02]"
                                                : "border-slate-50 text-slate-300 hover:border-slate-200 hover:bg-white bg-slate-50/50"
                                                }`}
                                        >
                                            {val}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Bottom Question Actions */}
                        <div className="flex items-center justify-between pt-10 border-t border-slate-50">
                            <div className="flex items-center gap-6">
                                <div className="flex items-center gap-3 bg-slate-50 px-5 py-3 rounded-2xl border border-slate-100">
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tiempo Límite</span>
                                    <select
                                        className="bg-transparent border-none rounded-lg text-sm font-black text-slate-900 focus:ring-0 cursor-pointer p-0"
                                        value={q.time_limit}
                                        onChange={(e) => updateQuestion(qIndex, "time_limit", parseInt(e.target.value))}
                                    >
                                        <option value={10}>10 Segundos</option>
                                        <option value={20}>20 Segundos</option>
                                        <option value={30}>30 Segundos</option>
                                        <option value={60}>1 Minuto</option>
                                    </select>
                                </div>
                            </div>

                            <div className="flex items-center gap-2 text-slate-300">
                                <Check className="w-5 h-5" />
                                <span className="text-[10px] font-black uppercase tracking-widest">Auto guardado</span>
                            </div>
                        </div>
                    </div>
                ))}

                <button
                    onClick={handleAddQuestion}
                    className="w-full py-20 border-4 border-dashed border-slate-200 rounded-[4rem] text-slate-300 hover:text-blue-600 hover:border-blue-200 hover:bg-blue-50/50 transition-all flex flex-col items-center gap-6 font-black text-3xl group mb-20"
                >
                    <div className="w-20 h-20 bg-slate-100 rounded-[2rem] flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-all shadow-sm group-hover:shadow-xl group-hover:shadow-blue-200 group-hover:-translate-y-2">
                        <Plus className="w-10 h-10" />
                    </div>
                    <span>AÑADIR PREGUNTA</span>
                </button>
            </main>
        </div>
    );
}
