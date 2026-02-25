"use client";

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { Plus, BookOpen, Play, Trash2, LogOut, Loader2, History, Calendar, Pencil, LayoutDashboard, ChevronRight } from "lucide-react";
import { useRouter } from "next/navigation";

interface Quiz {
    id: string;
    title: string;
    questions: { id: string }[];
}

interface FinishedSession {
    id: string;
    pin: string;
    created_at: string;
    finished_at: string;
    quiz: { title: string };
    _count?: { participants: number };
}

interface User {
    id: string;
    email?: string;
}

export default function TeacherDashboard() {
    const [activeTab, setActiveTab] = useState<"quizzes" | "history">("quizzes");
    const [quizzes, setQuizzes] = useState<Quiz[]>([]);
    const [history, setHistory] = useState<FinishedSession[]>([]);
    const [loading, setLoading] = useState(true);
    const [user, setUser] = useState<User | null>(null);
    const router = useRouter();

    const fetchQuizzes = useCallback(async (userId: string) => {
        const { data, error } = await supabase
            .from("quizzes")
            .select("*, questions(id)")
            .eq("teacher_id", userId)
            .order("created_at", { ascending: false });

        if (!error) setQuizzes(data || []);
    }, []);

    const fetchHistory = useCallback(async (userId: string) => {
        const { data, error } = await supabase
            .from("sessions")
            .select(`
                id, pin, created_at, finished_at,
                quiz:quizzes!inner(title, teacher_id)
            `)
            .eq("quiz.teacher_id", userId)
            .eq("status", "finished")
            .order("finished_at", { ascending: false });

        if (!error) setHistory(data as unknown as FinishedSession[] || []);
    }, []);

    useEffect(() => {
        const checkUser = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                router.push("/teacher/login");
                return;
            }
            setUser(user);
            await Promise.all([
                fetchQuizzes(user.id),
                fetchHistory(user.id)
            ]);
            setLoading(false);
        };

        checkUser();
    }, [router, fetchQuizzes, fetchHistory]);

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
        if (!confirm("¿Estás seguro de que quieres eliminar este quiz?")) return;
        const { error } = await supabase.from("quizzes").delete().eq("id", id);
        if (!error) setQuizzes(quizzes.filter(q => q.id !== id));
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50">
                <Loader2 className="w-10 h-10 animate-spin text-blue-600" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row">
            {/* Sidebar-like Navigation for Modern Feel */}
            <aside className="w-full md:w-72 bg-white border-r border-slate-100 p-6 flex flex-col sticky top-0 md:h-screen z-30">
                <div className="flex items-center gap-3 mb-12">
                    <div className="w-10 h-10 bg-slate-900 rounded-xl flex items-center justify-center text-white shadow-lg">
                        <LayoutDashboard className="w-6 h-6" />
                    </div>
                    <span className="text-2xl font-black text-slate-900 tracking-tighter">QuizzLive</span>
                </div>

                <nav className="flex-1 space-y-2">
                    <button
                        onClick={() => setActiveTab("quizzes")}
                        className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl font-black transition-all ${activeTab === "quizzes"
                            ? "bg-blue-50 text-blue-600"
                            : "text-slate-400 hover:bg-slate-50 hover:text-slate-600"
                            }`}
                    >
                        <BookOpen className="w-5 h-5" />
                        Mis Quizzes
                    </button>
                    <button
                        onClick={() => setActiveTab("history")}
                        className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl font-black transition-all ${activeTab === "history"
                            ? "bg-blue-50 text-blue-600"
                            : "text-slate-400 hover:bg-slate-50 hover:text-slate-600"
                            }`}
                    >
                        <History className="w-5 h-5" />
                        Historial
                    </button>
                </nav>

                <div className="pt-6 border-t border-slate-50 space-y-4">
                    <div className="px-4">
                        <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest mb-1">Usuario</p>
                        <p className="text-sm font-bold text-slate-900 truncate">{user?.email}</p>
                    </div>
                    <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl font-bold text-red-400 hover:bg-red-50 hover:text-red-500 transition-all"
                    >
                        <LogOut className="w-5 h-5" />
                        Cerrar Sesión
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 p-6 md:p-12 space-y-10 overflow-y-auto">
                <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
                    <div>
                        <h1 className="text-4xl md:text-5xl font-black text-slate-900">
                            {activeTab === "quizzes" ? "Mis Quizzes" : "Historial de Sesiones"}
                        </h1>
                        <p className="text-slate-400 font-medium mt-1">
                            {activeTab === "quizzes"
                                ? "Gestiona tus contenidos y comienza nuevas sesiones."
                                : "Revisa el desempeño de tus alumnos en sesiones pasadas."}
                        </p>
                    </div>

                    {activeTab === "quizzes" && (
                        <button
                            onClick={() => router.push("/teacher/editor/new")}
                            className="bg-blue-600 text-white px-8 py-4 rounded-[1.5rem] font-black shadow-xl shadow-blue-200 hover:bg-blue-700 transition-all active:scale-95 flex items-center gap-2"
                        >
                            <Plus className="w-6 h-6" />
                            NUEVO QUIZ
                        </button>
                    )}
                </header>

                {activeTab === "quizzes" ? (
                    quizzes.length === 0 ? (
                        <div className="bg-white rounded-[3rem] border-4 border-dashed border-slate-100 p-20 text-center space-y-6">
                            <div className="bg-blue-50 w-24 h-24 rounded-[2rem] flex items-center justify-center mx-auto text-blue-500">
                                <BookOpen className="w-12 h-12" />
                            </div>
                            <div className="space-y-2">
                                <h3 className="text-2xl font-black text-slate-900">¿Qué tal si empezamos?</h3>
                                <p className="text-slate-400 font-medium max-w-sm mx-auto text-lg leading-relaxed">
                                    Crea tu primer cuestionario interactivo y sorprende a tus alumnos.
                                </p>
                            </div>
                            <button
                                onClick={() => router.push("/teacher/editor/new")}
                                className="inline-flex items-center gap-2 text-blue-600 font-black text-lg hover:gap-3 transition-all"
                            >
                                Crear ahora <ChevronRight className="w-5 h-5" />
                            </button>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-8">
                            {quizzes.map((quiz) => (
                                <div key={quiz.id} className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-slate-50 transition-all hover:shadow-2xl hover:shadow-slate-200/50 flex flex-col justify-between space-y-8 relative group overflow-hidden">
                                    {/* Decorator */}
                                    <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50/50 rounded-bl-[4rem] -mr-8 -mt-8 -z-0 transition-all group-hover:scale-110" />

                                    <div className="space-y-4 relative z-10">
                                        <div className="w-14 h-14 bg-white shadow-lg rounded-2xl flex items-center justify-center text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-all duration-500">
                                            <BookOpen className="w-7 h-7" />
                                        </div>
                                        <div>
                                            <h3 className="font-black text-2xl text-slate-900 leading-tight group-hover:text-blue-600 transition-colors">{quiz.title}</h3>
                                            <div className="flex items-center gap-2 mt-2">
                                                <span className="bg-slate-100 px-3 py-1 rounded-full text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                                    {quiz.questions.length} Preguntas
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-3 pt-6 border-t border-slate-50 relative z-10">
                                        <button
                                            onClick={() => startSession(quiz.id)}
                                            className="flex-1 flex items-center justify-center gap-2 bg-slate-900 text-white font-black py-4 rounded-2xl hover:bg-blue-600 transition-all active:scale-95 shadow-xl shadow-slate-200"
                                        >
                                            <Play className="w-5 h-5 fill-white" />
                                            PRESENTAR
                                        </button>
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => router.push(`/teacher/editor/${quiz.id}`)}
                                                className="p-4 bg-slate-50 rounded-2xl text-slate-400 hover:text-blue-600 hover:bg-white hover:shadow-lg transition-all"
                                                title="Editar"
                                            >
                                                <Pencil className="w-5 h-5" />
                                            </button>
                                            <button
                                                onClick={() => deleteQuiz(quiz.id)}
                                                className="p-4 bg-slate-50 rounded-2xl text-slate-400 hover:text-red-500 hover:bg-white hover:shadow-lg transition-all"
                                                title="Eliminar"
                                            >
                                                <Trash2 className="w-5 h-5" />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )
                ) : (
                    history.length === 0 ? (
                        <div className="bg-white rounded-[3rem] border-4 border-dashed border-slate-100 p-20 text-center space-y-6">
                            <div className="bg-slate-50 w-24 h-24 rounded-[2rem] flex items-center justify-center mx-auto text-slate-200">
                                <History className="w-12 h-12" />
                            </div>
                            <div className="space-y-2">
                                <h3 className="text-2xl font-black text-slate-900">Sin huellas aún</h3>
                                <p className="text-slate-400 font-medium max-w-sm mx-auto text-lg">
                                    Tus sesiones finalizadas aparecerán aquí con todos sus detalles.
                                </p>
                            </div>
                        </div>
                    ) : (
                        <div className="bg-white rounded-[2.5rem] shadow-xl shadow-slate-200/50 overflow-hidden border border-slate-100">
                            <div className="overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead className="bg-slate-50/50 text-slate-400 font-black text-[10px] uppercase tracking-[0.2em]">
                                        <tr>
                                            <th className="px-10 py-6">Cuestionario</th>
                                            <th className="px-10 py-6">Fecha</th>
                                            <th className="px-10 py-6 text-center">PIN de Acceso</th>
                                            <th className="px-10 py-6 text-right whitespace-nowrap">Resultados</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50 font-bold text-slate-600">
                                        {history.map((session) => (
                                            <tr key={session.id} className="hover:bg-blue-50/30 transition-all group">
                                                <td className="px-10 py-8">
                                                    <div className="font-black text-slate-900 text-lg group-hover:text-blue-600 transition-colors">
                                                        {session.quiz.title}
                                                    </div>
                                                </td>
                                                <td className="px-10 py-8">
                                                    <div className="flex items-center gap-2 text-slate-400">
                                                        <Calendar className="w-4 h-4" />
                                                        {new Date(session.finished_at).toLocaleDateString("es-ES", {
                                                            day: "2-digit",
                                                            month: "long",
                                                            year: "numeric"
                                                        })}
                                                    </div>
                                                </td>
                                                <td className="px-10 py-8 text-center">
                                                    <span className="bg-slate-100 px-4 py-2 rounded-xl text-slate-600 font-mono text-base tracking-widest border border-slate-200">
                                                        {session.pin}
                                                    </span>
                                                </td>
                                                <td className="px-10 py-8 text-right">
                                                    <button
                                                        onClick={() => router.push(`/teacher/reports/${session.id}`)}
                                                        className="inline-flex items-center gap-2 bg-slate-900 text-white px-6 py-2.5 rounded-xl font-black text-sm hover:bg-blue-600 transition-all active:scale-95 shadow-lg shadow-slate-100"
                                                    >
                                                        INFORME
                                                        <ChevronRight className="w-4 h-4" />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )
                )}
            </main>
        </div>
    );
}
