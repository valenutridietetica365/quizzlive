"use client";

import { Calendar, ChevronRight, History, Trash2, FileDown, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { FinishedSession } from "@/lib/schemas";
import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { generateExcelReport, generatePDFReport, ReportAnswer, ReportData, ReportParticipant, ReportQuestion } from "@/lib/reports";
import { toast } from "sonner";

interface HistoryTableProps {
    history: FinishedSession[];
    language: string;
    t: (key: string) => string;
    onDelete: (id: string) => void;
}

interface SessionDataWithQuiz {
    id: string;
    pin: string;
    created_at: string;
    finished_at: string;
    quiz: {
        id: string;
        title: string;
        class: { name: string } | null;
    } | null;
}

export default function HistoryTable({ history, language, t, onDelete }: HistoryTableProps) {
    const router = useRouter();
    const [downloadingId, setDownloadingId] = useState<string | null>(null);
    const [downloadingFormat, setDownloadingFormat] = useState<'excel' | 'pdf' | null>(null);

    const handleDownload = async (e: React.MouseEvent, session: FinishedSession, format: 'excel' | 'pdf') => {
        e.stopPropagation();
        try {
            setDownloadingId(session.id);
            setDownloadingFormat(format);

            // 1. Fetch complete data
            const { data: sessionData, error: sessionError } = await supabase
                .from("sessions")
                .select(`
                    id, pin, created_at, finished_at,
                    quiz:quizzes(id, title, class:classes(name))
                `)
                .eq("id", session.id)
                .single();

            const { data: answersData, error: answersError } = await supabase
                .from("answers")
                .select("is_correct, points_awarded, question_id, participant_id")
                .eq("session_id", session.id);

            const { data: participantsData, error: participantsError } = await supabase
                .from("participants")
                .select("id, nickname")
                .eq("session_id", session.id);

            const { data: questionsData, error: questionsError } = await supabase
                .from("questions")
                .select("id, question_text")
                .eq("quiz_id", (sessionData as unknown as SessionDataWithQuiz)?.quiz?.id || "")
                .order('sort_order', { ascending: true });

            if (sessionError || answersError || participantsError || questionsError || !sessionData) {
                throw new Error("Error al obtener datos");
            }

            // 2. Generate
            const payload: ReportData = {
                session: sessionData as unknown as ReportData['session'],
                answers: answersData as unknown as ReportAnswer[],
                participants: participantsData as unknown as ReportParticipant[],
                questions: questionsData as unknown as ReportQuestion[]
            };

            if (format === 'excel') {
                generateExcelReport(payload, t);
            } else {
                generatePDFReport(payload, t);
            }

            toast.success(`Reporte ${format.toUpperCase()} generado`);
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : "Error al descargar";
            toast.error(message);
        } finally {
            setDownloadingId(null);
            setDownloadingFormat(null);
        }
    };

    if (history.length === 0) {
        return (
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
        );
    }

    return (
        <div className="space-y-6">
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
                            {history.map((session) => (
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
                                                day: "2-digit", month: "long", year: "numeric"
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
                                            onClick={(e) => handleDownload(e, session, 'excel')}
                                            disabled={!!downloadingId}
                                            className="p-3 bg-emerald-50 rounded-xl text-emerald-600 hover:bg-emerald-600 hover:text-white transition-all shadow-sm disabled:opacity-50"
                                            title="Excel"
                                        >
                                            {downloadingId === session.id && downloadingFormat === 'excel' ? <Loader2 className="w-5 h-5 animate-spin" /> : <FileDown className="w-5 h-5" />}
                                        </button>
                                        <button
                                            onClick={(e) => handleDownload(e, session, 'pdf')}
                                            disabled={!!downloadingId}
                                            className="p-3 bg-slate-50 rounded-xl text-slate-600 hover:bg-slate-900 hover:text-white transition-all shadow-sm disabled:opacity-50"
                                            title="PDF"
                                        >
                                            {downloadingId === session.id && downloadingFormat === 'pdf' ? <Loader2 className="w-5 h-5 animate-spin" /> : <FileDown className="w-5 h-5" />}
                                        </button>
                                        <button
                                            onClick={() => router.push(`/teacher/reports/${session.id}`)}
                                            className="inline-flex items-center gap-2 bg-slate-900 text-white px-6 py-2.5 rounded-xl font-black text-sm hover:bg-blue-600 transition-all active:scale-95 shadow-lg shadow-slate-100"
                                        >
                                            {t('dashboard.report_button')}
                                            <ChevronRight className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={() => onDelete(session.id)}
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
                {history.map((session) => (
                    <div key={session.id} className="bg-white rounded-[2rem] p-6 shadow-sm border border-slate-50 space-y-6">
                        <div className="space-y-2">
                            <div className="flex items-center gap-2 text-[10px] font-black text-slate-300 uppercase tracking-widest">
                                <Calendar className="w-3 h-3" />
                                {new Date(session.finished_at).toLocaleDateString(language === 'es' ? 'es-ES' : 'en-US', {
                                    day: "2-digit", month: "short"
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
                                onClick={(e) => handleDownload(e, session, 'excel')}
                                disabled={!!downloadingId}
                                className="p-4 bg-emerald-50 rounded-xl text-emerald-600 active:bg-emerald-600 active:text-white transition-all shadow-sm"
                            >
                                {downloadingId === session.id && downloadingFormat === 'excel' ? <Loader2 className="w-5 h-5 animate-spin" /> : <FileDown className="w-5 h-5" />}
                            </button>
                            <button
                                onClick={(e) => handleDownload(e, session, 'pdf')}
                                disabled={!!downloadingId}
                                className="p-4 bg-slate-50 rounded-xl text-slate-600 active:bg-slate-900 active:text-white transition-all shadow-sm"
                            >
                                {downloadingId === session.id && downloadingFormat === 'pdf' ? <Loader2 className="w-5 h-5 animate-spin" /> : <FileDown className="w-5 h-5" />}
                            </button>
                            <button
                                onClick={() => onDelete(session.id)}
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
