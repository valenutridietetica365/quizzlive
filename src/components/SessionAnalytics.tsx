"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell
} from "recharts";
import { Loader2, Users, Target, TrendingUp } from "lucide-react";
import { toast } from "sonner";
import { getTranslation } from "@/lib/i18n";
import { useQuizStore } from "@/lib/store";

interface AnalyticsProps {
    sessionId: string;
}

interface QuestionStat {
    name: string;
    fullName: string;
    correct: number;
    total: number;
    percentage: number;
}

interface AnswerRow {
    is_correct: boolean;
    question_id: string;
    questions: { question_text: string } | null;
}

export default function SessionAnalytics({ sessionId }: AnalyticsProps) {
    const { language } = useQuizStore();
    const [data, setData] = useState<QuestionStat[]>([]);
    const [loading, setLoading] = useState(true);
    const t = (key: string) => getTranslation(language, key);

    const exportToCSV = async () => {
        const { data: answers, error } = await supabase
            .from("answers")
            .select(`
                is_correct,
                points_awarded,
                questions(question_text),
                participants(nickname, students(name))
            `)
            .eq("session_id", sessionId);

        if (error || !answers) {
            toast.error("Error al exportar datos");
            return;
        }

        const headers = ["Alumno", "Pregunta", "Correcto", "Puntos"];
        const rows = (answers as any[]).map(a => [
            a.participants?.students?.name || a.participants?.nickname || "Anónimo",
            a.questions?.question_text || "Pregunta",
            a.is_correct ? "SÍ" : "NO",
            a.points_awarded
        ]);

        const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", `Reporte_Sesion_${sessionId}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    useEffect(() => {
        const fetchAnalytics = async () => {
            const { data: answers } = await supabase
                .from("answers")
                .select("is_correct, question_id, questions(question_text)")
                .eq("session_id", sessionId);

            if (answers) {
                const stats = (answers as unknown as AnswerRow[]).reduce<Record<string, QuestionStat>>((acc, curr) => {
                    const qId = curr.question_id;
                    const qText = curr.questions?.question_text ?? "Pregunta";
                    if (!acc[qId]) {
                        acc[qId] = {
                            name: qText.substring(0, 15) + "...",
                            fullName: qText,
                            correct: 0,
                            total: 0,
                            percentage: 0
                        };
                    }
                    acc[qId].total += 1;
                    if (curr.is_correct) acc[qId].correct += 1;
                    return acc;
                }, {});

                const chartData: QuestionStat[] = Object.values(stats).map((q) => ({
                    ...q,
                    percentage: Math.round((q.correct / q.total) * 100)
                }));

                setData(chartData);
            }
            setLoading(false);
        };

        fetchAnalytics();
    }, [sessionId]);

    if (loading) return <div className="flex justify-center p-12"><Loader2 className="w-8 h-8 animate-spin text-blue-500" /></div>;

    const avgSuccess = data.length > 0 ? Math.round(data.reduce((a, b) => a + b.percentage, 0) / data.length) : 0;

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="flex justify-between items-center">
                <div className="space-y-1">
                    <h2 className="text-2xl font-black text-white uppercase tracking-tight">Estadísticas de Sesión</h2>
                    <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">Resumen detallado de resultados</p>
                </div>
                <button
                    onClick={exportToCSV}
                    className="bg-blue-600 text-white px-6 py-3 rounded-2xl font-black text-sm hover:bg-blue-700 transition-all active:scale-95 shadow-lg shadow-blue-500/20 flex items-center gap-2"
                >
                    <TrendingUp className="w-4 h-4" />
                    Exportar CSV
                </button>
            </div>
            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-slate-900/50 p-6 rounded-3xl border border-white/5 space-y-2">
                    <div className="flex items-center gap-3 text-blue-400">
                        <Target className="w-5 h-5" />
                        <span className="text-xs font-black uppercase tracking-widest">{t('analytics.avg_success')}</span>
                    </div>
                    <p className="text-4xl font-black">{avgSuccess}%</p>
                </div>
                <div className="bg-slate-900/50 p-6 rounded-3xl border border-white/5 space-y-2">
                    <div className="flex items-center gap-3 text-emerald-400">
                        <Users className="w-5 h-5" />
                        <span className="text-xs font-black uppercase tracking-widest">{t('analytics.participation')}</span>
                    </div>
                    <p className="text-4xl font-black">{data[0]?.total ?? 0}</p>
                </div>
                <div className="bg-slate-900/50 p-6 rounded-3xl border border-white/5 space-y-2">
                    <div className="flex items-center gap-3 text-amber-400">
                        <TrendingUp className="w-5 h-5" />
                        <span className="text-xs font-black uppercase tracking-widest">{t('analytics.best_question')}</span>
                    </div>
                    <p className="text-xl font-black truncate">{[...data].sort((a, b) => b.percentage - a.percentage)[0]?.name ?? "---"}</p>
                </div>
            </div>

            {/* AI/Pedagogical Insight */}
            {data.some(q => q.percentage < 50) && (
                <div className="bg-amber-50 border-2 border-amber-200 p-8 rounded-[3rem] space-y-4 animate-in zoom-in duration-500">
                    <div className="flex items-center gap-4 text-amber-700">
                        <div className="bg-amber-500 p-3 rounded-2xl text-white shadow-lg shadow-amber-200">
                            <Target className="w-6 h-6" />
                        </div>
                        <div>
                            <h3 className="text-xl font-black uppercase tracking-tight">{t('analytics.insight_title')}</h3>
                            <p className="text-sm font-bold opacity-80">{t('analytics.insight_desc')}</p>
                        </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {data.filter(q => q.percentage < 50).map(q => (
                            <div key={q.fullName} className="bg-white/60 p-4 rounded-2xl border border-amber-100 flex items-center justify-between">
                                <span className="font-bold text-slate-700 truncate mr-4">{q.fullName}</span>
                                <span className="bg-amber-100 text-amber-600 px-3 py-1 rounded-full text-xs font-black">{q.percentage}%</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Main Chart */}
            <div className="bg-slate-900/50 p-8 rounded-[3rem] border border-white/5 shadow-2xl">
                <h3 className="text-xl font-black mb-8 flex items-center gap-3">
                    <TrendingUp className="w-6 h-6 text-blue-500" />
                    {t('analytics.success_by_question')}
                </h3>
                <div className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={data}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                            <XAxis
                                dataKey="name"
                                axisLine={false}
                                tickLine={false}
                                tick={{ fill: '#64748b', fontWeight: 'bold', fontSize: 12 }}
                            />
                            <YAxis
                                axisLine={false}
                                tickLine={false}
                                tick={{ fill: '#64748b', fontWeight: 'bold' }}
                                domain={[0, 100]}
                            />
                            <Tooltip
                                cursor={{ fill: '#1e293b' }}
                                contentStyle={{ backgroundColor: '#0f172a', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.1)', padding: '12px' }}
                                itemStyle={{ color: '#fff', fontWeight: 'bold' }}
                            />
                            <Bar dataKey="percentage" radius={[8, 8, 0, 0]}>
                                {data.map((entry, index) => (
                                    <Cell
                                        key={`cell-${index}`}
                                        fill={entry.percentage > 70 ? '#10b981' : entry.percentage > 40 ? '#3b82f6' : '#ef4444'}
                                    />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    );
}
