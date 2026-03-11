"use client";

import React, { useState, useMemo } from "react";
import { Loader2, FileDown } from "lucide-react";
import { toast } from "sonner";
import { getTranslation } from "@/lib/i18n";
import { useQuizStore } from "@/lib/store";

import KPISection from "@/components/analytics/KPISection";
import InsightsPanel from "@/components/analytics/InsightsPanel";
import QuestionsChart from "@/components/analytics/QuestionsChart";
import { generateExcelReport, generatePDFReport, ReportData } from "@/lib/reports";
import { calculateChileanGrade } from "@/lib/grading";
import { useSessionResults } from "@/hooks/useSessionResults";
import HeatmapTable, { HeatmapRow } from "@/components/analytics/HeatmapTable";

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

// HeatmapRow moved to HeatmapTable.tsx

// HeatmapRow moved to HeatmapTable.tsx

const SessionAnalytics = React.memo(function SessionAnalytics({ sessionId }: SessionAnalyticsProps) {
    const { language } = useQuizStore();
    const { answers, participants, questions, session, loading: dataLoading, maxTotalScore } = useSessionResults(sessionId);
    const [useGrading, setUseGrading] = useState(false);
    const [exigency, setExigency] = useState(0.6); // 60% by default
    const t = (key: string) => getTranslation(language, key);

    const downloadProfessionalReport = async () => {
        if (!session || !session.quiz) return;
        generateExcelReport({
            session: session as unknown as ReportData['session'],
            answers,
            participants,
            questions,
            exigency,
            branding: session.quiz.teacher
        }, t);
        toast.success("Reporte generado con éxito (Excel)");
    };

    const downloadPDFReportAction = async () => {
        if (!session || !session.quiz) return;
        generatePDFReport({
            session: session as unknown as ReportData['session'],
            answers,
            participants,
            questions,
            exigency,
            branding: session.quiz.teacher
        }, t);
        toast.success("Reporte generado con éxito (PDF)");
    };

    // --- Data Processing (Memoized) ---
    const chartData = useMemo(() => {
        if (!answers.length) return [];
        const stats = answers.reduce<Record<string, QuestionStat>>((acc, curr) => {
            const qId = curr.question_id;
            const qText = questions.find(q => q.id === qId)?.question_text ?? "Pregunta";
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
        return Object.values(stats).map((q) => ({ 
            ...q, 
            percentage: Math.round((q.correct / q.total) * 100) 
        }));
    }, [answers, questions]);

    const processedHeatmapRows = useMemo(() => {
        if (!answers.length) return [];
        const userMap = new Map<string, HeatmapRow>();
        
        answers.forEach(a => {
            const qId = a.question_id;
            const pId = a.participant_id || "unknown";
            const pName = participants.find(p => p.id === pId)?.nickname || "Anónimo";
            
            if (!userMap.has(pId)) {
                userMap.set(pId, { 
                    participantId: pId, 
                    studentName: pName, 
                    totalScore: 0, 
                    answers: {} 
                });
            }
            
            const row = userMap.get(pId)!;
            const question = questions.find(q => q.id === qId);
            row.answers[qId] = a.is_correct;
            row.totalScore += a.points_awarded || 0;
            
            if (a.is_correct && question) {
                if (!row.pedagogicalScore) row.pedagogicalScore = 0;
                row.pedagogicalScore += question.points || 0;
            }
        });

        return Array.from(userMap.values()).map(row => ({
            ...row,
            grade: calculateChileanGrade(row.pedagogicalScore || 0, maxTotalScore, { exigency })
        })).sort((a, b) => a.studentName.localeCompare(b.studentName));
    }, [answers, participants, exigency, maxTotalScore, questions]);

    // Derived Stats
    const avgSuccess = chartData.length > 0 
        ? Math.round(chartData.reduce((a, b) => a + b.percentage, 0) / chartData.length) 
        : 0;
    
    const bestQuestionName = [...chartData].sort((a: QuestionStat, b: QuestionStat) => b.percentage - a.percentage)[0]?.name ?? "---";
    const totalParticipants = processedHeatmapRows.length;

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="flex justify-between items-center">
                <div className="space-y-1">
                    <h2 className="text-2xl font-black text-white uppercase tracking-tight">Estadísticas de Sesión</h2>
                    <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">Resumen detallado de resultados</p>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={downloadProfessionalReport}
                        disabled={dataLoading}
                        className="bg-emerald-600 text-white px-6 py-3 rounded-2xl font-black text-sm hover:bg-emerald-700 transition-all active:scale-95 shadow-lg shadow-emerald-500/20 flex items-center gap-2 disabled:opacity-50"
                    >
                        {dataLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileDown className="w-4 h-4" />}
                        Excel
                    </button>
                    <button
                        onClick={downloadPDFReportAction}
                        disabled={dataLoading}
                        className="bg-slate-900 text-white px-6 py-3 rounded-2xl font-black text-sm hover:bg-slate-800 transition-all active:scale-95 shadow-lg shadow-slate-900/20 flex items-center gap-2 disabled:opacity-50"
                    >
                        {dataLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileDown className="w-4 h-4" />}
                        PDF
                    </button>
                </div>
            </div>

            <KPISection avgSuccess={avgSuccess} totalParticipants={totalParticipants} bestQuestionName={bestQuestionName} t={t} />
            <InsightsPanel data={chartData} t={t} />
            <QuestionsChart data={chartData} t={t} />

            {/* Heatmap Section */}
            <HeatmapTable 
                rows={processedHeatmapRows} 
                questions={questions} 
                useGrading={useGrading} 
                exigency={exigency} 
                t={t}
                onToggleGrading={() => setUseGrading(!useGrading)}
                onSetExigency={setExigency}
                quizTitle={session?.quiz?.title}
            />
        </div>
    );
});

export default SessionAnalytics;
