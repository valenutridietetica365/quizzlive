"use client";

import { useState } from "react";
import { Plus, Trash2, Users, ChevronRight, GraduationCap, Target, Trophy, TrendingUp } from "lucide-react";
import { DashboardClass, DashboardStudent } from "@/hooks/useDashboardData";
import PerformanceChart from "@/components/PerformanceChart";
import { supabase } from "@/lib/supabase";
import { useEffect, useMemo } from "react";

interface ClassManagerProps {
    classes: DashboardClass[];
    t: (key: string) => string;
    onCreateClass: (name: string) => void;
    onDeleteClass: (id: string) => void;
    onAddStudent: (classId: string, name: string) => Promise<unknown>;
    onRemoveStudent: (studentId: string, classId: string) => void;
}

export default function ClassManager({ classes, t, onCreateClass, onDeleteClass, onAddStudent, onRemoveStudent }: ClassManagerProps) {
    const [newClassName, setNewClassName] = useState("");
    const [selectedClass, setSelectedClass] = useState<DashboardClass | null>(null);
    const [newStudentName, setNewStudentName] = useState("");
    const [selectedStudent, setSelectedStudent] = useState<DashboardStudent | null>(null);
    const [viewMode, setViewMode] = useState<"students" | "evolution">("students");
    const [studentStats, setStudentStats] = useState<{
        sessions: number;
        avgSuccess: number;
        perfectQuizzes: number;
        history: { date: string; participation: number }[];
        mastery: Record<string, { total: number; correct: number }>;
    } | null>(null);
    const [loadingStats, setLoadingStats] = useState(false);

    const fetchStudentStats = async (studentId: string) => {
        setLoadingStats(true);
        try {
            const { data: participations } = await supabase
                .from('participants')
                .select(`
                    id,
                    sessions!inner (
                        finished_at,
                        quizzes!inner (
                            tags
                        )
                    ),
                    answers (
                        is_correct
                    )
                `)
                .eq('student_id', studentId)
                .order('sessions(finished_at)', { ascending: true });

            if (participations) {
                const history = (participations as any[]).map(p => ({
                    date: new Date(p.sessions.finished_at).toLocaleDateString(undefined, { day: '2-digit', month: 'short' }),
                    participation: Math.round((p.answers.filter((a: any) => a.is_correct).length / (p.answers.length || 1)) * 100)
                }));

                const mastery: Record<string, { total: number; correct: number }> = {};
                let totalCorrect = 0;
                let totalQuestions = 0;
                let perfectCount = 0;

                (participations as any[]).forEach(p => {
                    const correctCount = p.answers.filter((a: any) => a.is_correct).length;
                    const qCount = p.answers.length;
                    if (correctCount === qCount && qCount > 0) perfectCount++;

                    totalCorrect += correctCount;
                    totalQuestions += qCount;

                    const tags = p.sessions.quizzes.tags || [];
                    tags.forEach((tag: string) => {
                        if (!mastery[tag]) mastery[tag] = { total: 0, correct: 0 };
                        mastery[tag].total += qCount;
                        mastery[tag].correct += correctCount;
                    });
                });

                setStudentStats({
                    sessions: participations.length,
                    avgSuccess: totalQuestions > 0 ? Math.round((totalCorrect / totalQuestions) * 100) : 0,
                    perfectQuizzes: perfectCount,
                    history,
                    mastery
                });
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoadingStats(false);
        }
    };

    const handleSelectStudent = (student: DashboardStudent) => {
        setSelectedStudent(student);
        if (student.id) fetchStudentStats(student.id);
    };

    const handleCreateClass = () => {
        if (!newClassName.trim()) return;
        onCreateClass(newClassName.trim());
        setNewClassName("");
    };

    const handleAddStudent = async () => {
        if (!selectedClass || !newStudentName.trim()) return;
        await onAddStudent(selectedClass.id, newStudentName.trim());
        // Refresh the selected class view from the classes prop
        setNewStudentName("");
    };

    // Keep selectedClass in sync with the classes prop
    const currentClass = selectedClass ? classes.find(c => c.id === selectedClass.id) || null : null;

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
                            onKeyDown={(e) => e.key === 'Enter' && handleCreateClass()}
                        />
                        <button
                            onClick={handleCreateClass}
                            className="bg-slate-900 text-white p-3 rounded-xl hover:bg-blue-600 transition-all active:scale-95"
                        >
                            <Plus className="w-6 h-6" />
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {classes.map((cls) => (
                        <div key={cls.id} className="bg-slate-50 p-6 rounded-[2rem] border border-slate-100 group relative hover:bg-white hover:shadow-xl hover:shadow-slate-200/50 transition-all cursor-pointer" onClick={() => setSelectedClass(cls)}>
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
                                onClick={(e) => { e.stopPropagation(); onDeleteClass(cls.id); }}
                                className="absolute top-6 right-6 p-2 text-slate-300 hover:text-red-500 transition-colors"
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                        </div>
                    ))}
                </div>

                {currentClass && (
                    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                        <div className="bg-white w-full max-w-2xl rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
                            <div className="p-8 md:p-12 space-y-8">
                                <div className="flex justify-between items-start">
                                    <div className="space-y-2">
                                        <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tight">{currentClass.name}</h2>
                                        <p className="text-slate-400 font-bold text-xs uppercase tracking-widest">Gestión de Alumnos</p>
                                    </div>
                                    <div className="flex bg-slate-100 p-1 rounded-xl">
                                        <button onClick={() => setViewMode("students")} className={`px-4 py-2 rounded-lg text-xs font-black uppercase transition-all ${viewMode === 'students' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>Alumnos</button>
                                        <button onClick={() => setViewMode("evolution")} className={`px-4 py-2 rounded-lg text-xs font-black uppercase transition-all ${viewMode === 'evolution' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>Evolución</button>
                                    </div>
                                    <button onClick={() => { setSelectedClass(null); setViewMode("students"); }} className="p-4 bg-slate-50 rounded-2xl text-slate-400 hover:text-slate-900 transition-all">
                                        <ChevronRight className="w-6 h-6 rotate-180" />
                                    </button>
                                </div>

                                {viewMode === 'students' ? (
                                    <>
                                        <div className="flex gap-2">
                                            <input
                                                type="text"
                                                value={newStudentName}
                                                onChange={(e) => setNewStudentName(e.target.value)}
                                                placeholder="Nombre completo del alumno"
                                                className="flex-1 bg-slate-50 border-none focus:ring-2 focus:ring-blue-500 rounded-2xl px-6 py-4 font-bold"
                                                onKeyDown={(e) => e.key === 'Enter' && handleAddStudent()}
                                            />
                                            <button
                                                onClick={handleAddStudent}
                                                className="bg-blue-600 text-white px-8 rounded-2xl font-black hover:bg-blue-700 transition-all active:scale-95 shadow-lg shadow-blue-100"
                                            >
                                                Añadir
                                            </button>
                                        </div>

                                        <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 no-scrollbar">
                                            {currentClass.students?.length === 0 ? (
                                                <div className="text-center py-12 bg-slate-50 rounded-[2rem] border-2 border-dashed border-slate-200">
                                                    <p className="text-slate-400 font-bold uppercase text-xs tracking-widest">No hay alumnos en esta clase</p>
                                                </div>
                                            ) : (
                                                currentClass.students?.map((student) => (
                                                    <div key={student.id} className="flex items-center justify-between p-6 bg-slate-50 rounded-2xl border border-slate-100 group hover:bg-white hover:shadow-lg transition-all cursor-pointer" onClick={() => handleSelectStudent(student)}>
                                                        <div className="flex items-center gap-4">
                                                            <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-slate-400 font-black">
                                                                {student.name.charAt(0).toUpperCase()}
                                                            </div>
                                                            <span className="font-black text-slate-900">{student.name}</span>
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            <button onClick={(e) => { e.stopPropagation(); handleSelectStudent(student); }} className="p-2 text-slate-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-all">
                                                                <TrendingUp className="w-5 h-5" />
                                                            </button>
                                                            <button onClick={(e) => { e.stopPropagation(); onRemoveStudent(student.id!, currentClass.id); }} className="p-2 text-slate-300 hover:text-red-500 transition-colors">
                                                                <Trash2 className="w-5 h-5" />
                                                            </button>
                                                        </div>
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                    </>
                                ) : (
                                    <ClassEvolutionView classId={currentClass.id} t={t} />
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* Student Profile Modal */}
                {selectedStudent && (
                    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[60] flex items-center justify-center p-4">
                        <div className="bg-white w-full max-w-4xl rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 max-h-[90vh] flex flex-col">
                            <div className="p-8 md:p-12 space-y-8 overflow-y-auto no-scrollbar">
                                <div className="flex justify-between items-start">
                                    <div className="flex items-center gap-6">
                                        <div className="w-16 h-16 bg-blue-600 rounded-[1.5rem] flex items-center justify-center text-white text-2xl font-black shadow-lg shadow-blue-200">
                                            {selectedStudent.name.charAt(0).toUpperCase()}
                                        </div>
                                        <div className="space-y-1">
                                            <h2 className="text-3xl font-black text-slate-900 tracking-tight">{selectedStudent.name}</h2>
                                            <p className="text-slate-400 font-bold text-xs uppercase tracking-widest">{t('analytics.student_profile')}</p>
                                        </div>
                                    </div>
                                    <button onClick={() => { setSelectedStudent(null); setStudentStats(null); }} className="p-4 bg-slate-50 rounded-2xl text-slate-400 hover:text-slate-900 transition-all">
                                        <ChevronRight className="w-6 h-6 rotate-180" />
                                    </button>
                                </div>

                                {loadingStats ? (
                                    <div className="flex flex-col items-center justify-center py-20 gap-4">
                                        <div className="w-12 h-12 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin" />
                                        <p className="text-slate-400 font-black uppercase text-xs tracking-widest">{t('common.loading')}</p>
                                    </div>
                                ) : studentStats ? (
                                    <div className="space-y-10">
                                        {/* KPIs */}
                                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                                            <div className="bg-slate-50 p-6 rounded-[2rem] border border-slate-100 flex items-center gap-4">
                                                <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-blue-600 shadow-sm"><GraduationCap className="w-6 h-6" /></div>
                                                <div>
                                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('analytics.sessions_played')}</p>
                                                    <p className="text-2xl font-black text-slate-900">{studentStats.sessions}</p>
                                                </div>
                                            </div>
                                            <div className="bg-slate-50 p-6 rounded-[2rem] border border-slate-100 flex items-center gap-4">
                                                <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-emerald-600 shadow-sm"><Target className="w-6 h-6" /></div>
                                                <div>
                                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('analytics.avg_score')}</p>
                                                    <p className="text-2xl font-black text-slate-900">{studentStats.avgSuccess}%</p>
                                                </div>
                                            </div>
                                            <div className="bg-slate-50 p-6 rounded-[2rem] border border-slate-100 flex items-center gap-4">
                                                <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-amber-500 shadow-sm"><Trophy className="w-6 h-6" /></div>
                                                <div>
                                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('analytics.perfect_quizzes')}</p>
                                                    <p className="text-2xl font-black text-slate-900">{studentStats.perfectQuizzes}</p>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Chart */}
                                        <div className="space-y-4">
                                            <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest pl-2">{t('analytics.performance_trend')}</h3>
                                            <PerformanceChart
                                                data={studentStats.history}
                                                label={t('analytics.evolution_title')}
                                                t={t}
                                            />
                                        </div>

                                        {/* Mastery */}
                                        <div className="space-y-4">
                                            <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest pl-2">{t('analytics.topic_mastery')}</h3>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                {Object.entries(studentStats.mastery).length === 0 ? (
                                                    <div className="col-span-full py-8 text-center bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
                                                        <p className="text-slate-400 font-bold uppercase text-[10px] tracking-widest">Sin datos de temas aún</p>
                                                    </div>
                                                ) : (
                                                    Object.entries(studentStats.mastery).map(([tag, data]) => {
                                                        const pct = Math.round((data.correct / data.total) * 100);
                                                        return (
                                                            <div key={tag} className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-3">
                                                                <div className="flex justify-between items-center">
                                                                    <span className="font-black text-slate-900 uppercase text-xs tracking-tight">{tag}</span>
                                                                    <span className={`text-[10px] font-black px-2 py-1 rounded-lg ${pct > 80 ? 'bg-emerald-100 text-emerald-600' : pct > 50 ? 'bg-amber-100 text-amber-600' : 'bg-red-100 text-red-600'}`}>
                                                                        {pct}%
                                                                    </span>
                                                                </div>
                                                                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                                                                    <div
                                                                        className={`h-full rounded-full transition-all duration-1000 ${pct > 80 ? 'bg-emerald-500' : pct > 50 ? 'bg-amber-500' : 'bg-red-500'}`}
                                                                        style={{ width: `${pct}%` }}
                                                                    />
                                                                </div>
                                                            </div>
                                                        );
                                                    })
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="text-center py-20 bg-slate-50 rounded-[3rem] border-2 border-dashed border-slate-200">
                                        <p className="text-slate-400 font-bold uppercase text-xs tracking-widest">No hay datos suficientes para generar el perfil</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

function ClassEvolutionView({ classId, t }: { classId: string, t: (k: string) => string }) {
    const [stats, setStats] = useState<{ date: string; participation: number }[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchClassStats = async () => {
            const { data } = await supabase
                .from('sessions')
                .select(`
                    finished_at,
                    participants (count)
                `)
                .eq('status', 'finished')
                .eq('quizzes.class_id', classId) // Filter by class_id through quizzes link
                .order('finished_at', { ascending: true });

            if (data) {
                const formatted = (data as any[]).map(s => ({
                    date: new Date(s.finished_at).toLocaleDateString(undefined, { day: '2-digit', month: 'short' }),
                    participation: s.participants?.[0]?.count || 0
                }));
                setStats(formatted);
            }
            setLoading(false);
        };
        fetchClassStats();
    }, [classId]);

    if (loading) return <div className="py-20 flex justify-center"><div className="w-10 h-10 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin" /></div>;

    return (
        <div className="space-y-6">
            <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest pl-2">{t('analytics.evolution_title')}</h3>
            <PerformanceChart
                data={stats}
                label={t('analytics.participation')}
                t={t}
            />
            <div className="bg-blue-50 p-6 rounded-2xl border border-blue-100">
                <p className="text-blue-900 text-sm font-bold leading-relaxed">
                    💡 Esta gráfica muestra la participación histórica de la clase. Las analíticas detalladas por tema se basan en los tags de tus cuestionarios.
                </p>
            </div>
        </div>
    );
}
