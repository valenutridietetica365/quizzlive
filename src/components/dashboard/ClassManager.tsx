"use client";

import { useState, useEffect } from "react";
import { ChevronRight, GraduationCap, Target, Trophy } from "lucide-react";
import { DashboardClass, DashboardStudent } from "@/hooks/useDashboardData";
import PerformanceChart from "@/components/PerformanceChart";
import { supabase } from "@/lib/supabase";
import { ClassStudentsTab } from "./classes/ClassTabs";
import ClassList from "./classes/ClassList";

interface StudentParticipation {
    id: string;
    student_id?: string;
    sessions: {
        finished_at: string;
        quizzes: {
            tags: string[] | null;
        };
    };
    answers: {
        is_correct: boolean;
    }[];
}

interface ClassSession {
    finished_at: string;
    participants: { count: number }[];
}

interface ClassManagerProps {
    classes: DashboardClass[];
    t: (key: string) => string;
    onCreateClass: (name: string) => void;
    onDeleteClass: (id: string) => void;
    onAddStudent: (classId: string, name: string) => Promise<DashboardStudent | null>;
    onAddStudentsBulk: (classId: string, names: string[]) => Promise<DashboardStudent[] | null>;
    onRemoveStudent: (studentId: string, classId: string) => void;
}

export default function ClassManager({ classes, t, onCreateClass, onDeleteClass, onAddStudent, onAddStudentsBulk, onRemoveStudent }: ClassManagerProps) {
    const [newClassName, setNewClassName] = useState("");
    const [selectedClass, setSelectedClass] = useState<DashboardClass | null>(null);
    const [newStudentName, setNewStudentName] = useState("");
    const [selectedStudent, setSelectedStudent] = useState<DashboardStudent | null>(null);
    const [viewMode, setViewMode] = useState<"students" | "evolution" | "mastery">("students");
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
                const typedParticipations = participations as unknown as StudentParticipation[];
                const history = typedParticipations.map(p => ({
                    date: new Date(p.sessions.finished_at).toLocaleDateString(undefined, { day: '2-digit', month: 'short' }),
                    participation: Math.round((p.answers.filter(a => a.is_correct).length / (p.answers.length || 1)) * 100)
                }));

                const mastery: Record<string, { total: number; correct: number }> = {};
                let totalCorrect = 0;
                let totalQuestions = 0;
                let perfectCount = 0;

                typedParticipations.forEach(p => {
                    const correctCount = p.answers.filter(a => a.is_correct).length;
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

    const handleSelectClass = (cls: DashboardClass) => {
        setSelectedClass(cls);
        setViewMode("students");
    };

    const handleCreateClass = () => {
        if (!newClassName.trim()) return;
        onCreateClass(newClassName.trim());
        setNewClassName("");
    };

    // Keep selectedClass in sync with the classes prop
    const currentClass = selectedClass ? classes.find(c => c.id === selectedClass.id) || null : null;

    return (
        <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <ClassList 
                classes={classes}
                t={t}
                newClassName={newClassName}
                setNewClassName={setNewClassName}
                onCreateClass={handleCreateClass}
                onDeleteClass={onDeleteClass}
                onSelectClass={handleSelectClass}
            />

            {currentClass && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white w-full max-w-2xl rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
                        <div className="p-8 md:p-12 space-y-8">
                            <div className="flex justify-between items-start">
                                <div className="space-y-2">
                                    <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tight">{currentClass.name}</h2>
                                    <p className="text-slate-400 font-bold text-xs uppercase tracking-widest">{t('dashboard.classes.subtitle')}</p>
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => setViewMode("students")}
                                        className={`px-6 py-2.5 rounded-2xl text-xs font-black uppercase tracking-widest transition-all duration-300 ${viewMode === "students" ? "bg-blue-600 text-white shadow-lg shadow-blue-200" : "bg-white text-slate-400 hover:bg-slate-50 border border-slate-200"}`}
                                    >
                                        {t('dashboard.classes.modal_students')}
                                    </button>
                                    <button
                                        onClick={() => setViewMode("evolution")}
                                        className={`px-6 py-2.5 rounded-2xl text-xs font-black uppercase tracking-widest transition-all duration-300 ${viewMode === "evolution" ? "bg-blue-600 text-white shadow-lg shadow-blue-200" : "bg-white text-slate-400 hover:bg-slate-50 border border-slate-200"}`}
                                    >
                                        {t('dashboard.classes.modal_evolution')}
                                    </button>

                                    <button
                                        onClick={() => setViewMode("mastery")}
                                        className={`px-6 py-2.5 rounded-2xl text-xs font-black uppercase tracking-widest transition-all duration-300 ${viewMode === "mastery" ? "bg-indigo-600 text-white shadow-lg shadow-indigo-200" : "bg-white text-slate-400 hover:bg-slate-50 border border-slate-200"}`}
                                    >
                                        {t('dashboard.classes.modal_mastery')}
                                    </button>
                                </div>
                                <button onClick={() => { setSelectedClass(null); setViewMode("students"); }} className="p-4 bg-slate-50 rounded-2xl text-slate-400 hover:text-slate-900 transition-all">
                                    <ChevronRight className="w-6 h-6 rotate-180" />
                                </button>
                            </div>

                            <div className="bg-white rounded-[3rem] p-8 shadow-sm border border-slate-100 min-h-[400px]">
                                {viewMode === 'students' ? (
                                    <ClassStudentsTab 
                                        classId={currentClass.id}
                                        students={currentClass.students || []}
                                        t={t}
                                        newStudentName={newStudentName}
                                        setNewStudentName={setNewStudentName}
                                        onAddStudent={onAddStudent}
                                        onAddStudentsBulk={onAddStudentsBulk}
                                        onRemoveStudent={onRemoveStudent}
                                        onSelectStudent={handleSelectStudent}
                                    />
                                ) : viewMode === "evolution" ? (
                                    <ClassEvolutionView classId={currentClass.id} t={t} />
                                ) : (
                                    <ClassMasteryMatrix classId={currentClass.id} students={currentClass.students || []} t={t} />
                                )}
                            </div>
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

                                    <div className="space-y-4">
                                        <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest pl-2">{t('analytics.performance_trend')}</h3>
                                        <PerformanceChart
                                            data={studentStats.history}
                                            label={t('analytics.evolution_title')}
                                            t={t}
                                        />
                                    </div>

                                    <div className="space-y-4">
                                        <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest pl-2">{t('analytics.topic_mastery')}</h3>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            {Object.entries(studentStats.mastery).length === 0 ? (
                                                <div className="col-span-full py-8 text-center bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
                                                    <p className="text-slate-400 font-bold uppercase text-[10px] tracking-widest">{t('analytics.no_tags_desc')}</p>
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
    );
}

function ClassMasteryMatrix({ classId, students, t }: { classId: string, students: DashboardStudent[], t: (k: string) => string }) {
    const [matrixData, setMatrixData] = useState<{ student: string, topic: string, score: number }[]>([]);
    const [topics, setTopics] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchMasteryData = async () => {
            setLoading(true);
            try {
                const { data } = await supabase
                    .from('participants')
                    .select(`
                        student_id,
                        sessions!inner (
                            quizzes!inner (
                                class_id,
                                tags
                            )
                        ),
                        answers (
                            is_correct
                        )
                    `)
                    .eq('sessions.quizzes.class_id', classId);

                if (data) {
                    const typedData = data as unknown as StudentParticipation[];
                    const aggregation: Record<string, Record<string, { total: number, correct: number }>> = {};
                    const allTopics = new Set<string>();

                    typedData.forEach(p => {
                        const sId = p.student_id;
                        if (!sId) return;

                        const safeId = sId as string;
                        const studentTags = p.sessions.quizzes.tags || [];
                        const correctCount = p.answers.filter(a => a.is_correct).length;
                        const totalCount = p.answers.length;

                        if (!aggregation[safeId]) aggregation[safeId] = {};

                        studentTags.forEach((tag: string) => {
                            allTopics.add(tag);
                            if (!aggregation[safeId][tag]) aggregation[safeId][tag] = { total: 0, correct: 0 };
                            aggregation[safeId][tag].total += totalCount;
                            aggregation[safeId][tag].correct += correctCount;
                        });
                    });

                    const sortedTopics = Array.from(allTopics).sort();
                    const matrix: { student: string, topic: string, score: number }[] = [];

                    students.forEach(student => {
                        const currentStudentId = student.id;
                        if (!currentStudentId) return;

                        const safeStudentId = currentStudentId as string;
                        sortedTopics.forEach(topic => {
                            const stats = aggregation[safeStudentId]?.[topic];
                            matrix.push({
                                student: student.name,
                                topic,
                                score: stats && stats.total > 0 ? Math.round((stats.correct / stats.total) * 100) : -1
                            });
                        });
                    });

                    setTopics(sortedTopics);
                    setMatrixData(matrix);
                }
            } catch (e) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        };

        fetchMasteryData();
    }, [classId, students]);

    const getCellColor = (score: number) => {
        if (score === -1) return "bg-slate-50 text-slate-300";
        if (score < 50) return "bg-rose-100 text-rose-700 font-bold";
        if (score < 80) return "bg-amber-100 text-amber-700 font-bold";
        return "bg-emerald-100 text-emerald-700 font-bold";
    };

    if (loading) return <div className="py-20 flex justify-center"><div className="w-10 h-10 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin" /></div>;

    if (topics.length === 0) {
        return (
            <div className="py-20 text-center">
                <Target className="mx-auto text-slate-200 mb-4" size={48} />
                <p className="text-slate-400 font-bold uppercase text-xs tracking-widest">{t('analytics.no_tags_desc')}</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-end pr-2">
                <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest">{t('analytics.mastery_matrix')}</h3>
                <span className="text-[10px] text-slate-400 font-bold uppercase">{t('analytics.mastery_legend')}</span>
            </div>

            <div className="overflow-x-auto pb-4 custom-scrollbar">
                <table className="w-full border-separate border-spacing-2">
                    <thead>
                        <tr>
                            <th className="p-3 text-left text-[10px] font-black uppercase text-slate-400 w-48 sticky left-0 bg-white z-10">{t('common.student')}</th>
                            {topics.map(topic => (
                                <th key={topic} className="p-3 text-center text-[10px] font-black uppercase text-slate-500 bg-slate-50 rounded-xl min-w-[100px]">
                                    {topic}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {students.map(student => (
                            <tr key={student.id}>
                                <td className="p-4 text-sm font-bold text-slate-700 bg-white sticky left-0 z-10 border-r border-slate-50">{student.name}</td>
                                {topics.map(topic => {
                                    const cell = matrixData.find(d => d.student === student.name && d.topic === topic);
                                    const score = cell ? cell.score : -1;
                                    return (
                                        <td key={topic} className={`p-4 text-center rounded-2xl text-xs transition-all duration-300 ${getCellColor(score)}`}>
                                            {score === -1 ? "-" : `${score}%`}
                                        </td>
                                    );
                                })}
                            </tr>
                        ))}
                    </tbody>
                </table>
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
                .eq('quizzes.class_id', classId)
                .order('finished_at', { ascending: true });

            if (data) {
                const typedData = data as unknown as ClassSession[];
                const formatted = typedData.map(s => ({
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
        </div>
    );
}
