import { Target, HelpCircle, AlertCircle } from "lucide-react";
import { QuestionStat } from "@/components/SessionAnalytics";
import { HeatmapRow } from "./HeatmapTable";

interface InsightsPanelProps {
    data: QuestionStat[];
    heatmapRows: HeatmapRow[];
}

export default function InsightsPanel({ data, heatmapRows }: InsightsPanelProps) {
    // 1. Identify critical questions (success < 50%)
    const criticalQuestions = data.filter(q => q.percentage < 50);

    // 2. Identify "Trick Questions" (Failed by top performers)
    // Get Top 30% of students by grade
    const sortedStudents = [...heatmapRows].sort((a, b) => (b.grade || 0) - (a.grade || 0));
    const topPerformers = sortedStudents.slice(0, Math.ceil(heatmapRows.length * 0.3));
    
    const trickQuestions = data.filter(q => {
        if (q.percentage > 80) return false; // Too easy to be a trick
        
        // Count how many top performers failed this specific question
        const failedByTop = topPerformers.filter(p => !p.answers[q.fullName] && p.answers[q.fullName] !== undefined).length;
        // If more than 40% of top performers failed it, it's a trick question
        return topPerformers.length > 0 && (failedByTop / topPerformers.length) >= 0.4;
    });

    if (criticalQuestions.length === 0 && trickQuestions.length === 0) return (
        <div className="bg-emerald-500/10 border-2 border-emerald-500/20 p-8 rounded-[3rem] flex items-center gap-6 animate-in zoom-in duration-500">
            <div className="bg-emerald-500 p-4 rounded-3xl text-white shadow-xl shadow-emerald-500/20">
                <Target className="w-8 h-8" />
            </div>
            <div>
                <h3 className="text-xl font-black text-emerald-400 uppercase tracking-tight">¡Clase Excelente!</h3>
                <p className="text-sm font-bold text-emerald-500/60 uppercase tracking-widest">No se detectaron brechas críticas de aprendizaje.</p>
            </div>
        </div>
    );

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Critical Questions */}
            {criticalQuestions.length > 0 && (
                <div className="bg-rose-500/5 border-2 border-rose-500/10 p-8 rounded-[3rem] space-y-4">
                    <div className="flex items-center gap-4 text-rose-500">
                        <div className="bg-rose-500 p-3 rounded-2xl text-white shadow-lg shadow-rose-500/20">
                            <AlertCircle className="w-6 h-6" />
                        </div>
                        <div>
                            <h3 className="text-xl font-black uppercase tracking-tight">Brechas Críticas</h3>
                            <p className="text-[10px] font-black opacity-60 uppercase tracking-widest text-rose-400">Temas que requieren refuerzo urgente</p>
                        </div>
                    </div>
                    <div className="space-y-2">
                        {criticalQuestions.slice(0, 3).map(q => (
                            <div key={q.fullName} className="bg-white/5 p-4 rounded-2xl border border-white/5 flex items-center justify-between group hover:bg-white/10 transition-all">
                                <span className="font-bold text-slate-300 truncate mr-4 text-xs">{q.fullName}</span>
                                <span className="bg-rose-500/20 text-rose-400 px-3 py-1 rounded-full text-[10px] font-black">{q.percentage}% Éxito</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Trick Questions */}
            {trickQuestions.length > 0 && (
                <div className="bg-amber-500/5 border-2 border-amber-500/10 p-8 rounded-[3rem] space-y-4">
                    <div className="flex items-center gap-4 text-amber-500">
                        <div className="bg-amber-500 p-3 rounded-2xl text-white shadow-lg shadow-amber-500/20">
                            <HelpCircle className="w-6 h-6" />
                        </div>
                        <div>
                            <h3 className="text-xl font-black uppercase tracking-tight">Preguntas &quot;Trampa&quot;</h3>
                            <p className="text-[10px] font-black opacity-60 uppercase tracking-widest text-amber-400">Confundieron incluso a los mejores</p>
                        </div>
                    </div>
                    <div className="space-y-2">
                        {trickQuestions.slice(0, 3).map(q => (
                            <div key={q.fullName} className="bg-white/5 p-4 rounded-2xl border border-white/5 flex items-center justify-between group hover:bg-white/10 transition-all">
                                <span className="font-bold text-slate-300 truncate mr-4 text-xs">{q.fullName}</span>
                                <div className="flex flex-col items-end">
                                    <span className="text-[9px] font-black text-amber-500/60 uppercase tracking-tighter">Falla elite</span>
                                    <span className="text-amber-400 text-[10px] font-black">Revisar redacción</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
