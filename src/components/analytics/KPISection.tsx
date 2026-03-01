"use client";

import { Target, Users, TrendingUp } from "lucide-react";

interface KPISectionProps {
    avgSuccess: number;
    totalParticipants: number;
    bestQuestionName: string;
    t: (key: string) => string;
}

export default function KPISection({ avgSuccess, totalParticipants, bestQuestionName, t }: KPISectionProps) {
    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-slate-900/50 p-6 rounded-3xl border border-white/5 space-y-2">
                <div className="flex items-center gap-3 text-blue-400">
                    <Target className="w-5 h-5" />
                    <span className="text-xs font-black uppercase tracking-widest">{t('analytics.avg_success')}</span>
                </div>
                <p className="text-4xl font-black">{avgSuccess}%</p>
            </div>
            <div className="bg-slate-900/50 p-6 rounded-3xl border border-white/5 space-y-2">
                <div className="flex items-center gap-3 text-emerald-400">
                    <Users className="w-5 h-5" />
                    <span className="text-xs font-black uppercase tracking-widest">{t('analytics.participation')}</span>
                </div>
                <p className="text-4xl font-black">{totalParticipants}</p>
            </div>
            <div className="bg-slate-900/50 p-6 rounded-3xl border border-white/5 space-y-2">
                <div className="flex items-center gap-3 text-amber-400">
                    <TrendingUp className="w-5 h-5" />
                    <span className="text-xs font-black uppercase tracking-widest">{t('analytics.best_question')}</span>
                </div>
                <p className="text-xl font-black truncate">{bestQuestionName}</p>
            </div>
        </div>
    );
}
