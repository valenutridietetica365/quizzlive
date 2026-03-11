"use client";

import React, { useMemo } from "react";
import { FileSpreadsheet, Loader2, Users, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { generateExcelReport, ReportAnswer, ReportParticipant, ReportQuestion } from "@/lib/reports";
import { calculateChileanGrade } from "@/lib/grading";
import { getTranslation } from "@/lib/i18n";
import { useQuizStore } from "@/lib/store";
import { useSessionResults } from "@/hooks/useSessionResults";

interface ReportProps {
    sessionId: string;
}

const SessionReport = React.memo(function SessionReport({ sessionId }: ReportProps) {
    const { language } = useQuizStore();
    const t = (key: string) => getTranslation(language, key);
    const { answers, participants, questions, session, loading, maxTotalScore } = useSessionResults(sessionId);

    const sortedParticipants = useMemo(() => {
        return participants.map(p => {
            const pAnswers = answers.filter(a => a.participant_id === p.id);
            const totalPoints = pAnswers.reduce((sum, a) => sum + (a.points_awarded || 0), 0);
            return {
                ...p,
                total_points: totalPoints,
                answers: pAnswers
            };
        }).sort((a, b) => b.total_points - a.total_points);
    }, [participants, answers]);

    const exportToXLSX = () => {
        if (!session || sortedParticipants.length === 0) return;

        generateExcelReport({
            session: session as any,
            answers: answers as ReportAnswer[],
            participants: participants as ReportParticipant[],
            questions: questions as ReportQuestion[],
            exigency: 0.6
        }, t);

        toast.success(t('common.success') || "Reporte generado");
    };

    if (loading) return (
        <div className="flex items-center justify-center p-12">
            <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
    );

    return (
        <div className="space-y-6 animate-in fade-in duration-1000">
            <div className="flex items-center justify-between pb-4 border-b border-white/5">
                <div className="flex items-center gap-3">
                    <div className="bg-blue-500/10 p-2 rounded-lg">
                        <Users className="w-5 h-5 text-blue-400" />
                    </div>
                    <div>
                        <h3 className="text-xl font-black text-white">Detalle por Participante</h3>
                        <p className="text-sm text-slate-500 font-medium">Resultados individuales detallados</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => window.print()}
                        className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-white px-4 py-2 rounded-xl text-sm font-black transition-all active:scale-95 border border-white/5"
                    >
                        <Users className="w-4 h-4 text-blue-400" />
                        Imprimir / PDF
                    </button>
                    <button
                        onClick={exportToXLSX}
                        className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl text-sm font-black transition-all active:scale-95 shadow-lg shadow-emerald-900/20"
                    >
                        <FileSpreadsheet className="w-4 h-4" />
                        Exportar Excel
                    </button>
                </div>
            </div>

            <div className="overflow-x-auto rounded-2xl border border-white/5 bg-slate-900/30">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-slate-900/50">
                            <th className="p-4 text-xs font-black text-slate-500 uppercase tracking-widest">{t('common.student')}</th>
                            <th className="p-4 text-xs font-black text-slate-500 uppercase tracking-widest text-center">{t('analytics.grade')} (60%)</th>
                            <th className="p-4 text-xs font-black text-slate-500 uppercase tracking-widest text-center">{t('session.table_score')}</th>
                            <th className="p-4 text-xs font-black text-slate-500 uppercase tracking-widest text-center">{t('session.table_correct')}</th>
                            <th className="p-4 text-xs font-black text-slate-500 uppercase tracking-widest text-center">{t('session.table_accuracy')}</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                        {sortedParticipants.map((p) => {
                            const correctCount = p.answers.filter(a => a.is_correct).length;
                            const totalQuestions = p.answers.length;
                            const percentage = totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0;

                            return (
                                <tr key={p.id} className="hover:bg-white/5 transition-colors group">
                                    <td className="p-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-xs font-black text-slate-400 group-hover:bg-blue-500 group-hover:text-white transition-colors">
                                                {p.nickname.charAt(0).toUpperCase()}
                                            </div>
                                            <span className="font-black text-white">{p.nickname}</span>
                                        </div>
                                    </td>
                                    <td className="p-4 text-center">
                                        {(() => {
                                            const finalGrade = calculateChileanGrade(p.total_points, maxTotalScore, { exigency: 0.6 });
                                            return (
                                                <span className={`text-sm font-black px-3 py-1 rounded-lg ${finalGrade >= 4.0 ? 'bg-blue-500/20 text-blue-400' : 'bg-rose-500/20 text-rose-400'}`}>
                                                    {finalGrade.toFixed(1)}
                                                </span>
                                            );
                                        })()}
                                    </td>
                                    <td className="p-4 text-center font-black text-slate-400 tabular-nums">{p.total_points.toLocaleString()}</td>
                                    <td className="p-4 text-center">
                                        <div className="flex items-center justify-center gap-1 font-black text-white">
                                            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                                            {correctCount}
                                        </div>
                                    </td>
                                    <td className="p-4">
                                        <div className="flex flex-col items-center gap-1">
                                            <div className="w-full max-w-[80px] h-1.5 bg-slate-800 rounded-full overflow-hidden">
                                                <div
                                                    className={`h-full transition-all duration-1000 ${percentage > 70 ? 'bg-emerald-500' : percentage > 40 ? 'bg-blue-500' : 'bg-red-500'}`}
                                                    style={{ width: `${percentage}%` }}
                                                />
                                            </div>
                                            <span className="text-[10px] font-black text-slate-500">{percentage}%</span>
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {sortedParticipants.length === 0 && (
                <div className="text-center py-12 bg-slate-900/20 rounded-3xl border-2 border-dashed border-white/5">
                    <Users className="w-12 h-12 text-slate-700 mx-auto mb-4" />
                    <p className="text-slate-500 font-black uppercase tracking-widest text-sm">No hay datos de participación</p>
                </div>
            )}
        </div>
    );
});

export default SessionReport;
