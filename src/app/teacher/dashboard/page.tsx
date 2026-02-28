"use client";

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { Plus, BookOpen, Play, Trash2, LogOut, History, Calendar, Pencil, LayoutDashboard, ChevronRight, Users } from "lucide-react";
import { useRouter } from "next/navigation";
import { QuizCardSkeleton } from "@/components/Skeleton";
import ConfirmModal from "@/components/ConfirmModal";
import { toast } from "sonner";
import { useQuizStore } from "@/lib/store";
import { getTranslation } from "@/lib/i18n";
import LanguageSelector from "@/components/LanguageSelector";
import PerformanceChart from "@/components/PerformanceChart";
import { FinishedSession, SupabaseSessionResponse, LiveSession } from "@/lib/schemas";

interface Quiz {
    id: string;
    title: string;
    tags: string[];
    class_id?: string | null;
    questions: { id: string }[];
}

interface Class {
    id: string;
    name: string;
    description: string;
    created_at: string;
    students?: Student[];
}

import { Student } from "@/lib/schemas";

interface User {
    id: string;
    email?: string;
}

const StatsHeader = ({ stats, t }: { stats: { quizzes: number; sessions: number; avg: number }, t: (key: string) => string }) => (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 md:gap-6 animate-in fade-in slide-in-from-top-4 duration-1000">
        <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm flex flex-col gap-1">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('dashboard.total_quizzes')}</span>
            <span className="text-3xl font-black text-slate-900">{stats.quizzes}</span>
        </div>
        <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm flex flex-col gap-1">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('dashboard.total_sessions')}</span>
            <span className="text-3xl font-black text-slate-900">{stats.sessions}</span>
        </div>
        <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm flex flex-col gap-1">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('dashboard.avg_participation')}</span>
            <span className="text-3xl font-black text-slate-900">{stats.avg}</span>
        </div>
    </div>
);

export default function TeacherDashboard() {
    const {
        language,
        dashboardLoaded,
        dashboardQuizzes,
        dashboardClasses,
        dashboardHistory,
        dashboardLiveSessions,
        setDashboardLoaded,
        setDashboardData
    } = useQuizStore();

    const quizzes = dashboardQuizzes as Quiz[];
    const classes = dashboardClasses as Class[];
    const history = dashboardHistory as FinishedSession[];
    const liveSessions = dashboardLiveSessions as LiveSession[];

    const [activeTab, setActiveTab] = useState<"quizzes" | "history" | "classes">("quizzes");
    const [selectedQuizTag, setSelectedQuizTag] = useState<string>("All");
    const [selectedHistoryTag, setSelectedHistoryTag] = useState<string>("All");
    const [selectedGlobalClassId, setSelectedGlobalClassId] = useState<string>("All");

    // Derived setters mapping to Zustand
    const setQuizzes = useCallback((newQuizzes: Quiz[]) => setDashboardData({ dashboardQuizzes: newQuizzes }), [setDashboardData]);
    const setClasses = useCallback((newClasses: Class[]) => setDashboardData({ dashboardClasses: newClasses }), [setDashboardData]);
    const setHistory = useCallback((newHistory: FinishedSession[]) => setDashboardData({ dashboardHistory: newHistory }), [setDashboardData]);
    const setLiveSessions = useCallback((newLive: LiveSession[] | ((prev: LiveSession[]) => LiveSession[])) => {
        if (typeof newLive === 'function') {
            setDashboardData({ dashboardLiveSessions: newLive(liveSessions) });
        } else {
            setDashboardData({ dashboardLiveSessions: newLive });
        }
    }, [liveSessions, setDashboardData]);

    const [selectedClassForManagement, setSelectedClassForManagement] = useState<Class | null>(null);
    const [newClassName, setNewClassName] = useState("");
    const [newStudentName, setNewStudentName] = useState("");
    const [loading, setLoading] = useState(true);
    const [user, setUser] = useState<User | null>(null);

    const t = (key: string) => getTranslation(language, key);

    const [confirmModal, setConfirmModal] = useState<{
        open: boolean;
        quizId: string | null;
        historyId: string | null;
    }>({ open: false, quizId: null, historyId: null });

    const router = useRouter();

    const fetchClasses = useCallback(async (userId: string) => {
        const { data, error } = await supabase
            .from("classes")
            .select("*, students(*)")
            .eq("teacher_id", userId)
            .order("created_at", { ascending: false });

        if (!error) setClasses(data || []);
    }, [setClasses]);

    const fetchQuizzes = useCallback(async (userId: string) => {
        const { data, error } = await supabase
            .from("quizzes")
            .select("*, questions(id)")
            .eq("teacher_id", userId)
            .order("created_at", { ascending: false });

        if (!error) setQuizzes(data || []);
    }, [setQuizzes]);

    const fetchHistory = useCallback(async (userId: string) => {
        const { data, error } = await supabase
            .from("sessions")
            .select(`
                id, pin, created_at, finished_at,
                quiz:quizzes!inner(title, teacher_id, tags, class_id),
                participants:participants(count)
            `)
            .eq("quiz.teacher_id", userId)
            .eq("status", "finished")
            .order("finished_at", { ascending: false });

        if (!error && data) {
            const formatted: FinishedSession[] = (data as unknown as SupabaseSessionResponse[]).map(s => ({
                id: s.id,
                pin: s.pin,
                created_at: s.created_at,
                finished_at: s.finished_at,
                quiz: { title: s.quiz.title, tags: s.quiz.tags, class_id: s.quiz.class_id },
                _count: { participants: s.participants?.[0]?.count || 0 }
            }));
            setHistory(formatted);
        }
    }, [setHistory]);

    const fetchLiveSessions = useCallback(async (userId: string) => {
        const yesterday = new Date();
        yesterday.setHours(yesterday.getHours() - 24);

        const { data, error } = await supabase
            .from("sessions")
            .select(`
                id, pin, status, created_at,
                quiz:quizzes!inner(title, teacher_id, class_id)
            `)
            .eq("quiz.teacher_id", userId)
            .in("status", ["waiting", "active"])
            .gte("created_at", yesterday.toISOString())
            .order("created_at", { ascending: false });

        if (!error) setLiveSessions(data as unknown as LiveSession[] || []);
    }, [setLiveSessions]);

    const finishSession = async (sessionId: string) => {
        const { error } = await supabase
            .from("sessions")
            .update({ status: "finished", finished_at: new Date().toISOString() })
            .eq("id", sessionId);

        if (!error) {
            setLiveSessions(prev => prev.filter(s => s.id !== sessionId));
            toast.success("Sesión finalizada");
            if (user) fetchHistory(user.id);
        } else {
            toast.error("Error al finalizar la sesión");
        }
    };

    useEffect(() => {
        const checkUser = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                router.push("/teacher/login");
                return;
            }
            setUser(user);

            if (!dashboardLoaded) {
                await Promise.all([
                    fetchQuizzes(user.id),
                    fetchHistory(user.id),
                    fetchLiveSessions(user.id),
                    fetchClasses(user.id)
                ]);
                setDashboardLoaded(true);
            }
            setLoading(false);
        };

        checkUser();
    }, [router, fetchQuizzes, fetchHistory, fetchLiveSessions, fetchClasses, dashboardLoaded, setDashboardLoaded]);

    const handleLogout = async () => {
        await supabase.auth.signOut();
        useQuizStore.getState().resetStore();
        router.push("/");
    };

    const startSession = async (quizId: string) => {
        try {
            let pin = "";
            let unique = false;
            let attempts = 0;

            while (!unique && attempts < 3) {
                pin = Math.floor(100000 + Math.random() * 900000).toString();
                const { data: existing } = await supabase
                    .from("sessions")
                    .select("id")
                    .eq("pin", pin)
                    .in("status", ["waiting", "active"])
                    .maybeSingle();
                if (!existing) unique = true;
                attempts++;
            }

            const { data, error } = await supabase
                .from("sessions")
                .insert({
                    quiz_id: quizId,
                    pin: pin,
                    status: "waiting"
                })
                .select()
                .single();

            if (error) throw error;
            if (data) {
                router.push(`/teacher/session/${data.id}`);
            }
        } catch (error) {
            console.error("Error starting session:", error);
            toast.error(t('dashboard.error_launching') || "Error al lanzar la sesión");
        }
    };

    const deleteQuiz = async (id: string) => {
        const { error } = await supabase.from("quizzes").delete().eq("id", id);
        if (!error) {
            setQuizzes(quizzes.filter(q => q.id !== id));
            toast.success("Cuestionario eliminado con éxito");
        } else {
            toast.error("No se pudo eliminar el cuestionario");
        }
    };

    const deleteHistory = async (id: string) => {
        const { error } = await supabase.from("sessions").delete().eq("id", id);
        if (!error) {
            setHistory(history.filter(h => h.id !== id));
            toast.success("Informe eliminado con éxito");
        } else {
            toast.error("No se pudo eliminar el informe");
        }
    };

    const createClass = async () => {
        if (!user || !newClassName.trim()) return;

        const { data, error } = await supabase
            .from("classes")
            .insert({ name: newClassName, teacher_id: user.id })
            .select()
            .single();

        if (!error) {
            setClasses([{ ...data, students: [] }, ...classes]);
            setNewClassName("");
            toast.success("Clase creada con éxito");
        } else {
            console.error("Error creating class:", error);
            toast.error(`Error: ${error.message || "No se pudo crear la clase"}`);
        }
    };

    const deleteClass = async (id: string) => {
        const { error } = await supabase.from("classes").delete().eq("id", id);
        if (!error) {
            setClasses(classes.filter(c => c.id !== id));
            toast.success("Clase eliminada");
        } else {
            toast.error("Error al eliminar la clase");
        }
    };

    const removeStudent = async (studentId: string) => {
        const { error } = await supabase.from("students").delete().eq("id", studentId);
        if (!error) {
            const updatedClasses = classes.map(cls =>
                cls.id === selectedClassForManagement?.id
                    ? { ...cls, students: cls.students?.filter((s: Student) => s.id !== studentId) }
                    : cls
            );
            setClasses(updatedClasses);
            if (selectedClassForManagement) {
                setSelectedClassForManagement({
                    ...selectedClassForManagement,
                    students: selectedClassForManagement.students?.filter(s => s.id !== studentId)
                });
            }
            toast.success("Alumno eliminado");
        } else {
            toast.error("Error al eliminar alumno");
        }
    };

    const addStudent = async () => {
        if (!selectedClassForManagement || !newStudentName.trim()) return;

        const { data, error } = await supabase
            .from("students")
            .insert({
                class_id: selectedClassForManagement.id,
                name: newStudentName.trim()
            })
            .select()
            .single();

        if (!error) {
            const updatedClasses = classes.map(cls =>
                cls.id === selectedClassForManagement.id
                    ? { ...cls, students: [...(cls.students || []), data] }
                    : cls
            );
            setClasses(updatedClasses);
            setSelectedClassForManagement({
                ...selectedClassForManagement,
                students: [...(selectedClassForManagement.students || []), data]
            });
            setNewStudentName("");
            toast.success("Alumno añadido");
        } else {
            toast.error("Error al añadir alumno");
        }
    };

    const stats = {
        quizzes: quizzes.length,
        sessions: history.length + liveSessions.length,
        avg: history.length > 0
            ? Math.round(history.reduce((acc, curr) => acc + (curr._count?.participants || 0), 0) / history.length)
            : 0
    };

    const allTags = ["All", ...Array.from(new Set(quizzes.flatMap(q => q.tags || [])))];
    const filteredQuizzes = quizzes.filter(q => {
        const matchesTag = selectedQuizTag === "All" || q.tags?.includes(selectedQuizTag);
        const matchesClass = selectedGlobalClassId === "All" || q.class_id === selectedGlobalClassId;
        return matchesTag && matchesClass;
    });

    const allHistoryTags = ["All", ...Array.from(new Set(history.flatMap(h => h.quiz.tags || [])))];
    const filteredHistory = history.filter(h => {
        const matchesTag = selectedHistoryTag === "All" || h.quiz.tags?.includes(selectedHistoryTag);
        const matchesClass = selectedGlobalClassId === "All" || h.quiz.class_id === selectedGlobalClassId;
        return matchesTag && matchesClass;
    });

    const filteredLiveSessions = liveSessions.filter(s => {
        return selectedGlobalClassId === "All" || s.quiz.class_id === selectedGlobalClassId;
    });

    const renderContent = () => {
        if (loading) {
            return (
                <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-8">
                    {[1, 2, 3, 4, 5, 6].map((i) => (
                        <QuizCardSkeleton key={i} />
                    ))}
                </div>
            );
        }

        if (activeTab === "quizzes") {
            return quizzes.length === 0 ? (
                <div className="bg-white rounded-[3rem] border-4 border-dashed border-slate-100 p-20 text-center space-y-6">
                    <div className="bg-blue-50 w-24 h-24 rounded-[2rem] flex items-center justify-center mx-auto text-blue-500">
                        <BookOpen className="w-12 h-12" />
                    </div>
                    <div className="space-y-2">
                        <h3 className="text-2xl font-black text-slate-900">{t('dashboard.empty_title')}</h3>
                        <p className="text-slate-400 font-medium max-w-sm mx-auto text-lg leading-relaxed">
                            {t('dashboard.empty_subtitle')}
                        </p>
                    </div>
                    <button
                        onClick={() => router.push("/teacher/editor/new")}
                        className="inline-flex items-center gap-2 text-blue-600 font-black text-lg hover:gap-3 transition-all"
                    >
                        {t('dashboard.empty_button')} <ChevronRight className="w-5 h-5" />
                    </button>
                </div>
            ) : (
                <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
                    <div className="flex bg-white p-1.5 rounded-2xl border border-slate-100 overflow-x-auto no-scrollbar gap-2 max-w-full">
                        {allTags.map(tag => (
                            <button
                                key={tag}
                                onClick={() => setSelectedQuizTag(tag)}
                                className={`px-5 py-2.5 rounded-xl font-black text-sm whitespace-nowrap transition-all ${selectedQuizTag === tag
                                    ? "bg-slate-900 text-white shadow-lg shadow-slate-200"
                                    : "text-slate-400 hover:bg-slate-50 hover:text-slate-600"
                                    }`}
                            >
                                {tag === "All" ? (t('dashboard.all_tags') || "Todos") : tag}
                            </button>
                        ))}
                    </div>

                    {filteredLiveSessions.length > 0 && (
                        <div className="space-y-6">
                            <div className="flex items-center gap-3">
                                <span className="relative flex h-3 w-3">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                                </span>
                                <h2 className="text-xl font-black text-slate-900 uppercase tracking-widest">{t('dashboard.live_sessions') || "Sesiones en Vivo"}</h2>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {filteredLiveSessions.map((session) => (
                                    <div
                                        key={session.id}
                                        onClick={() => router.push(`/teacher/session/${session.id}`)}
                                        className="bg-slate-900 text-white p-6 rounded-[2rem] border-b-4 border-blue-600 hover:scale-[1.02] transition-all cursor-pointer group flex flex-col justify-between h-48"
                                    >
                                        <div className="flex justify-between items-start">
                                            <div className="space-y-1">
                                                <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest">{session.status === 'active' ? 'En Juego' : 'Esperando'}</p>
                                                <h3 className="text-xl font-black truncate max-w-[180px]">{session.quiz.title}</h3>
                                            </div>
                                            <div className="bg-white/10 px-3 py-1.5 rounded-xl font-mono font-black text-lg tracking-wider">
                                                {session.pin}
                                            </div>
                                        </div>
                                        <div className="flex items-center justify-between pt-4 border-t border-white/5">
                                            <span className="text-xs font-bold text-slate-400">{new Date(session.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        finishSession(session.id);
                                                    }}
                                                    className="p-2 bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white rounded-xl transition-all"
                                                    title="Finalizar sesión"
                                                >
                                                    <LogOut className="w-4 h-4" />
                                                </button>
                                                <button className="bg-blue-600 p-2 rounded-xl group-hover:px-4 transition-all flex items-center gap-2">
                                                    <ChevronRight className="w-5 h-5" />
                                                    <span className="hidden group-hover:inline text-[10px] font-black uppercase">Reanudar</span>
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
                        {filteredQuizzes.map((quiz) => (
                            <div key={quiz.id} className="bg-white rounded-2xl p-4 shadow-sm border border-slate-50 transition-all hover:shadow-2xl hover:shadow-slate-200/50 flex flex-col justify-between space-y-4 relative group overflow-hidden">
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
                                        onClick={() => startSession(quiz.id)}
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
                                            onClick={() => setConfirmModal({ open: true, quizId: quiz.id, historyId: null })}
                                            className="p-4 bg-slate-50 rounded-2xl text-slate-400 hover:text-red-500 hover:bg-white hover:shadow-lg transition-all"
                                            title={t('common.delete')}
                                        >
                                            <Trash2 className="w-5 h-5" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            );
        } else if (activeTab === "classes") {
            return (
                <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
                    <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm space-y-6">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div className="space-y-1">
                                <h2 className="text-xl font-black text-slate-900 uppercase tracking-widest leading-none">{t('sidebar.classes')}</h2>
                                <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">Crea grupos permanentes para tus alumnos</p>
                            </div>
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={newClassName}
                                    onChange={(e) => setNewClassName(e.target.value)}
                                    placeholder="Nombre de la clase (ej. 3º B)"
                                    className="flex-1 md:w-64 bg-slate-50 border-none focus:ring-2 focus:ring-blue-500 rounded-xl px-4 py-3 font-bold text-sm"
                                    onKeyDown={(e) => e.key === 'Enter' && createClass()}
                                />
                                <button
                                    onClick={createClass}
                                    className="bg-slate-900 text-white p-3 rounded-xl hover:bg-blue-600 transition-all active:scale-95"
                                >
                                    <Plus className="w-6 h-6" />
                                </button>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                            {classes.map((cls) => (
                                <div key={cls.id} className="bg-slate-50 p-6 rounded-[2rem] border border-slate-100 group relative hover:bg-white hover:shadow-xl hover:shadow-slate-200/50 transition-all cursor-pointer" onClick={() => setSelectedClassForManagement(cls)}>
                                    <div className="space-y-3">
                                        <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center text-blue-600 shadow-sm group-hover:bg-blue-600 group-hover:text-white transition-all">
                                            <Users className="w-6 h-6" />
                                        </div>
                                        <div>
                                            <h3 className="font-black text-xl text-slate-900">{cls.name}</h3>
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{cls.students?.length || 0} Alumnos</p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            deleteClass(cls.id);
                                        }}
                                        className="absolute top-6 right-6 p-2 text-slate-300 hover:text-red-500 transition-colors"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            ))}
                        </div>

                        {selectedClassForManagement && (
                            <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                                <div className="bg-white w-full max-w-2xl rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
                                    <div className="p-8 md:p-12 space-y-8">
                                        <div className="flex justify-between items-start">
                                            <div className="space-y-2">
                                                <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tight">{selectedClassForManagement.name}</h2>
                                                <p className="text-slate-400 font-bold text-xs uppercase tracking-widest">Gestión de Alumnos</p>
                                            </div>
                                            <button onClick={() => setSelectedClassForManagement(null)} className="p-4 bg-slate-50 rounded-2xl text-slate-400 hover:text-slate-900 transition-all">
                                                <ChevronRight className="w-6 h-6 rotate-180" />
                                            </button>
                                        </div>

                                        <div className="flex gap-2">
                                            <input
                                                type="text"
                                                value={newStudentName}
                                                onChange={(e) => setNewStudentName(e.target.value)}
                                                placeholder="Nombre completo del alumno"
                                                className="flex-1 bg-slate-50 border-none focus:ring-2 focus:ring-blue-500 rounded-2xl px-6 py-4 font-bold"
                                                onKeyDown={(e) => e.key === 'Enter' && addStudent()}
                                            />
                                            <button
                                                onClick={addStudent}
                                                className="bg-blue-600 text-white px-8 rounded-2xl font-black hover:bg-blue-700 transition-all active:scale-95 shadow-lg shadow-blue-100"
                                            >
                                                Añadir
                                            </button>
                                        </div>

                                        <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 no-scrollbar">
                                            {selectedClassForManagement.students?.length === 0 ? (
                                                <div className="text-center py-12 bg-slate-50 rounded-[2rem] border-2 border-dashed border-slate-200">
                                                    <p className="text-slate-400 font-bold uppercase text-xs tracking-widest">No hay alumnos en esta clase</p>
                                                </div>
                                            ) : (
                                                selectedClassForManagement.students?.map((student) => (
                                                    <div key={student.id} className="flex items-center justify-between p-6 bg-slate-50 rounded-2xl border border-slate-100 group hover:bg-white hover:shadow-lg transition-all">
                                                        <div className="flex items-center gap-4">
                                                            <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-slate-400 font-black">
                                                                {student.name.charAt(0).toUpperCase()}
                                                            </div>
                                                            <span className="font-black text-slate-900">{student.name}</span>
                                                        </div>
                                                        <button onClick={() => removeStudent(student.id!)} className="p-2 text-slate-300 hover:text-red-500 transition-colors">
                                                            <Trash2 className="w-5 h-5" />
                                                        </button>
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            );
        } else {
            return history.length === 0 ? (
                <div className="bg-white rounded-[2.5rem] md:rounded-[3rem] border-4 border-dashed border-slate-100 p-10 md:p-20 text-center space-y-6">
                    <div className="bg-slate-50 w-20 md:w-24 h-20 md:h-24 rounded-2xl md:rounded-[2rem] flex items-center justify-center mx-auto text-slate-200">
                        <History className="w-10 md:w-12 h-10 md:h-12" />
                    </div>
                    <div className="space-y-2">
                        <h3 className="text-xl md:text-2xl font-black text-slate-900">{t('dashboard.history_empty_title')}</h3>
                        <p className="text-slate-400 font-medium max-w-sm mx-auto text-base md:text-lg px-4">
                            {t('dashboard.history_empty_subtitle')}
                        </p>
                    </div>
                </div>
            ) : (
                <div className="space-y-6">
                    <div className="flex bg-white p-1.5 rounded-2xl border border-slate-100 overflow-x-auto no-scrollbar gap-2 max-w-full mb-4">
                        {allHistoryTags.map((tag: string) => (
                            <button
                                key={tag}
                                onClick={() => setSelectedHistoryTag(tag)}
                                className={`px-5 py-2.5 rounded-xl font-black text-sm whitespace-nowrap transition-all ${selectedHistoryTag === tag
                                    ? "bg-slate-900 text-white shadow-lg shadow-slate-200"
                                    : "text-slate-400 hover:bg-slate-50 hover:text-slate-600"
                                    }`}
                            >
                                {tag === "All" ? (t('dashboard.all_tags') || "Todos") : tag}
                            </button>
                        ))}
                    </div>

                    {/* Desktop Table View */}
                    <div className="hidden md:block bg-white rounded-[2.5rem] shadow-xl shadow-slate-200/50 overflow-hidden border border-slate-100">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="bg-slate-50/50 text-slate-400 font-black text-[10px] uppercase tracking-[0.2em]">
                                    <tr>
                                        <th className="px-10 py-6">{t('dashboard.table_quiz')}</th>
                                        <th className="px-10 py-6">{t('dashboard.table_date')}</th>
                                        <th className="px-10 py-6 text-center">{t('dashboard.table_pin')}</th>
                                        <th className="px-10 py-6 text-right whitespace-nowrap">{t('dashboard.table_results')}</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50 font-bold text-slate-600">
                                    {filteredHistory.map((session: FinishedSession) => (
                                        <tr key={session.id} className="hover:bg-blue-50/30 transition-all group">
                                            <td className="px-10 py-8">
                                                <div className="font-black text-slate-900 text-lg group-hover:text-blue-600 transition-colors">
                                                    {session.quiz.title}
                                                </div>
                                            </td>
                                            <td className="px-10 py-8">
                                                <div className="flex items-center gap-2 text-slate-400">
                                                    <Calendar className="w-4 h-4" />
                                                    {new Date(session.finished_at).toLocaleDateString(language === 'es' ? 'es-ES' : 'en-US', {
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
                                            <td className="px-10 py-8 text-right flex items-center justify-end gap-3">
                                                <button
                                                    onClick={() => router.push(`/teacher/reports/${session.id}`)}
                                                    className="inline-flex items-center gap-2 bg-slate-900 text-white px-6 py-2.5 rounded-xl font-black text-sm hover:bg-blue-600 transition-all active:scale-95 shadow-lg shadow-slate-100"
                                                >
                                                    {t('dashboard.report_button')}
                                                    <ChevronRight className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => setConfirmModal({ open: true, quizId: null, historyId: session.id })}
                                                    className="p-3 bg-slate-50 rounded-xl text-slate-400 hover:text-red-500 hover:bg-white transition-all shadow-sm group-hover:shadow-md"
                                                    title={t('common.delete')}
                                                >
                                                    <Trash2 className="w-5 h-5" />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Mobile Card View */}
                    <div className="md:hidden grid grid-cols-1 gap-6">
                        {filteredHistory.map((session: FinishedSession) => (
                            <div key={session.id} className="bg-white rounded-[2rem] p-6 shadow-sm border border-slate-50 space-y-6">
                                <div className="space-y-2">
                                    <div className="flex items-center gap-2 text-[10px] font-black text-slate-300 uppercase tracking-widest">
                                        <Calendar className="w-3 h-3" />
                                        {new Date(session.finished_at).toLocaleDateString(language === 'es' ? 'es-ES' : 'en-US', {
                                            day: "2-digit",
                                            month: "short"
                                        })}
                                    </div>
                                    <h3 className="font-black text-xl text-slate-900 leading-tight">
                                        {session.quiz.title}
                                    </h3>
                                </div>

                                <div className="flex items-center justify-between py-4 border-y border-slate-50">
                                    <span className="text-xs font-bold text-slate-400">PIN</span>
                                    <span className="font-mono font-black text-blue-600 tracking-widest">
                                        {session.pin}
                                    </span>
                                </div>

                                <div className="flex items-center gap-3">
                                    <button
                                        onClick={() => router.push(`/teacher/reports/${session.id}`)}
                                        className="flex-1 bg-slate-900 text-white px-6 py-4 rounded-xl font-black text-sm flex items-center justify-center gap-2 active:scale-95 transition-all"
                                    >
                                        {t('dashboard.report_button')}
                                        <ChevronRight className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={() => setConfirmModal({ open: true, quizId: null, historyId: session.id })}
                                        className="p-4 bg-slate-50 rounded-xl text-slate-400 active:text-red-500 active:bg-white transition-all"
                                    >
                                        <Trash2 className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            );
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row">
            <aside className="w-full md:w-60 bg-white border-b md:border-b-0 md:border-r border-slate-100 p-3 flex flex-row md:flex-col items-center md:items-stretch fixed md:sticky top-0 md:h-screen z-[100] gap-3">
                <div className="flex items-center gap-3 md:mb-6">
                    <div className="w-10 h-10 bg-slate-900 rounded-xl flex items-center justify-center text-white shadow-lg flex-shrink-0">
                        <LayoutDashboard className="w-6 h-6" />
                    </div>
                    <span className="text-xl md:text-2xl font-black text-slate-900 tracking-tighter md:block">QuizzLive</span>
                </div>

                <div className="hidden md:block mb-8">
                    <LanguageSelector />
                </div>

                <nav className="flex md:flex-col flex-1 gap-2 md:gap-2">
                    <button
                        onClick={() => setActiveTab("quizzes")}
                        className={`flex-1 md:flex-none flex items-center justify-center md:justify-start gap-3 px-3 md:px-4 py-2.5 md:py-3.5 rounded-xl md:rounded-2xl font-black transition-all text-xs md:text-base ${activeTab === "quizzes"
                            ? "bg-blue-50 text-blue-600"
                            : "text-slate-400 hover:bg-slate-50 hover:text-slate-600"
                            }`}
                    >
                        <BookOpen className="w-4 md:w-5 h-4 md:h-5" />
                        <span className="hidden sm:inline md:inline">{t('sidebar.my_quizzes')}</span>
                    </button>
                    <button
                        onClick={() => setActiveTab("history")}
                        className={`flex-1 md:flex-none flex items-center justify-center md:justify-start gap-3 px-3 md:px-4 py-2.5 md:py-3.5 rounded-xl md:rounded-2xl font-black transition-all text-xs md:text-base ${activeTab === "history"
                            ? "bg-blue-50 text-blue-600"
                            : "text-slate-400 hover:bg-slate-50 hover:text-slate-600"
                            }`}
                    >
                        <History className="w-4 md:w-5 h-4 md:h-5" />
                        <span className="hidden sm:inline md:inline">{t('sidebar.history')}</span>
                    </button>
                    <button
                        onClick={() => setActiveTab("classes")}
                        className={`flex-1 md:flex-none flex items-center justify-center md:justify-start gap-3 px-3 md:px-4 py-2.5 md:py-3.5 rounded-xl md:rounded-2xl font-black transition-all text-xs md:text-base ${activeTab === "classes"
                            ? "bg-blue-50 text-blue-600"
                            : "text-slate-400 hover:bg-slate-50 hover:text-slate-600"
                            }`}
                    >
                        <Users className="w-4 md:w-5 h-4 md:h-5" />
                        <span className="hidden sm:inline md:inline">{t('sidebar.classes')}</span>
                    </button>
                </nav>

                <div className="flex md:flex-col items-center md:items-stretch gap-2 md:pt-6 md:border-t md:border-slate-50">
                    <div className="hidden md:block px-4">
                        <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest mb-1">{t('sidebar.user')}</p>
                        <p className="text-sm font-bold text-slate-900 truncate">{user?.email}</p>
                    </div>

                    <div className="md:hidden">
                        <LanguageSelector />
                    </div>

                    <button
                        onClick={handleLogout}
                        className="flex items-center justify-center gap-2 px-3 md:px-4 py-2.5 md:py-3 rounded-xl md:rounded-2xl font-bold text-red-400 hover:bg-red-50 hover:text-red-500 transition-all text-xs md:text-base border border-red-50 md:border-0"
                    >
                        <LogOut className="w-4 md:w-5 h-4 md:h-5" />
                        <span className="hidden sm:inline md:inline">{t('sidebar.logout')}</span>
                    </button>
                </div>
            </aside>

            <main className="flex-1 p-2 md:p-6 space-y-4 md:space-y-6 overflow-y-auto">
                <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 mt-16 md:mt-0">
                    <div className="space-y-1">
                        <h1 className="text-3xl md:text-5xl font-black text-slate-900 leading-tight">
                            {activeTab === "quizzes" ? t('sidebar.my_quizzes') : t('dashboard.history_title')}
                        </h1>
                        <p className="text-slate-400 font-medium text-sm md:text-base">
                            {activeTab === "quizzes"
                                ? t('dashboard.quizzes_subtitle')
                                : t('dashboard.history_subtitle')}
                        </p>
                    </div>

                    {activeTab === "quizzes" && (
                        <button
                            onClick={() => router.push("/teacher/editor/new")}
                            className="w-full sm:w-auto bg-blue-600 text-white px-8 py-4 rounded-[1.25rem] md:rounded-[1.5rem] font-black shadow-xl shadow-blue-200 hover:bg-blue-700 transition-all active:scale-95 flex items-center justify-center gap-2"
                        >
                            <Plus className="w-5 md:w-6 h-5 md:h-6" />
                            {t('dashboard.new_quiz')}
                        </button>
                    )}
                </header>

                <StatsHeader stats={stats} t={t} />

                {/* Global Class Filter */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 py-6 border-y border-slate-50">
                    <div className="space-y-1">
                        <h2 className="text-xl font-black text-slate-900 uppercase tracking-widest leading-none">
                            {activeTab === "quizzes" ? t('sidebar.quizzes') : activeTab === "history" ? t('sidebar.history') : t('sidebar.classes')}
                        </h2>
                        <p className="text-slate-400 text-[10px] font-black uppercase tracking-wider">
                            Filtro por Clase
                        </p>
                    </div>

                    {(activeTab === "quizzes" || activeTab === "history") && classes.length > 0 && (
                        <div className="flex items-center gap-3 bg-white p-2 rounded-2xl border border-slate-100 shadow-sm">
                            <div className="flex gap-1 overflow-x-auto no-scrollbar max-w-[300px] md:max-w-md">
                                <button
                                    onClick={() => setSelectedGlobalClassId("All")}
                                    className={`px-4 py-2 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all whitespace-nowrap ${selectedGlobalClassId === "All"
                                        ? "bg-slate-900 text-white shadow-lg"
                                        : "text-slate-400 hover:bg-slate-50 hover:text-slate-600"
                                        }`}
                                >
                                    Todas
                                </button>
                                {classes.map(cls => (
                                    <button
                                        key={cls.id}
                                        onClick={() => setSelectedGlobalClassId(cls.id)}
                                        className={`px-4 py-2 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all whitespace-nowrap ${selectedGlobalClassId === cls.id
                                            ? "bg-blue-600 text-white shadow-lg shadow-blue-100"
                                            : "text-slate-400 hover:bg-slate-50 hover:text-slate-600"
                                            }`}
                                    >
                                        {cls.name}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {history.length > 0 && activeTab === "history" && (
                    <div className="space-y-3">
                        <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest pl-2">
                            {t('dashboard.stats_trend') || 'Tendencia de Participación'}
                        </h3>
                        <PerformanceChart
                            data={filteredHistory.slice(0, 7).reverse().map(s => ({
                                date: new Date(s.finished_at).toLocaleDateString(undefined, { day: '2-digit', month: 'short' }),
                                participation: s._count?.participants || 0
                            }))}
                            label={t('dashboard.participants_label') || 'Participantes'}
                            t={t}
                        />
                    </div>
                )}

                {renderContent()}
            </main>

            <ConfirmModal
                isOpen={confirmModal.open}
                onClose={() => setConfirmModal({ open: false, quizId: null, historyId: null })}
                onConfirm={() => {
                    if (confirmModal.quizId) deleteQuiz(confirmModal.quizId);
                    else if (confirmModal.historyId) deleteHistory(confirmModal.historyId);
                    setConfirmModal({ open: false, quizId: null, historyId: null });
                }}
                title={t('dashboard.delete_confirm')}
                message={t('dashboard.delete_confirm_desc')}
                confirmText={t('common.delete')}
                isDanger
            />
        </div>
    );
}
