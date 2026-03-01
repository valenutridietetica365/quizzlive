"use client";

import React, { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Loader2, Target, TrendingUp } from "lucide-react";
import { toast } from "sonner";
import { getTranslation } from "@/lib/i18n";
import { useQuizStore } from "@/lib/store";

import KPISection from "@/components/analytics/KPISection";
import InsightsPanel from "@/components/analytics/InsightsPanel";
import QuestionsChart from "@/components/analytics/QuestionsChart";

interface SessionAnalyticsProps {
    sessionId: string;
}

export interface QuestionStat {
    name: string;
    fullName: string;
    correct: number;
    total: number;
    percentage: number;
}

interface ExportAnswer {
    is_correct: boolean;
    question_id: string;
    points_awarded: number;
    questions: { question_text: string } | null;
    participants: {
        id: string;
        nickname: string;
        team: string | null;
    } | null;
}

interface HeatmapRow {
    participantId: string;
    studentName: string;
    answers: Record<string, boolean | null>;
}

const SessionAnalytics = React.memo(function SessionAnalytics({ sessionId }: SessionAnalyticsProps) {
    const { language } = useQuizStore();
    const [data, setData] = useState<QuestionStat[]>([]);
    const [heatmapData, setHeatmapData] = useState<{ rows: HeatmapRow[], questions: { id: string, name: string }[] }>({ rows: [], questions: [] });
    const [loading, setLoading] = useState(true);
    const t = (key: string) => getTranslation(language, key);

    const exportToCSV = async () => {
        const { data: answers, error } = await supabase.from("answers").select(`is_correct, points_awarded, questions(question_text), participants(nickname)`).eq("session_id", sessionId);
        if (error || !answers) { toast.error("Error al exportar datos"); return; }

        const headers = ["Alumno", "Pregunta", "Correcto", "Puntos"];
        const rows = (answers as unknown as ExportAnswer[]).map(a => [
            a.participants?.nickname || "Anónimo",
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
            const { data: answers } = await supabase.from("answers").select("is_correct, question_id, questions(question_text), participants(id, nickname, team)").eq("session_id", sessionId);
            if (answers) {
                const typedAnswers = answers as unknown as ExportAnswer[];

                // Chart Data
                const stats = typedAnswers.reduce<Record<string, QuestionStat>>((acc, curr) => {
                    const qId = curr.question_id;
                    const qText = curr.questions?.question_text ?? "Pregunta";
                    if (!acc[qId]) { acc[qId] = { name: qText.substring(0, 15) + "...", fullName: qText, correct: 0, total: 0, percentage: 0 }; }
                    acc[qId].total += 1;
                    if (curr.is_correct) acc[qId].correct += 1;
                    return acc;
                }, {});
                const chartData = Object.values(stats).map((q) => ({ ...q, percentage: Math.round((q.correct / q.total) * 100) }));
                setData(chartData);

                // Heatmap Data
                const questionMap = new Map<string, string>();
                const userMap = new Map<string, HeatmapRow>();
                typedAnswers.forEach(a => {
                    const qId = a.question_id;
                    const qText = a.questions?.question_text || "Q";
                    questionMap.set(qId, qText.substring(0, 10) + "...");
                    const pId = a.participants?.id || "unknown";
                    const pName = a.participants?.nickname || "Anónimo";
                    if (!userMap.has(pId)) userMap.set(pId, { participantId: pId, studentName: pName, answers: {} });
                    userMap.get(pId)!.answers[qId] = a.is_correct;
                });
                const uniqueQuestions = Array.from(questionMap.entries()).map(([id, name]) => ({ id, name }));
                const rows = Array.from(userMap.values()).sort((a, b) => a.studentName.localeCompare(b.studentName));
                setHeatmapData({ rows, questions: uniqueQuestions });
            }
            setLoading(false);
        };
        fetchAnalytics();
    }, [sessionId]);

    if (loading) return <div className="flex justify-center p-12"><Loader2 className="w-8 h-8 animate-spin text-blue-500" /></div>;

    const avgSuccess = data.length > 0 ? Math.round(data.reduce((a, b) => a + b.percentage, 0) / data.length) : 0;
    const bestQuestionName = [...data].sort((a, b) => b.percentage - a.percentage)[0]?.name ?? "---";

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="flex justify-between items-center">
                <div className="space-y-1">
                    <h2 className="text-2xl font-black text-white uppercase tracking-tight">Estadísticas de Sesión</h2>
                    <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">Resumen detallado de resultados</p>
                </div>
                <button onClick={exportToCSV} className="bg-blue-600 text-white px-6 py-3 rounded-2xl font-black text-sm hover:bg-blue-700 transition-all active:scale-95 shadow-lg shadow-blue-500/20 flex items-center gap-2">
                    <TrendingUp className="w-4 h-4" /> Exportar CSV
                </button>
            </div>

            <KPISection avgSuccess={avgSuccess} totalParticipants={data[0]?.total ?? 0} bestQuestionName={bestQuestionName} t={t} />
            <InsightsPanel data={data} t={t} />
            <QuestionsChart data={data} t={t} />

            {/* Heatmap Section */}
            {heatmapData.rows.length > 0 && heatmapData.questions.length > 0 && (
                <div className="bg-slate-900/50 p-6 md:p-8 rounded-[3rem] border border-white/5 shadow-2xl mt-8 animate-in fade-in slide-in-from-bottom-6 duration-1000 delay-300">
                    <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
                        <div className="space-y-1">
                            <h3 className="text-xl font-black flex items-center gap-3 text-white">
                                <Target className="w-6 h-6 text-purple-500" /> {t('analytics.heatmap_title') || "Mapa de Calor de la Clase"}
                            </h3>
                            <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">{t('analytics.heatmap_subtitle') || "Rendimiento detallado por alumno y pregunta"}</p>
                        </div>
                        <div className="flex gap-4 text-xs font-bold uppercase tracking-widest text-slate-400 bg-slate-900/80 p-3 rounded-2xl border border-white/5">
                            <span className="flex items-center gap-2"><div className="w-3 h-3 bg-emerald-500 shadow-lg shadow-emerald-500/20 rounded-sm"></div> Correcto</span>
                            <span className="flex items-center gap-2"><div className="w-3 h-3 bg-rose-500 shadow-lg shadow-rose-500/20 rounded-sm"></div> Falso</span>
                            <span className="flex items-center gap-2"><div className="w-3 h-3 bg-slate-800 border border-slate-700 rounded-sm"></div> Vacio</span>
                        </div>
                    </div>

                    <div className="overflow-x-auto pb-4 custom-scrollbar">
                        <div className="min-w-max bg-slate-900/30 rounded-[2rem] border border-white/5 p-2 md:p-4">
                            <div className="flex mb-2">
                                <div className="w-48 flex-shrink-0 p-3 text-slate-400 font-black text-[10px] uppercase tracking-[0.2em] sticky left-0 bg-slate-900/90 backdrop-blur-md rounded-xl z-20">
                                    {t('common.student') || "Alumno"}
                                </div>
                                {heatmapData.questions.map((q, idx) => (
                                    <div key={q.id} className="w-20 md:w-24 flex-shrink-0 p-3 text-center text-slate-400 font-bold text-xs truncate" title={q.name}>P{idx + 1}</div>
                                ))}
                            </div>
                            <div className="space-y-2">
                                {heatmapData.rows.map(row => (
                                    <div key={row.participantId} className="flex group hover:bg-slate-800/30 rounded-2xl transition-all">
                                        <div className="w-48 flex-shrink-0 p-3 font-black text-slate-200 text-sm truncate sticky left-0 bg-slate-900/95 backdrop-blur-md group-hover:bg-slate-800 rounded-xl z-10 transition-colors shadow-[4px_0_24px_rgba(0,0,0,0.2)]" title={row.studentName}>
                                            <div className="flex items-center gap-3">
                                                <div className="w-6 h-6 rounded-full bg-slate-800 flex items-center justify-center text-[10px] text-slate-400 border border-slate-700">{row.studentName.charAt(0).toUpperCase()}</div>
                                                <span className="truncate">{row.studentName}</span>
                                            </div>
                                        </div>
                                        {heatmapData.questions.map(q => {
                                            const isCorrect = row.answers[q.id];
                                            return (
                                                <div key={q.id} className="w-20 md:w-24 flex-shrink-0 p-1.5 md:p-2">
                                                    <div className={`w-full h-10 md:h-12 rounded-xl flex items-center justify-center transition-all duration-300 ${isCorrect === true ? 'bg-emerald-500/10 border border-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.1)] group-hover:bg-emerald-500/20' : isCorrect === false ? 'bg-rose-500/10 border border-rose-500/30 shadow-[0_0_15px_rgba(244,63,94,0.1)] group-hover:bg-rose-500/20' : 'bg-slate-800/50 border border-slate-700/50'}`} title={`${row.studentName} - ${q.name}: ${isCorrect === true ? 'Correcto' : isCorrect === false ? 'Incorrecto' : 'No respondió'}`}>
                                                        {isCorrect === true && <div className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,1)]"></div>}
                                                        {isCorrect === false && <div className="w-2 h-2 rounded-full bg-rose-400 shadow-[0_0_10px_rgba(251,113,133,1)]"></div>}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
});

export default SessionAnalytics;
