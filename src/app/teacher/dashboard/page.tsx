"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Plus, BookOpen, Play, Trash2, LogOut, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";

interface Quiz {
    id: string;
    title: string;
    questions: { id: string }[];
}

interface User {
    id: string;
    email?: string;
}

export default function TeacherDashboard() {
    const [quizzes, setQuizzes] = useState<Quiz[]>([]);
    const [loading, setLoading] = useState(true);
    const [user, setUser] = useState<User | null>(null);
    const router = useRouter();

    useEffect(() => {
        const checkUser = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                router.push("/teacher/login");
                return;
            }
            setUser(user);
            fetchQuizzes(user.id);
        };

        checkUser();
    }, [router]);

    const fetchQuizzes = async (userId: string) => {
        const { data, error } = await supabase
            .from("quizzes")
            .select("*, questions(id)")
            .eq("teacher_id", userId)
            .order("created_at", { ascending: false });

        if (!error) setQuizzes(data || []);
        setLoading(false);
    };

    const handleLogout = async () => {
        await supabase.auth.signOut();
        router.push("/");
    };

    const startSession = async (quizId: string) => {
        const pin = Math.floor(100000 + Math.random() * 900000).toString();
        const { data, error } = await supabase
            .from("sessions")
            .insert({
                quiz_id: quizId,
                pin: pin,
                status: "waiting"
            })
            .select()
            .single();

        if (!error && data) {
            router.push(`/teacher/session/${data.id}`);
        }
    };

    const deleteQuiz = async (id: string) => {
        const { error } = await supabase.from("quizzes").delete().eq("id", id);
        if (!error) setQuizzes(quizzes.filter(q => q.id !== id));
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50">
            {/* Header */}
            <nav className="bg-white border-b border-slate-200 px-6 py-4 flex justify-between items-center shadow-sm">
                <div className="flex items-center gap-2">
                    <Presentation className="w-6 h-6 text-blue-600" />
                    <span className="font-bold text-slate-900 text-lg">Panel de Profesora</span>
                </div>
                <div className="flex items-center gap-4">
                    <span className="text-sm text-slate-500 hidden sm:block">{user?.email}</span>
                    <button
                        onClick={handleLogout}
                        className="p-2 hover:bg-slate-100 rounded-lg text-slate-500 transition-colors"
                    >
                        <LogOut className="w-5 h-5" />
                    </button>
                </div>
            </nav>

            <main className="max-w-6xl mx-auto p-6 space-y-8">
                <div className="flex justify-between items-center">
                    <h1 className="text-3xl font-bold text-slate-900">Mis Quizzes</h1>
                    <button
                        onClick={() => router.push("/teacher/editor/new")}
                        className="flex items-center gap-2 bg-slate-900 text-white px-5 py-2.5 rounded-xl font-semibold hover:bg-slate-800 transition-all shadow-md"
                    >
                        <Plus className="w-5 h-5" />
                        Crear Quiz
                    </button>
                </div>

                {quizzes.length === 0 ? (
                    <div className="bg-white rounded-2xl border-2 border-dashed border-slate-200 p-12 text-center space-y-4">
                        <div className="bg-slate-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto text-slate-300">
                            <BookOpen className="w-8 h-8" />
                        </div>
                        <div className="space-y-2">
                            <h3 className="text-lg font-semibold text-slate-900">No tienes quizzes aún</h3>
                            <p className="text-slate-500">Comienza creando tu primer cuestionario para tus alumnos.</p>
                        </div>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {quizzes.map((quiz) => (
                            <div key={quiz.id} className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 hover:shadow-md transition-shadow flex flex-col justify-between space-y-4">
                                <div className="space-y-2">
                                    <h3 className="font-bold text-xl text-slate-900 line-clamp-2">{quiz.title}</h3>
                                    <p className="text-slate-500 text-sm">{quiz.questions.length} preguntas</p>
                                </div>

                                <div className="flex items-center gap-3 pt-4 border-t border-slate-50">
                                    <button
                                        onClick={() => startSession(quiz.id)}
                                        className="flex-1 flex items-center justify-center gap-2 bg-blue-600 text-white font-bold py-2.5 rounded-xl hover:bg-blue-700 transition-colors"
                                    >
                                        <Play className="w-4 h-4" />
                                        Presentar
                                    </button>
                                    <button
                                        className="p-2.5 hover:bg-slate-50 rounded-xl text-slate-400 hover:text-red-500 transition-all"
                                        onClick={() => deleteQuiz(quiz.id)}
                                    >
                                        <Trash2 className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </main>
        </div>
    );
}

// Temporary Presentation icon since I missed it in imports
function Presentation({ className }: { className?: string }) {
    return (
        <svg
            className={className}
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <path d="M2 3h20" /><path d="M21 3v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V3" /><path d="m7 21 5-5 5 5" />
        </svg>
    );
}
