"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { ArrowLeft, Trophy, Users, BarChart3, Loader2, Calendar, Target } from "lucide-react";
import { useQuizStore } from "@/lib/store";
import { getTranslation } from "@/lib/i18n";
import LanguageSelector from "@/components/LanguageSelector";
import SessionReport from "@/components/SessionReport";
import SessionAnalytics from "@/components/SessionAnalytics";

interface ReportData {
    id: string;
    finished_at: string;
    quiz: {
        title: string;
    };
    participants: {
        nickname: string;
        scores: {
            total_points: number;
        }[];
    }[];
}

export default function HistoricalReportPage() {
    const { id } = useParams();
    const router = useRouter();
    const { language } = useQuizStore();
    const [report, setReport] = useState<ReportData | null>(null);
    const [loading, setLoading] = useState(true);

    const t = (key: string) => getTranslation(language, key);

    useEffect(() => {
        const fetchReport = async () => {
            const { data, error } = await supabase
                .from("sessions")
                .select(`
                    id, finished_at,
                    quiz:quizzes(title),
                    participants(
                        nickname,
                        scores(total_points)
                    )
                `)
                .eq("id", id)
                .single();

            if (!error && data) {
                setReport(data as unknown as ReportData);
            }
            setLoading(false);
        };

        fetchReport();
    }, [id]);

    if (loading) return <div className="min-h-screen flex items-center justify-center bg-slate-50"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>;
    if (!report) return <div className="min-h-screen flex items-center justify-center font-black text-slate-400 uppercase tracking-[0.2em]">{t('reports.not_found')}</div>;

    // Process scores for the leaderboard
    const results = report.participants
        .map(p => ({
            nickname: p.nickname,
            score: p.scores[0]?.total_points || 0
        }))
        .sort((a, b) => b.score - a.score);

    const avgScore = results.length > 0
        ? Math.round(results.reduce((acc, curr) => acc + curr.score, 0) / results.length)
        : 0;

    return (
        <div className="min-h-screen bg-slate-50 selection:bg-blue-100 italic-none">
            <nav className="bg-white/80 backdrop-blur-2xl border-b border-slate-200 px-6 py-4 flex items-center justify-between sticky top-0 z-10">
                <div className="flex items-center gap-4">
                    <button onClick={() => router.back()} className="p-3 hover:bg-slate-50 rounded-2xl text-slate-400 hover:text-slate-900 transition-all active:scale-95">
                        <ArrowLeft className="w-6 h-6" />
                    </button>
                    <div className="h-8 w-px bg-slate-100 hidden sm:block" />
                    <div className="flex flex-col">
                        <h1 className="font-black text-slate-900 text-lg leading-tight uppercase tracking-tighter">{t('reports.title')}</h1>
                        <span className="text-[10px] text-blue-500 font-black uppercase tracking-widest">{report.quiz.title}</span>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <LanguageSelector />
                </div>
            </nav>

            <main className="max-w-4xl mx-auto p-6 md:p-12 space-y-12">
                {/* Stats Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 sm:gap-8">
                    <div className="bg-white p-10 rounded-[2.5rem] shadow-sm border border-slate-100 space-y-3 hover:shadow-xl hover:shadow-blue-200/20 transition-all group">
                        <Users className="w-10 h-10 text-blue-500 group-hover:scale-110 transition-transform" />
                        <div>
                            <h3 className="text-4xl font-black text-slate-900">{results.length}</h3>
                            <p className="text-slate-400 font-black text-[10px] uppercase tracking-[0.2em]">{t('common.students')}</p>
                        </div>
                    </div>
                    <div className="bg-white p-10 rounded-[2.5rem] shadow-sm border border-slate-100 space-y-3 hover:shadow-xl hover:shadow-purple-200/20 transition-all group">
                        <Target className="w-10 h-10 text-purple-500 group-hover:scale-110 transition-transform" />
                        <div>
                            <h3 className="text-4xl font-black text-slate-900">{avgScore.toLocaleString()}</h3>
                            <p className="text-slate-400 font-black text-[10px] uppercase tracking-[0.2em]">{t('reports.avg_score')}</p>
                        </div>
                    </div>
                    <div className="bg-white p-10 rounded-[2.5rem] shadow-sm border border-slate-100 space-y-3 hover:shadow-xl hover:shadow-orange-200/20 transition-all group">
                        <Calendar className="w-10 h-10 text-orange-500 group-hover:scale-110 transition-transform" />
                        <div>
                            <h3 className="text-2xl font-black text-slate-900">
                                {new Date(report.finished_at).toLocaleDateString(language === 'es' ? 'es-ES' : 'en-US')}
                            </h3>
                            <p className="text-slate-400 font-black text-[10px] uppercase tracking-[0.2em]">{t('reports.finished_date')}</p>
                        </div>
                    </div>
                </div>

                {/* Detailed Analytics & Report */}
                <div className="space-y-16">
                    <div className="bg-white p-8 md:p-12 rounded-[3.5rem] shadow-sm border border-slate-100">
                        <SessionAnalytics sessionId={id as string} />
                    </div>

                    <div className="bg-white p-8 md:p-12 rounded-[3.5rem] shadow-sm border border-slate-100">
                        <SessionReport sessionId={id as string} />
                    </div>
                </div>

                <div className="text-center pt-8 pb-12">
                    <button
                        onClick={() => window.print()}
                        className="btn-premium !bg-slate-900 !text-white flex items-center gap-3 mx-auto !py-4 !px-8 text-sm"
                    >
                        <BarChart3 className="w-5 h-5 text-blue-400" />
                        {t('reports.print_button')}
                    </button>
                </div>
            </main>

            <style jsx global>{`
                @media print {
                    nav, button, .btn-premium { display: none !important; }
                    main { padding: 0 !important; max-width: 100% !important; }
                    .bg-slate-50 { background: white !important; }
                    .shadow-sm, .shadow-xl { shadow: none !important; border: 1px solid #eee !important; }
                    .rounded-[3.5rem], .rounded-[2.5rem] { border-radius: 1rem !important; }
                }
            `}</style>
        </div>
    );
}
