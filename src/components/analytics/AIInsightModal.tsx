import React, { useState, useCallback } from 'react';
import { Sparkles, X, Loader2, AlertCircle } from 'lucide-react';
import { ReportQuestion } from '@/lib/reports';
import { HeatmapRow } from './HeatmapTable';

interface AIInsightModalProps {
    isOpen: boolean;
    onClose: () => void;
    quizTitle: string;
    questions: ReportQuestion[];
    heatmapData: HeatmapRow[];
    t: (key: string) => string;
}

const AIInsightModal: React.FC<AIInsightModalProps> = ({
    isOpen,
    onClose,
    quizTitle,
    questions,
    heatmapData,
    t
}) => {
    const [analysis, setAnalysis] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const generateAnalysis = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await fetch('/api/ai/analyze', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    quizTitle,
                    questions,
                    heatmapData
                })
            });
 
            const data = await response.json();
            if (!response.ok) throw new Error(data.details || data.error);
 
            setAnalysis(data.analysis);
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : String(err));
        } finally {
            setLoading(false);
        }
    }, [quizTitle, questions, heatmapData]);

    React.useEffect(() => {
        if (isOpen && !analysis && !loading) {
            generateAnalysis();
        }
    }, [isOpen, analysis, loading, generateAnalysis]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="bg-slate-900 border border-white/10 w-full max-w-2xl rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                {/* Header */}
                <div className="p-6 border-b border-white/5 flex items-center justify-between bg-gradient-to-r from-purple-500/10 to-blue-500/10">
                    <div className="flex items-center gap-3">
                        <div className="bg-purple-500/20 p-2 rounded-xl">
                            <Sparkles className="w-5 h-5 text-purple-400" />
                        </div>
                        <h3 className="text-xl font-black text-white">{t('analytics.ai_report_title')}</h3>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full transition-colors text-slate-400">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-8 overflow-y-auto custom-scrollbar flex-1 bg-slate-900/50">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-20 gap-4">
                            <div className="relative">
                                <Loader2 className="w-12 h-12 text-purple-500 animate-spin" />
                                <Sparkles className="w-6 h-6 text-blue-400 absolute -top-2 -right-2 animate-pulse" />
                            </div>
                            <p className="text-slate-400 font-black uppercase tracking-widest text-sm animate-pulse">
                                {t('analytics.ai_analyzing')}
                            </p>
                        </div>
                    ) : error ? (
                        <div className="flex flex-col items-center justify-center py-12 gap-4 text-center">
                            <div className="bg-rose-500/10 p-4 rounded-full">
                                <AlertCircle className="w-8 h-8 text-rose-500" />
                            </div>
                            <div>
                                <h4 className="text-white font-black text-lg">{t('analytics.ai_error')}</h4>
                                <p className="text-slate-500 text-sm mt-1">{error}</p>
                            </div>
                            <button 
                                onClick={generateAnalysis}
                                className="mt-4 px-6 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-sm font-black transition-all"
                            >
                                Reintentar
                            </button>
                        </div>
                    ) : analysis ? (
                        <div className="prose prose-invert max-w-none">
                            <div className="bg-white/5 p-6 rounded-[2rem] border border-white/5">
                                {analysis.split('\n').map((line, i) => {
                                    if (line.startsWith('# ')) return <h1 key={i} className="text-2xl font-black text-white mt-6 mb-4">{line.replace('# ', '')}</h1>;
                                    if (line.startsWith('## ')) return <h2 key={i} className="text-xl font-black text-white mt-6 mb-3">{line.replace('## ', '')}</h2>;
                                    if (line.startsWith('### ')) return <h3 key={i} className="text-lg font-black text-white mt-4 mb-2">{line.replace('### ', '')}</h3>;
                                    if (line.trim().startsWith('- ') || line.trim().startsWith('* ')) {
                                        return <div key={i} className="flex gap-3 mb-2 text-slate-300">
                                            <div className="w-1.5 h-1.5 rounded-full bg-purple-500 mt-2 shrink-0" />
                                            <span>{line.replace(/^[-*]\s*/, '')}</span>
                                        </div>;
                                    }
                                    if (line.trim() === '') return <div key={i} className="h-4" />;
                                    return <p key={i} className="text-slate-300 mb-3 leading-relaxed">{line}</p>;
                                })}
                            </div>
                        </div>
                    ) : null}
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-white/5 bg-slate-900 flex justify-end">
                    <button 
                        onClick={onClose}
                        className="px-6 py-2 bg-slate-800 hover:bg-white/10 text-white rounded-xl text-sm font-black transition-all"
                    >
                        {t('common.back')}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AIInsightModal;
