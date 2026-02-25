"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { ArrowLeft, Trophy, Users, BarChart3, Loader2, Calendar, Target } from "lucide-react";

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

export default function SessionReport() {
    const { id } = useParams();
    const router = useRouter();
    const [report, setReport] = useState<ReportData | null>(null);
    const [loading, setLoading] = useState(true);

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
    if (!report) return <div className="min-h-screen flex items-center justify-center">Informe no encontrado</div>;

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
        <div className="min-h-screen bg-slate-50">
            <nav className="bg-white border-b border-slate-200 px-6 py-4 flex items-center gap-4 sticky top-0 z-10">
                <button onClick={() => router.back()} className="p-2 hover:bg-slate-100 rounded-lg text-slate-500 transition-all">
                    <ArrowLeft className="w-5 h-5" />
                </button>
                <div className="flex flex-col">
                    <h1 className="font-black text-slate-900 text-lg leading-tight">Informe de Sesión</h1>
                    <span className="text-xs text-slate-400 font-bold uppercase tracking-widest">{report.quiz.title}</span>
                </div>
            </nav>

            <main className="max-w-4xl mx-auto p-6 space-y-8">
                {/* Stats Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                    <div className="bg-white p-8 rounded-[2rem] shadow-sm border border-slate-100 space-y-2">
                        <Users className="w-8 h-8 text-blue-500" />
                        <h3 className="text-3xl font-black text-slate-900">{results.length}</h3>
                        <p className="text-slate-400 font-bold text-xs uppercase tracking-wider">Participantes</p>
                    </div>
                    <div className="bg-white p-8 rounded-[2rem] shadow-sm border border-slate-100 space-y-2">
                        <Target className="w-8 h-8 text-purple-500" />
                        <h3 className="text-3xl font-black text-slate-900">{avgScore}</h3>
                        <p className="text-slate-400 font-bold text-xs uppercase tracking-wider">Puntaje Promedio</p>
                    </div>
                    <div className="bg-white p-8 rounded-[2rem] shadow-sm border border-slate-100 space-y-2">
                        <Calendar className="w-8 h-8 text-orange-500" />
                        <h3 className="text-xl font-black text-slate-900">
                            {new Date(report.finished_at).toLocaleDateString()}
                        </h3>
                        <p className="text-slate-400 font-bold text-xs uppercase tracking-wider">Fecha Finalizado</p>
                    </div>
                </div>

                {/* Leaderboard */}
                <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden">
                    <div className="px-10 py-8 border-b border-slate-50 flex items-center justify-between">
                        <h2 className="text-2xl font-black text-slate-900 flex items-center gap-3">
                            <Trophy className="w-7 h-7 text-yellow-500" />
                            Podio de Alumnos
                        </h2>
                    </div>

                    <div className="divide-y divide-slate-50">
                        {results.length === 0 ? (
                            <div className="p-20 text-center text-slate-400 font-medium">Nadie participó en esta sesión</div>
                        ) : (
                            results.map((res, i) => (
                                <div key={i} className="px-10 py-6 flex items-center justify-between group hover:bg-slate-50 transition-colors">
                                    <div className="flex items-center gap-6">
                                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-lg ${i === 0 ? "bg-yellow-100 text-yellow-600" :
                                            i === 1 ? "bg-slate-100 text-slate-500" :
                                                i === 2 ? "bg-orange-100 text-orange-600" :
                                                    "bg-white text-slate-300"
                                            }`}>
                                            {i + 1}
                                        </div>
                                        <span className="text-xl font-bold text-slate-900">{res.nickname}</span>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-2xl font-black text-slate-900">{res.score.toLocaleString()}</div>
                                        <div className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Puntos Totales</div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                <div className="text-center pt-8">
                    <button
                        onClick={() => window.print()}
                        className="text-slate-400 font-bold hover:text-slate-600 transition-colors flex items-center gap-2 mx-auto"
                    >
                        <BarChart3 className="w-4 h-4" />
                        Imprimir Resultados
                    </button>
                </div>
            </main>
        </div>
    );
}
