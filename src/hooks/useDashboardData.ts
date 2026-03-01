"use client";

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { useQuizStore } from "@/lib/store";
import { useRouter } from "next/navigation";
import { FinishedSession, SupabaseSessionResponse, LiveSession, Folder as FolderType } from "@/lib/schemas";
import { toast } from "sonner";

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

    const fetchHistory = useCallback(async (userId: string) => {
        const { data, error } = await supabase
            .from("sessions")
            .select(`id, pin, created_at, finished_at, quiz:quizzes!inner(title, teacher_id, tags, class_id), participants:participants(count)`)
            .eq("quiz.teacher_id", userId).eq("status", "finished").order("finished_at", { ascending: false });
        if (!error && data) {
            const formatted: FinishedSession[] = (data as unknown as SupabaseSessionResponse[]).map(s => ({
                id: s.id, pin: s.pin, created_at: s.created_at, finished_at: s.finished_at,
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
            .select(`id, pin, status, created_at, quiz:quizzes!inner(title, teacher_id, class_id)`)
            .eq("quiz.teacher_id", userId).in("status", ["waiting", "active"])
            .gte("created_at", yesterday.toISOString()).order("created_at", { ascending: false });
        if (!error) setLiveSessions(data as unknown as LiveSession[] || []);
    }, [setLiveSessions]);

    // --- Init ---
    useEffect(() => {
        const checkUser = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) { router.push("/teacher/login"); return; }
            setUser(user);
            if (!dashboardLoaded || useQuizStore.getState().dashboardUserId !== user.id) {
                await Promise.all([
                    fetchQuizzes(user.id), fetchFolders(user.id),
                    fetchHistory(user.id), fetchLiveSessions(user.id), fetchClasses(user.id)
                ]);
                setDashboardLoaded(true);
                useQuizStore.getState().setDashboardData({ dashboardUserId: user.id });
            }
            setLoading(false);
        };
        checkUser();
    }, [router, fetchQuizzes, fetchHistory, fetchFolders, fetchLiveSessions, fetchClasses, dashboardLoaded, setDashboardLoaded]);

    // --- Mutations ---
    const finishSession = async (sessionId: string) => {
        const { error } = await supabase.from("sessions").update({ status: "finished", finished_at: new Date().toISOString() }).eq("id", sessionId);
        if (!error) {
            setLiveSessions(prev => prev.filter(s => s.id !== sessionId));
            toast.success("Sesión finalizada");
            if (user) fetchHistory(user.id);
        } else { toast.error("Error al finalizar la sesión"); }
    };

    const deleteQuiz = async (id: string) => {
        const { error } = await supabase.from("quizzes").delete().eq("id", id);
        if (!error) { setQuizzes(quizzes.filter(q => q.id !== id)); toast.success("Cuestionario eliminado con éxito"); }
        else { toast.error("No se pudo eliminar el cuestionario"); }
    };

    const deleteHistory = async (id: string) => {
        const { error } = await supabase.from("sessions").delete().eq("id", id);
        if (!error) { setHistory(history.filter(h => h.id !== id)); toast.success("Informe eliminado con éxito"); }
        else { toast.error("No se pudo eliminar el informe"); }
    };

    const createClass = async (name: string) => {
        if (!user || !name.trim()) return;
        const { data, error } = await supabase.from("classes").insert({ name, teacher_id: user.id }).select().single();
        if (!error) { setClasses([{ ...data, students: [] }, ...classes]); toast.success("Clase creada con éxito"); }
        else { toast.error(`Error: ${error.message || "No se pudo crear la clase"}`); }
    };

    const deleteClass = async (id: string) => {
        const { error } = await supabase.from("classes").delete().eq("id", id);
        if (!error) { setClasses(classes.filter(c => c.id !== id)); toast.success("Clase eliminada"); }
        else { toast.error("Error al eliminar la clase"); }
    };

    const createFolder = async (name: string, color: string) => {
        if (!user) return;
        const { data, error } = await supabase.from("folders").insert({ name, color, teacher_id: user.id }).select().single();
        if (!error && data) { setFolders([data as FolderType, ...folders]); toast.success("Carpeta creada"); }
        else { toast.error("Error al crear carpeta"); }
    };

    const deleteFolder = async (id: string) => {
        const { error } = await supabase.from("folders").delete().eq("id", id);
        if (!error) { setFolders(folders.filter(f => f.id !== id)); toast.success("Carpeta eliminada"); }
        else { toast.error("Error al eliminar la carpeta"); }
    };

    const addStudent = async (classId: string, name: string): Promise<DashboardStudent | null> => {
        const { data, error } = await supabase.from("students").insert({ class_id: classId, name: name.trim() }).select().single();
        if (!error) {
            const updatedClasses = classes.map(cls =>
                cls.id === classId ? { ...cls, students: [...(cls.students || []), data] } : cls
            );
            setClasses(updatedClasses);
            toast.success("Alumno añadido");
            return data;
        }
        toast.error("Error al añadir alumno");
        return null;
    };

    const removeStudent = async (studentId: string, classId: string) => {
        const { error } = await supabase.from("students").delete().eq("id", studentId);
        if (!error) {
            setClasses(classes.map(cls =>
                cls.id === classId ? { ...cls, students: cls.students?.filter(s => s.id !== studentId) } : cls
            ));
            toast.success("Alumno eliminado");
        } else { toast.error("Error al eliminar alumno"); }
    };

    const startSession = async (quizId: string, mode: "classic" | "survival" | "teams" | "hangman", config: Record<string, unknown>) => {
        try {
            let pin = "";
            let unique = false;
            let attempts = 0;
            while (!unique && attempts < 3) {
                pin = Math.floor(100000 + Math.random() * 900000).toString();
                const { data: existing } = await supabase.from("sessions").select("id").eq("pin", pin).in("status", ["waiting", "active"]).maybeSingle();
                if (!existing) unique = true;
                attempts++;
            }
            const { data, error } = await supabase.from("sessions").insert({ quiz_id: quizId, pin, status: "waiting", game_mode: mode, config }).select().single();
            if (error) throw error;
            if (data) router.push(`/teacher/session/${data.id}`);
        } catch (error) {
            console.error("Error starting session:", error);
            toast.error("Error al lanzar la sesión");
        }
    };

    return {
        // Data
        user, loading, language, quizzes, classes, history, liveSessions, folders,
        // Mutations
        finishSession, deleteQuiz, deleteHistory, createClass, deleteClass,
        createFolder, deleteFolder, addStudent, removeStudent, startSession,
        // Refresh helpers
        fetchHistory
    };
}
