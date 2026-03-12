import React from 'react';
import { Target, Sparkles } from 'lucide-react';
import { ReportQuestion } from '@/lib/reports';
import AIInsightModal from './AIInsightModal';

export interface HeatmapRow {
    participantId: string;
    studentName: string;
    totalScore: number;
    pedagogicalScore?: number;
    grade?: number;
    answers: Record<string, boolean | null>;
    selectedAnswers: Record<string, string>;
}

interface HeatmapTableProps {
    rows: HeatmapRow[];
    questions: ReportQuestion[];
    useGrading: boolean;
    exigency: number;
    t: (key: string) => string;
    onToggleGrading: () => void;
    onSetExigency: (exigency: number) => void;
    quizTitle?: string;
}

const HeatmapTable: React.FC<HeatmapTableProps> = ({
    rows,
    questions,
    useGrading,
    exigency,
    t,
    onToggleGrading,
    onSetExigency,
    quizTitle = "Quiz"
}) => {
    const [isAIModalOpen, setIsAIModalOpen] = React.useState(false);
    if (rows.length === 0 || questions.length === 0) return null;

    return (
        <div className="bg-slate-900/50 p-6 md:p-8 rounded-[3rem] border border-white/5 shadow-2xl mt-8 animate-in fade-in slide-in-from-bottom-6 duration-1000 delay-300">
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
                <div className="space-y-1">
                    <h3 className="text-xl font-black flex items-center gap-3 text-white">
                        <Target className="w-6 h-6 text-purple-500" /> {t('analytics.heatmap_title') || "Matriz de Resultados Oficiales"}
                    </h3>
                    <div className="flex items-center gap-4">
                        <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">{t('analytics.heatmap_subtitle') || "Calificaciones y rendimiento por alumno"}</p>
                        <div className="h-4 w-px bg-slate-800" />
                        <button 
                            onClick={onToggleGrading}
                            className={`text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full border transition-all ${useGrading ? "bg-blue-600 border-blue-500 text-white" : "bg-slate-800 border-slate-700 text-slate-400"}`}
                        >
                            {useGrading ? t('analytics.grading') + " " + t('common.active') : t('analytics.grading_title')}
                        </button>
                        {useGrading && (
                            <div className="flex items-center gap-2 bg-slate-800 p-1 rounded-lg border border-white/5">
                                <button onClick={() => onSetExigency(0.5)} className={`px-2 py-0.5 rounded text-[10px] font-black ${exigency === 0.5 ? "bg-blue-500 text-white" : "text-slate-500 hover:text-slate-300"}`}>50%</button>
                                <button onClick={() => onSetExigency(0.6)} className={`px-2 py-0.5 rounded text-[10px] font-black ${exigency === 0.6 ? "bg-blue-500 text-white" : "text-slate-500 hover:text-slate-300"}`}>60%</button>
                            </div>
                        )}
                    </div>
                </div>
                <div className="flex gap-4 text-xs font-bold uppercase tracking-widest text-slate-400 bg-slate-900/80 p-3 rounded-2xl border border-white/5">
                    <span className="flex items-center gap-2"><div className="w-3 h-3 bg-emerald-500 shadow-lg shadow-emerald-500/20 rounded-sm"></div> {t('common.correct') || "Correcto"}</span>
                    <span className="flex items-center gap-2"><div className="w-3 h-3 bg-rose-500 shadow-lg shadow-rose-500/20 rounded-sm"></div> {t('common.incorrect') || "Falso"}</span>
                    <span className="flex items-center gap-2"><div className="w-3 h-3 bg-slate-800 border border-slate-700 rounded-sm"></div> {t('common.empty') || "Vacio"}</span>
                </div>
                
                <button 
                    onClick={() => setIsAIModalOpen(true)}
                    className="flex items-center gap-2 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white px-5 py-2.5 rounded-2xl text-xs font-black transition-all active:scale-95 shadow-lg shadow-purple-500/20 group"
                >
                    <Sparkles className="w-4 h-4 group-hover:animate-pulse" />
                    {t('analytics.ai_insight')}
                </button>
            </div>

            <AIInsightModal 
                isOpen={isAIModalOpen} 
                onClose={() => setIsAIModalOpen(false)}
                quizTitle={quizTitle}
                questions={questions}
                heatmapData={rows}
                t={t}
            />

            <div className="overflow-x-auto pb-4 custom-scrollbar">
                <div className="min-w-max bg-slate-900/30 rounded-[2rem] border border-white/5 p-2 md:p-4">
                    <div className="flex mb-2">
                        <div className="w-48 flex-shrink-0 p-3 text-slate-400 font-black text-[10px] uppercase tracking-[0.2em] sticky left-0 bg-slate-900/90 backdrop-blur-md rounded-xl z-20">
                            {t('common.student')}
                        </div>
                        {useGrading && (
                            <div className="w-20 md:w-24 flex-shrink-0 p-3 text-center text-blue-400 font-black text-[10px] uppercase tracking-widest">{t('analytics.grade')}</div>
                        )}
                        <div className="w-20 md:w-24 flex-shrink-0 p-3 text-center text-amber-500 font-black text-[10px] uppercase tracking-widest">{t('session.table_score')}</div>
                        {questions.map((q, idx) => (
                            <div key={q.id} className="w-20 md:w-24 flex-shrink-0 p-3 text-center text-slate-400 font-bold text-xs truncate" title={q.question_text}>Q{idx + 1}</div>
                        ))}
                    </div>
                    <div className="space-y-2">
                        {rows.map(row => (
                            <div key={row.participantId} className="flex group hover:bg-slate-800/30 rounded-2xl transition-all">
                                <div className="w-48 flex-shrink-0 p-3 font-black text-slate-200 text-sm truncate sticky left-0 bg-slate-900/95 backdrop-blur-md group-hover:bg-slate-800 rounded-xl z-10 transition-colors shadow-[4px_0_24px_rgba(0,0,0,0.2)]" title={row.studentName}>
                                    <div className="flex items-center gap-3">
                                        <div className="w-6 h-6 rounded-full bg-slate-800 flex items-center justify-center text-[10px] text-slate-400 border border-slate-700">{row.studentName.charAt(0).toUpperCase()}</div>
                                        <span className="truncate">{row.studentName}</span>
                                    </div>
                                </div>
                                {useGrading && (
                                    <div className="w-20 md:w-24 flex-shrink-0 p-3 text-center flex items-center justify-center">
                                        <span className={`text-sm font-black px-3 py-1 rounded-lg ${row.grade! >= 4.0 ? 'bg-blue-500/20 text-blue-400' : 'bg-rose-500/20 text-rose-400'}`}>{row.grade?.toFixed(1)}</span>
                                    </div>
                                )}
                                <div className="w-20 md:w-24 flex-shrink-0 p-3 text-center flex items-center justify-center">
                                    <span className="text-xs font-bold text-slate-400">{row.totalScore.toLocaleString()}</span>
                                </div>
                                {questions.map(q => {
                                    const isCorrect = row.answers[q.id];
                                    return (
                                        <div key={q.id} className="w-20 md:w-24 flex-shrink-0 p-1.5 md:p-2">
                                            <div className={`w-full h-10 md:h-12 rounded-xl flex items-center justify-center transition-all duration-300 ${isCorrect === true ? 'bg-emerald-500/10 border border-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.1)] group-hover:bg-emerald-500/20' : isCorrect === false ? 'bg-rose-500/10 border border-rose-500/30 shadow-[0_0_15px_rgba(244,63,94,0.1)] group-hover:bg-rose-500/20' : 'bg-slate-800/50 border border-slate-700/50'}`} title={`${row.studentName} - ${q.question_text}: ${isCorrect === true ? t('common.correct') : isCorrect === false ? t('common.incorrect') : t('common.not_answered')}`}>
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
    );
};

export default React.memo(HeatmapTable);
