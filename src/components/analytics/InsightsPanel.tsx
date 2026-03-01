"use client";

import { Target } from "lucide-react";
import { QuestionStat } from "@/components/SessionAnalytics";

interface InsightsPanelProps {
    data: QuestionStat[];
    t: (key: string) => string;
}

export default function InsightsPanel({ data, t }: InsightsPanelProps) {
    const questionsToReview = data.filter(q => q.percentage < 50);

    if (questionsToReview.length === 0) return null;

    return (
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
                {questionsToReview.map(q => (
                    <div key={q.fullName} className="bg-white/60 p-4 rounded-2xl border border-amber-100 flex items-center justify-between">
                        <span className="font-bold text-slate-700 truncate mr-4">{q.fullName}</span>
                        <span className="bg-amber-100 text-amber-600 px-3 py-1 rounded-full text-xs font-black">{q.percentage}%</span>
                    </div>
                ))}
            </div>
        </div>
    );
}
