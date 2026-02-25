import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { Plus, BookOpen, Play, Trash2, LogOut, Loader2, History, Presentation, Calendar, Users, Trophy } from "lucide-react";
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

        if (!error) setHistory(data as any || []);
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
                {/* Tabs & Actions */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div className="flex bg-white p-1 rounded-2xl shadow-sm border border-slate-100">
                        <button
                            onClick={() => setActiveTab("quizzes")}
                            className={`px-6 py-2.5 rounded-xl font-bold transition-all flex items-center gap-2 ${activeTab === "quizzes" ? "bg-slate-900 text-white" : "text-slate-500 hover:text-slate-900"
                                }`}
                        >
                            <BookOpen className="w-4 h-4" />
                            Mis Quizzes
                        </button>
                        <button
                            onClick={() => setActiveTab("history")}
                            className={`px-6 py-2.5 rounded-xl font-bold transition-all flex items-center gap-2 ${activeTab === "history" ? "bg-slate-900 text-white" : "text-slate-500 hover:text-slate-900"
                                }`}
                        >
                            <History className="w-4 h-4" />
                            Historial
                        </button>
                    </div>

                    {activeTab === "quizzes" && (
                        <button
                            onClick={() => router.push("/teacher/editor/new")}
                            className="flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-2xl font-black shadow-lg hover:bg-blue-700 transition-all active:scale-95"
                        >
                            <Plus className="w-5 h-5" />
                            NUEVO QUIZ
                        </button>
                    )}
                </div>

                {activeTab === "quizzes" ? (
                    quizzes.length === 0 ? (
                        <div className="bg-white rounded-3xl border-2 border-dashed border-slate-200 p-20 text-center space-y-4">
                            <div className="bg-slate-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto text-slate-300">
                                <BookOpen className="w-10 h-10" />
                            </div>
                            <div className="space-y-2">
                                <h3 className="text-xl font-black text-slate-900">No tienes quizzes aún</h3>
                                <p className="text-slate-500 font-medium max-w-xs mx-auto">Comienza creando tu primer cuestionario para tus alumnos.</p>
                            </div>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {quizzes.map((quiz) => (
                                <div key={quiz.id} className="bg-white rounded-[2rem] p-8 shadow-sm border border-slate-100 hover:shadow-xl transition-all flex flex-col justify-between space-y-6 group">
                                    <div className="space-y-3">
                                        <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                                            <BookOpen className="w-6 h-6" />
                                        </div>
                                        <h3 className="font-black text-2xl text-slate-900 leading-tight">{quiz.title}</h3>
                                        <div className="flex items-center gap-2 text-slate-500 font-bold text-sm">
                                            <div className="w-2 h-2 rounded-full bg-slate-300" />
                                            {quiz.questions.length} PREGUNTAS
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-3 pt-6 border-t border-slate-50">
                                        <button
                                            onClick={() => startSession(quiz.id)}
                                            className="flex-1 flex items-center justify-center gap-2 bg-slate-900 text-white font-black py-4 rounded-2xl hover:bg-slate-800 transition-all active:scale-95 shadow-md"
                                        >
                                            <Play className="w-5 h-5" />
                                            PRESENTAR
                                        </button>
                                        <button
                                            className="p-4 bg-slate-50 rounded-2xl text-slate-400 hover:text-red-500 hover:bg-red-50 transition-all"
                                            onClick={() => deleteQuiz(quiz.id)}
                                        >
                                            <Trash2 className="w-5 h-5" />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )
                ) : (
                    history.length === 0 ? (
                        <div className="bg-white rounded-3xl border-2 border-dashed border-slate-200 p-20 text-center space-y-4">
                            <div className="bg-slate-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto text-slate-300">
                                <History className="w-10 h-10" />
                            </div>
                            <div className="space-y-2">
                                <h3 className="text-xl font-black text-slate-900">Historial vacío</h3>
                                <p className="text-slate-500 font-medium max-w-xs mx-auto">Las sesiones que finalices aparecerán aquí con sus resultados.</p>
                            </div>
                        </div>
                    ) : (
                        <div className="bg-white rounded-[2rem] overflow-hidden border border-slate-100 shadow-sm">
                            <table className="w-full text-left">
                                <thead className="bg-slate-50 border-b border-slate-100 text-slate-400 font-black text-xs uppercase tracking-widest">
                                    <tr>
                                        <th className="px-8 py-5">Cuestionario</th>
                                        <th className="px-8 py-5">Fecha</th>
                                        <th className="px-8 py-5 text-center">PIN</th>
                                        <th className="px-8 py-5 text-right">Acción</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50 font-bold text-slate-600">
                                    {history.map((session) => (
                                        <tr key={session.id} className="hover:bg-slate-50/50 transition-colors group">
                                            <td className="px-8 py-6">
                                                <div className="font-black text-slate-900">{session.quiz.title}</div>
                                            </td>
                                            <td className="px-8 py-6 text-sm">
                                                <div className="flex items-center gap-2 text-slate-400">
                                                    <Calendar className="w-4 h-4" />
                                                    {new Date(session.finished_at).toLocaleDateString()}
                                                </div>
                                            </td>
                                            <td className="px-8 py-6 text-center">
                                                <span className="bg-slate-100 px-3 py-1 rounded-lg text-slate-500 font-mono tracking-tighter">
                                                    {session.pin}
                                                </span>
                                            </td>
                                            <td className="px-8 py-6 text-right">
                                                <button
                                                    onClick={() => router.push(`/teacher/reports/${session.id}`)}
                                                    className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700"
                                                >
                                                    Ver Informe
                                                    <ArrowRight className="w-4 h-4" />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )
                )}
            </main>
        </div>
    );
}

// Add ArrowRight for the table action
function ArrowRight({ className }: { className?: string }) {
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
            <path d="M5 12h14" /><path d="m12 5 7 7-7 7" />
        </svg>
    );
}
