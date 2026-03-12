"use client";

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { useQuizStore } from "@/lib/store";
import { useRouter } from "next/navigation";
import { FinishedSession, SupabaseSessionResponse, LiveSession, Folder as FolderType } from "@/lib/schemas";
import { toast } from "sonner";
import { deleteQuiz, createFolder, deleteFolder, duplicateQuiz, exportQuizAsJson } from "@/actions/quiz";
import { createClass, deleteClass, addStudentToClass, removeStudentFromClass, addStudentsBulk } from "@/actions/classes";
import { startSession, finishSession, deleteHistory, deleteMultipleHistory } from "@/actions/session";

export interface Quiz {
    id: string;
    title: string;
    tags: string[];
    class_id?: string | null;
    folder_id?: string | null;
    questions: { id: string }[];
}

export interface DashboardClass {
    id: string;
    name: string;
    description: string;
    created_at: string;
    students?: DashboardStudent[];
}

export type DashboardStudent = {
    id?: string;
    class_id: string;
    name: string;
    email?: string | null;
    created_at?: string;
};

export interface DashboardUser {
    id: string;
    email?: string;
    institution_name?: string | null;
    logo_url?: string | null;
    brand_color?: string | null;
    signature_url?: string | null;
}

export function useDashboardData() {
    const {
        language,
        dashboardLoaded,
        dashboardQuizzes,
        dashboardClasses,
        dashboardHistory,
        dashboardLiveSessions,
        dashboardFolders,
        setDashboardLoaded,
        setDashboardData
    } = useQuizStore();

    const quizzes = dashboardQuizzes as Quiz[];
    const classes = dashboardClasses as DashboardClass[];
    const history = dashboardHistory as FinishedSession[];
    const liveSessions = dashboardLiveSessions as LiveSession[];
    const folders = dashboardFolders as FolderType[];

    const [loading, setLoading] = useState(true);
    const [loadingMoreHistory, setLoadingMoreHistory] = useState(false);
    const [historyPage, setHistoryPage] = useState(0);
    const [hasMoreHistory, setHasMoreHistory] = useState(true);
    const [user, setUser] = useState<DashboardUser | null>(null);

    const router = useRouter();

    // --- Derived setters ---
    const setQuizzes = useCallback((v: Quiz[]) => setDashboardData({ dashboardQuizzes: v }), [setDashboardData]);
    const setClasses = useCallback((v: DashboardClass[]) => setDashboardData({ dashboardClasses: v }), [setDashboardData]);
    const setHistory = useCallback((v: FinishedSession[]) => setDashboardData({ dashboardHistory: v }), [setDashboardData]);
    const setFolders = useCallback((v: FolderType[]) => setDashboardData({ dashboardFolders: v }), [setDashboardData]);
    const setLiveSessions = useCallback((v: LiveSession[] | ((prev: LiveSession[]) => LiveSession[])) => {
        if (typeof v === 'function') {
            setDashboardData({ dashboardLiveSessions: v(liveSessions) });
        } else {
            setDashboardData({ dashboardLiveSessions: v });
        }
    }, [liveSessions, setDashboardData]);

    // --- Fetch functions ---
    const fetchClasses = useCallback(async (userId: string) => {
        const { data, error } = await supabase
            .from("classes").select("*, students(*)").eq("teacher_id", userId).order("created_at", { ascending: false });
        if (!error) setClasses(data || []);
    }, [setClasses]);

    const fetchFolders = useCallback(async (userId: string) => {
        const { data, error } = await supabase
            .from("folders").select("*").eq("teacher_id", userId).order("created_at", { ascending: false });
        if (!error) setFolders(data || []);
    }, [setFolders]);

    const fetchQuizzes = useCallback(async (userId: string) => {
        const { data, error } = await supabase
            .from("quizzes").select("*, questions(id)").eq("teacher_id", userId).order("created_at", { ascending: false });
        if (!error) setQuizzes(data || []);
    }, [setQuizzes]);

    const fetchHistory = useCallback(async (userId: string, page = 0) => {
        const pageSize = 10;
        const from = page * pageSize;
        const to = from + pageSize - 1;

        if (page === 0) setLoading(true);
        else setLoadingMoreHistory(true);

        const { data, error } = await supabase
            .from("sessions")
            .select(`id, pin, created_at, finished_at, quiz:quizzes!inner(title, teacher_id, tags, class_id), participants:participants(count)`)
            .eq("quiz.teacher_id", userId).eq("status", "finished")
            .order("finished_at", { ascending: false })
            .range(from, to);

        if (!error && data) {
            const formatted: FinishedSession[] = (data as unknown as SupabaseSessionResponse[]).map(s => ({
                id: s.id, pin: s.pin, created_at: s.created_at, finished_at: s.finished_at,
                quiz: { title: s.quiz.title, tags: s.quiz.tags, class_id: s.quiz.class_id },
                _count: { participants: s.participants?.[0]?.count || 0 }
            }));
            
            if (page === 0) {
                setHistory(formatted);
            } else {
                setHistory([...history, ...formatted]);
            }
            
            setHasMoreHistory(formatted.length === pageSize);
            setHistoryPage(page);
        }
        
        setLoading(false);
        setLoadingMoreHistory(false);
    }, [history, setHistory]);

    const loadMoreHistory = useCallback(() => {
        if (user && hasMoreHistory && !loadingMoreHistory) {
            fetchHistory(user.id, historyPage + 1);
        }
    }, [user, hasMoreHistory, loadingMoreHistory, historyPage, fetchHistory]);

    const fetchLiveSessions = useCallback(async (userId: string) => {
        const yesterday = new Date();
        yesterday.setHours(yesterday.getHours() - 24);
        const { data, error } = await supabase
            .from("sessions")
            .select(`id, pin, status, created_at, quiz:quizzes!inner(title, teacher_id, class_id)`)
            .eq("quiz.teacher_id", userId).in("status", ["waiting", "active"])
            .gte("created_at", yesterday.toISOString()).order("created_at", { ascending: false });
        if (!error) setLiveSessions(data as unknown as LiveSession[] || []);
    }, [setLiveSessions]);

    // --- Init ---
    useEffect(() => {
        const checkUser = async () => {
            const { data: { user: authUser } } = await supabase.auth.getUser();
            if (!authUser) { router.push("/teacher/login"); return; }
            
            // Fetch profile data (branding)
            const { data: profile } = await supabase
                .from("teachers")
                .select("*")
                .eq("id", authUser.id)
                .single();

            setUser({
                ...authUser,
                ...profile
            });
            if (!dashboardLoaded || (authUser && useQuizStore.getState().dashboardUserId !== authUser.id)) {
                await Promise.all([
                    fetchQuizzes(authUser.id), fetchFolders(authUser.id),
                    fetchHistory(authUser.id), fetchLiveSessions(authUser.id), fetchClasses(authUser.id)
                ]);
                setDashboardLoaded(true);
                useQuizStore.getState().setDashboardData({ dashboardUserId: authUser.id });
            }
            setLoading(false);
        };
        checkUser();
    }, [router, fetchQuizzes, fetchHistory, fetchFolders, fetchLiveSessions, fetchClasses, dashboardLoaded, setDashboardLoaded]);

    // --- Mutations ---
    const finishSessionHandler = async (sessionId: string) => {
        try {
            await finishSession(sessionId);
            setLiveSessions(prev => prev.filter(s => s.id !== sessionId));
            toast.success("Sesión finalizada");
            if (user) fetchHistory(user.id);
        } catch { toast.error("Error al finalizar la sesión"); }
    };

    const deleteQuizHandler = async (id: string) => {
        try {
            await deleteQuiz(id);
            setQuizzes(quizzes.filter(q => q.id !== id));
            toast.success("Cuestionario eliminado con éxito");
        } catch { toast.error("No se pudo eliminar el cuestionario"); }
    };

    const deleteHistoryHandler = async (id: string) => {
        try {
            await deleteHistory(id);
            setHistory(history.filter(h => h.id !== id));
            toast.success("Informe eliminado con éxito");
        } catch { toast.error("No se pudo eliminar el informe"); }
    };

    const deleteMultipleHistoryHandler = async (ids: string[]) => {
        try {
            await deleteMultipleHistory(ids);
            setHistory(history.filter(h => !ids.includes(h.id)));
            toast.success(`${ids.length} informes eliminados con éxito`);
        } catch { toast.error("No se pudieron eliminar los informes"); }
    };

    const createClassHandler = async (name: string) => {
        if (!user || !name.trim()) return;
        try {
            const data = await createClass(name);
            setClasses([{ ...data, students: [] }, ...classes]);
            toast.success("Clase creada con éxito");
        } catch (error) { const err = error as Error; toast.error(`Error: ${err.message || "No se pudo crear la clase"}`); }
    };

    const deleteClassHandler = async (id: string) => {
        try {
            await deleteClass(id);
            setClasses(classes.filter(c => c.id !== id));
            toast.success("Clase eliminada");
        } catch { toast.error("Error al eliminar la clase"); }
    };

    const duplicateQuizHandler = async (id: string) => {
        try {
            const result = await duplicateQuiz(id);
            if (result.success) {
                // We could refetch or just wait for revalidatePath if it's a server action
                // But since we are in a client hook managing state, we might need a refresh
                // For now, let's assume the user will see it on manual refresh or we can add logic to fetch again
                toast.success("Cuestionario duplicado");
                // Trigger a refresh of quizzes
                const { data } = await supabase.from("quizzes").select("id, title, tags, class_id, folder_id, questions(id)").eq("teacher_id", user?.id).order('created_at', { ascending: false });
                if (data) setQuizzes(data as Quiz[]);
            }
        } catch { toast.error("Error al duplicar el cuestionario"); }
    };

    const exportQuizHandler = async (id: string) => {
        try {
            const data = await exportQuizAsJson(id);
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `quiz-${id}.json`;
            a.click();
            URL.revokeObjectURL(url);
            toast.success("Exportación iniciada");
        } catch { toast.error("Error al exportar el cuestionario"); }
    };

    const createFolderHandler = async (name: string, color: string) => {
        if (!user) return;
        try {
            const data = await createFolder(name, color);
            setFolders([data as FolderType, ...folders]);
            toast.success("Carpeta creada");
        } catch { toast.error("Error al crear carpeta"); }
    };

    const deleteFolderHandler = async (id: string) => {
        try {
            await deleteFolder(id);
            setFolders(folders.filter(f => f.id !== id));
            toast.success("Carpeta eliminada");
        } catch { toast.error("Error al eliminar la carpeta"); }
    };

    const addStudentHandler = async (classId: string, name: string): Promise<DashboardStudent | null> => {
        try {
            const data = await addStudentToClass(classId, name);
            setDashboardData({
                dashboardClasses: useQuizStore.getState().dashboardClasses.map((cls: DashboardClass) =>
                    cls.id === classId ? { ...cls, students: [...(cls.students || []), data] } : cls
                )
            });
            toast.success("Alumno añadido");
            return data;
        } catch {
            toast.error("Error al añadir alumno");
            return null;
        }
    };

    const addStudentsBulkHandler = async (classId: string, names: string[]): Promise<DashboardStudent[] | null> => {
        try {
            const data = await addStudentsBulk(classId, names);
            setDashboardData({
                dashboardClasses: useQuizStore.getState().dashboardClasses.map((cls: DashboardClass) =>
                    cls.id === classId ? { ...cls, students: [...(cls.students || []), ...data] } : cls
                )
            });
            toast.success(`${data.length} alumnos añadidos`);
            return data;
        } catch {
            toast.error("Error al importar alumnos");
            return null;
        }
    };

    const removeStudentHandler = async (studentId: string, classId: string) => {
        try {
            await removeStudentFromClass(studentId);
            setClasses(classes.map(cls =>
                cls.id === classId ? { ...cls, students: cls.students?.filter(s => s.id !== studentId) } : cls
            ));
            toast.success("Alumno eliminado");
        } catch { toast.error("Error al eliminar alumno"); }
    };

    const startSessionHandler = async (quizId: string, mode: "classic" | "survival" | "teams" | "hangman" | "roulette", config: Record<string, unknown>) => {
        try {
            const data = await startSession(quizId, mode, config);
            if (data) router.push(`/teacher/session/${data.id}`);
        } catch (error) {
            console.error("Error starting session:", error);
            toast.error("Error al lanzar la sesión");
        }
    };

    const updateBrandingHandler = async (branding: Partial<DashboardUser>) => {
        if (!user) return;
        try {
            const { error } = await supabase
                .from("teachers")
                .update(branding)
                .eq("id", user.id);
            
            if (error) throw error;
            
            setUser(prev => prev ? { ...prev, ...branding } : null);
            toast.success("Branding actualizado");
        } catch {
            toast.error("Error al actualizar branding");
        }
    };

    return {
        // Data
        user, loading, language, quizzes, classes, history, liveSessions, folders,
        // Mutations
        finishSession: finishSessionHandler, deleteQuiz: deleteQuizHandler, deleteHistory: deleteHistoryHandler,
        deleteMultipleHistory: deleteMultipleHistoryHandler,
        createClass: createClassHandler, deleteClass: deleteClassHandler, createFolder: createFolderHandler,
        deleteFolder: deleteFolderHandler, addStudent: addStudentHandler, addStudentsBulk: addStudentsBulkHandler, removeStudent: removeStudentHandler,
        startSession: startSessionHandler,
        updateBranding: updateBrandingHandler,
        duplicateQuiz: duplicateQuizHandler,
        exportQuiz: exportQuizHandler,

        // Refresh helpers
        fetchHistory,
        loadMoreHistory,
        loadingMoreHistory,
        hasMoreHistory
    };
}
