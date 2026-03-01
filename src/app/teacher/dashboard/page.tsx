"use client";

import { useState, useCallback } from "react";
import { Plus, BookOpen, LogOut, History, LayoutDashboard, ChevronRight, Users, Folder, FolderPlus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { QuizCardSkeleton } from "@/components/Skeleton";
import ConfirmModal from "@/components/ConfirmModal";
import CreateFolderModal from "@/components/CreateFolderModal";
import { useQuizStore } from "@/lib/store";
import { getTranslation } from "@/lib/i18n";
import LanguageSelector from "@/components/LanguageSelector";
import PerformanceChart from "@/components/PerformanceChart";
import { Folder as FolderType, GameModeConfig } from "@/lib/schemas";

import { useDashboardData } from "@/hooks/useDashboardData";
import QuizCard from "@/components/dashboard/QuizCard";
import HistoryTable from "@/components/dashboard/HistoryTable";
import ClassManager from "@/components/dashboard/ClassManager";
import ModeSelectionModal from "@/components/dashboard/ModeSelectionModal";

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
    const { language } = useQuizStore();
    const {
        user, loading, quizzes, classes, history, liveSessions, folders,
        finishSession, deleteQuiz, deleteHistory,
        createClass, deleteClass, createFolder, deleteFolder,
        addStudent, removeStudent, startSession
    } = useDashboardData();

    const [activeTab, setActiveTab] = useState<"quizzes" | "history" | "classes">("quizzes");
    const [selectedQuizTag, setSelectedQuizTag] = useState<string>("All");
    const [selectedFolderId, setSelectedFolderId] = useState<string>("All");
    const [isFolderModalOpen, setIsFolderModalOpen] = useState(false);
    const [selectedHistoryTag, setSelectedHistoryTag] = useState<string>("All");
    const [selectedGlobalClassId, setSelectedGlobalClassId] = useState<string>("All");
    const [confirmModal, setConfirmModal] = useState<{ open: boolean, quizId: string | null, historyId: string | null, folderId: string | null }>({
        open: false, quizId: null, historyId: null, folderId: null
    });
    const [modeModal, setModeModal] = useState<{ open: boolean, quizId: string | null }>({ open: false, quizId: null });

    const router = useRouter();
    const t = useCallback((key: string) => getTranslation(language, key), [language]);

    // --- Computed data ---
    const stats = {
        quizzes: quizzes.length,
        sessions: history.length + liveSessions.length,
        avg: history.length > 0
            ? Math.round(history.reduce((acc, curr) => acc + (curr._count?.participants || 0), 0) / history.length) : 0
    };

    const allTags = ["All", ...Array.from(new Set(quizzes.flatMap(q => q.tags || [])))];
    const filteredQuizzes = quizzes.filter(q => {
        const matchesTag = selectedQuizTag === "All" || q.tags?.includes(selectedQuizTag);
        const matchesClass = selectedGlobalClassId === "All" || q.class_id === selectedGlobalClassId;
        const matchesFolder = selectedFolderId === "All" || q.folder_id === selectedFolderId || (selectedFolderId === "Uncategorized" && !q.folder_id);
        return matchesTag && matchesClass && matchesFolder;
    });

    const allHistoryTags = ["All", ...Array.from(new Set(history.flatMap(h => h.quiz.tags || [])))];
    const filteredHistory = history.filter(h => {
        const matchesTag = selectedHistoryTag === "All" || h.quiz.tags?.includes(selectedHistoryTag);
        const matchesClass = selectedGlobalClassId === "All" || h.quiz.class_id === selectedGlobalClassId;
        return matchesTag && matchesClass;
    });

    const filteredLiveSessions = liveSessions.filter(s => selectedGlobalClassId === "All" || s.quiz.class_id === selectedGlobalClassId);

    const handleLogout = async () => {
        const { supabase } = await import("@/lib/supabase");
        await supabase.auth.signOut();
        useQuizStore.getState().resetStore();
        router.push("/");
    };

    // --- Render content by tab ---
    const renderContent = () => {
        if (loading) {
            return (
                <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-8">
                    {[1, 2, 3, 4, 5, 6].map((i) => <QuizCardSkeleton key={i} />)}
                </div>
            );
        }

        if (activeTab === "classes") {
            return (
                <ClassManager
                    classes={classes}
                    t={t}
                    onCreateClass={createClass}
                    onDeleteClass={deleteClass}
                    onAddStudent={addStudent}
                    onRemoveStudent={removeStudent}
                />
            );
        }

        if (activeTab === "history") {
            return (
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
                    <HistoryTable
                        history={filteredHistory}
                        language={language}
                        t={t}
                        onDelete={(id) => setConfirmModal({ open: true, quizId: null, historyId: id, folderId: null })}
                    />
                </div>
            );
        }

        // Quizzes tab
        return (
            <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
                {/* Folders */}
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <h2 className="text-xl font-black text-slate-900 uppercase tracking-widest">{t('dashboard.folders') || "Mis Carpetas"}</h2>
                        <button onClick={() => setIsFolderModalOpen(true)} className="flex items-center gap-2 text-sm font-black text-blue-600 hover:text-blue-700 bg-blue-50 px-4 py-2 rounded-xl transition-colors">
                            <FolderPlus className="w-4 h-4" />{t('dashboard.new_folder') || "Nueva Carpeta"}
                        </button>
                    </div>
                    <div className="flex bg-white p-2 rounded-2xl border border-slate-100 overflow-x-auto no-scrollbar gap-3 max-w-full">
                        <button onClick={() => setSelectedFolderId("All")} className={`flex items-center gap-2 px-6 py-4 rounded-xl font-black whitespace-nowrap transition-all border-2 ${selectedFolderId === "All" ? "bg-slate-900 border-slate-900 text-white shadow-lg" : "bg-white border-slate-100 text-slate-400 hover:border-slate-300 hover:text-slate-600"}`}>
                            <LayoutDashboard className="w-5 h-5" />{t('dashboard.all_folders') || "Todos"}
                        </button>
                        <button onClick={() => setSelectedFolderId("Uncategorized")} className={`flex items-center gap-2 px-6 py-4 rounded-xl font-black whitespace-nowrap transition-all border-2 ${selectedFolderId === "Uncategorized" ? "bg-slate-900 border-slate-900 text-white shadow-lg" : "bg-white border-slate-100 text-slate-400 hover:border-slate-300 hover:text-slate-600"}`}>
                            <BookOpen className="w-5 h-5" />{t('dashboard.uncategorized') || "Sin Carpeta"}
                        </button>
                        {folders.map((folder: FolderType) => (
                            <div key={folder.id} className="relative group/folder shrink-0">
                                <button
                                    onClick={() => setSelectedFolderId(folder.id!)}
                                    className={`flex items-center gap-2 px-6 py-4 rounded-xl font-black whitespace-nowrap transition-all border-2 ${selectedFolderId === folder.id ? "text-white shadow-lg ring-4 ring-offset-2 pr-12" : "bg-white text-slate-600 hover:bg-slate-50 pr-12"}`}
                                    style={{ backgroundColor: selectedFolderId === folder.id ? folder.color : "white", borderColor: selectedFolderId === folder.id ? folder.color : `${folder.color}40`, "--tw-ring-color": `${folder.color}50` } as React.CSSProperties}
                                >
                                    <Folder className="w-5 h-5" style={{ color: selectedFolderId === folder.id ? "white" : folder.color }} />{folder.name}
                                </button>
                                <button
                                    onClick={(e) => { e.stopPropagation(); setConfirmModal({ open: true, quizId: null, historyId: null, folderId: folder.id! }); }}
                                    className={`absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-lg transition-all ${selectedFolderId === folder.id ? "text-white/60 hover:text-white hover:bg-white/20" : "text-slate-300 hover:text-red-500 hover:bg-red-50"}`}
                                    title={t('common.delete')}
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Tag filter */}
                <div className="flex bg-white p-1.5 rounded-2xl border border-slate-100 overflow-x-auto no-scrollbar gap-2 max-w-full">
                    {allTags.map(tag => (
                        <button key={tag} onClick={() => setSelectedQuizTag(tag)} className={`px-5 py-2.5 rounded-xl font-black text-sm whitespace-nowrap transition-all ${selectedQuizTag === tag ? "bg-slate-900 text-white shadow-lg shadow-slate-200" : "text-slate-400 hover:bg-slate-50 hover:text-slate-600"}`}>
                            {tag === "All" ? (t('dashboard.all_tags') || "Todos") : tag}
                        </button>
                    ))}
                </div>

                {/* Live Sessions */}
                {filteredLiveSessions.length > 0 && (
                    <div className="space-y-6">
                        <div className="flex items-center gap-3">
                            <span className="relative flex h-3 w-3"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" /><span className="relative inline-flex rounded-full h-3 w-3 bg-red-500" /></span>
                            <h2 className="text-xl font-black text-slate-900 uppercase tracking-widest">{t('dashboard.live_sessions') || "Sesiones en Vivo"}</h2>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {filteredLiveSessions.map((session) => (
                                <div key={session.id} onClick={() => router.push(`/teacher/session/${session.id}`)} className="bg-slate-900 text-white p-6 rounded-[2rem] border-b-4 border-blue-600 hover:scale-[1.02] transition-all cursor-pointer group flex flex-col justify-between h-48">
                                    <div className="flex justify-between items-start">
                                        <div className="space-y-1">
                                            <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest">{session.status === 'active' ? 'En Juego' : 'Esperando'}</p>
                                            <h3 className="text-xl font-black truncate max-w-[180px]">{session.quiz.title}</h3>
                                        </div>
                                        <div className="bg-white/10 px-3 py-1.5 rounded-xl font-mono font-black text-lg tracking-wider">{session.pin}</div>
                                    </div>
                                    <div className="flex items-center justify-between pt-4 border-t border-white/5">
                                        <span className="text-xs font-bold text-slate-400">{new Date(session.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                        <div className="flex gap-2">
                                            <button onClick={(e) => { e.stopPropagation(); finishSession(session.id); }} className="p-2 bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white rounded-xl transition-all" title="Finalizar sesión">
                                                <LogOut className="w-4 h-4" />
                                            </button>
                                            <button className="bg-blue-600 p-2 rounded-xl group-hover:px-4 transition-all flex items-center gap-2">
                                                <ChevronRight className="w-5 h-5" /><span className="hidden group-hover:inline text-[10px] font-black uppercase">Reanudar</span>
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Quiz Cards */}
                <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
                    {filteredQuizzes.length === 0 ? (
                        <div className="col-span-full bg-white rounded-[3rem] border-4 border-dashed border-slate-100 p-20 text-center space-y-6">
                            <div className="bg-blue-50 w-24 h-24 rounded-[2rem] flex items-center justify-center mx-auto text-blue-500"><BookOpen className="w-12 h-12" /></div>
                            <div className="space-y-2">
                                <h3 className="text-2xl font-black text-slate-900">{t('dashboard.empty_title') || "No hay cuestionarios aquí"}</h3>
                                <p className="text-slate-400 font-medium max-w-sm mx-auto text-lg leading-relaxed">{t('dashboard.empty_subtitle')}</p>
                            </div>
                            <button onClick={() => router.push("/teacher/editor/new")} className="inline-flex items-center gap-2 text-blue-600 font-black text-lg hover:gap-3 transition-all">
                                {t('dashboard.empty_button')} <ChevronRight className="w-5 h-5" />
                            </button>
                        </div>
                    ) : (
                        filteredQuizzes.map((quiz) => (
                            <QuizCard
                                key={quiz.id}
                                quiz={quiz}
                                classes={classes}
                                t={t}
                                onPlay={(id) => setModeModal({ open: true, quizId: id })}
                                onDelete={(id) => setConfirmModal({ open: true, quizId: id, historyId: null, folderId: null })}
                            />
                        ))
                    )}
                </div>
            </div>
        );
    };

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row">
            {/* Sidebar */}
            <aside className="w-full md:w-60 bg-white border-b md:border-b-0 md:border-r border-slate-100 p-3 flex flex-row md:flex-col items-center md:items-stretch fixed md:sticky top-0 md:h-screen z-[100] gap-3">
                <div className="flex items-center gap-3 md:mb-6">
                    <div className="w-10 h-10 bg-slate-900 rounded-xl flex items-center justify-center text-white shadow-lg flex-shrink-0"><LayoutDashboard className="w-6 h-6" /></div>
                    <span className="text-xl md:text-2xl font-black text-slate-900 tracking-tighter md:block">QuizzLive</span>
                </div>
                <div className="hidden md:block mb-8"><LanguageSelector /></div>
                <nav className="flex md:flex-col flex-1 gap-2 md:gap-2">
                    {([
                        { id: "quizzes", icon: BookOpen, label: t('sidebar.my_quizzes') },
                        { id: "history", icon: History, label: t('sidebar.history') },
                        { id: "classes", icon: Users, label: t('sidebar.classes') }
                    ] as const).map(tab => (
                        <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`flex-1 md:flex-none flex items-center justify-center md:justify-start gap-3 px-3 md:px-4 py-2.5 md:py-3.5 rounded-xl md:rounded-2xl font-black transition-all text-xs md:text-base ${activeTab === tab.id ? "bg-blue-50 text-blue-600" : "text-slate-400 hover:bg-slate-50 hover:text-slate-600"}`}>
                            <tab.icon className="w-4 md:w-5 h-4 md:h-5" /><span className="hidden sm:inline md:inline">{tab.label}</span>
                        </button>
                    ))}
                </nav>
                <div className="flex md:flex-col items-center md:items-stretch gap-2 md:pt-6 md:border-t md:border-slate-50">
                    <div className="hidden md:block px-4">
                        <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest mb-1">{t('sidebar.user')}</p>
                        <p className="text-sm font-bold text-slate-900 truncate">{user?.email}</p>
                    </div>
                    <div className="md:hidden"><LanguageSelector /></div>
                    <button onClick={handleLogout} className="flex items-center justify-center gap-2 px-3 md:px-4 py-2.5 md:py-3 rounded-xl md:rounded-2xl font-bold text-red-400 hover:bg-red-50 hover:text-red-500 transition-all text-xs md:text-base border border-red-50 md:border-0">
                        <LogOut className="w-4 md:w-5 h-4 md:h-5" /><span className="hidden sm:inline md:inline">{t('sidebar.logout')}</span>
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 p-2 md:p-6 space-y-4 md:space-y-6 overflow-y-auto">
                <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 mt-16 md:mt-0">
                    <div className="space-y-1">
                        <h1 className="text-3xl md:text-5xl font-black text-slate-900 leading-tight">
                            {activeTab === "quizzes" ? t('sidebar.my_quizzes') : activeTab === "history" ? t('dashboard.history_title') : t('sidebar.classes')}
                        </h1>
                        <p className="text-slate-400 font-medium text-sm md:text-base">
                            {activeTab === "quizzes" ? t('dashboard.quizzes_subtitle') : activeTab === "history" ? t('dashboard.history_subtitle') : "Gestiona tus clases y alumnos."}
                        </p>
                    </div>
                    {activeTab === "quizzes" && (
                        <button onClick={() => router.push("/teacher/editor/new")} className="w-full sm:w-auto bg-blue-600 text-white px-8 py-4 rounded-[1.25rem] md:rounded-[1.5rem] font-black shadow-xl shadow-blue-200 hover:bg-blue-700 transition-all active:scale-95 flex items-center justify-center gap-2">
                            <Plus className="w-5 md:w-6 h-5 md:h-6" />{t('dashboard.new_quiz')}
                        </button>
                    )}
                </header>

                <StatsHeader stats={stats} t={t} />

                {/* Class filter */}
                {(activeTab === "quizzes" || activeTab === "history") && classes.length > 0 && (
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 py-6 border-y border-slate-50">
                        <div className="space-y-1">
                            <h2 className="text-xl font-black text-slate-900 uppercase tracking-widest leading-none">
                                {activeTab === "quizzes" ? t('sidebar.quizzes') : t('sidebar.history')}
                            </h2>
                            <p className="text-slate-400 text-[10px] font-black uppercase tracking-wider">Filtro por Clase</p>
                        </div>
                        <div className="flex items-center gap-3 bg-white p-2 rounded-2xl border border-slate-100 shadow-sm">
                            <div className="flex gap-1 overflow-x-auto no-scrollbar max-w-[300px] md:max-w-md">
                                <button onClick={() => setSelectedGlobalClassId("All")} className={`px-4 py-2 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all whitespace-nowrap ${selectedGlobalClassId === "All" ? "bg-slate-900 text-white shadow-lg" : "text-slate-400 hover:bg-slate-50 hover:text-slate-600"}`}>Todas</button>
                                {classes.map(cls => (
                                    <button key={cls.id} onClick={() => setSelectedGlobalClassId(cls.id)} className={`px-4 py-2 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all whitespace-nowrap ${selectedGlobalClassId === cls.id ? "bg-blue-600 text-white shadow-lg shadow-blue-100" : "text-slate-400 hover:bg-slate-50 hover:text-slate-600"}`}>{cls.name}</button>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {history.length > 0 && activeTab === "history" && (
                    <div className="space-y-3">
                        <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest pl-2">{t('dashboard.stats_trend') || 'Tendencia de Participación'}</h3>
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

            {/* Modals */}
            <ConfirmModal
                isOpen={confirmModal.open}
                onClose={() => setConfirmModal({ open: false, quizId: null, historyId: null, folderId: null })}
                onConfirm={() => {
                    if (confirmModal.quizId) deleteQuiz(confirmModal.quizId);
                    else if (confirmModal.historyId) deleteHistory(confirmModal.historyId);
                    else if (confirmModal.folderId) { deleteFolder(confirmModal.folderId); if (selectedFolderId === confirmModal.folderId) setSelectedFolderId("All"); }
                    setConfirmModal({ open: false, quizId: null, historyId: null, folderId: null });
                }}
                title={confirmModal.folderId ? t('dashboard.delete_folder_confirm') : t('dashboard.delete_confirm')}
                message={confirmModal.folderId ? t('dashboard.delete_folder_desc') : t('dashboard.delete_confirm_desc')}
                confirmText={t('common.delete')}
                isDanger
            />
            {isFolderModalOpen && (
                <CreateFolderModal
                    isOpen={isFolderModalOpen}
                    onClose={() => setIsFolderModalOpen(false)}
                    onSubmit={createFolder}
                    t={t}
                />
            )}
            <ModeSelectionModal
                isOpen={modeModal.open}
                onClose={() => setModeModal({ open: false, quizId: null })}
                onStart={(mode, config) => {
                    if (modeModal.quizId) startSession(modeModal.quizId, mode, config as unknown as GameModeConfig);
                    setModeModal({ open: false, quizId: null });
                }}
            />
        </div>
    );
}
