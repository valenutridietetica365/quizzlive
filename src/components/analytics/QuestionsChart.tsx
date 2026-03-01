"use client";

import { TrendingUp } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { QuestionStat } from "@/components/SessionAnalytics";

interface QuestionsChartProps {
    data: QuestionStat[];
    t: (key: string) => string;
}

export default function QuestionsChart({ data, t }: QuestionsChartProps) {
    return (
        <div className="bg-slate-900/50 p-8 rounded-[3rem] border border-white/5 shadow-2xl">
            <h3 className="text-xl font-black mb-8 flex items-center gap-3">
                <TrendingUp className="w-6 h-6 text-blue-500" />
                {t('analytics.success_by_question')}
            </h3>
            <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                        <XAxis
                            dataKey="name"
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: '#64748b', fontWeight: 'bold', fontSize: 12 }}
                        />
                        <YAxis
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: '#64748b', fontWeight: 'bold' }}
                            domain={[0, 100]}
                        />
                        <Tooltip
                            cursor={{ fill: '#1e293b' }}
                            contentStyle={{ backgroundColor: '#0f172a', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.1)', padding: '12px' }}
                            itemStyle={{ color: '#fff', fontWeight: 'bold' }}
                        />
                        <Bar dataKey="percentage" radius={[8, 8, 0, 0]}>
                            {data.map((entry, index) => (
                                <Cell
                                    key={`cell-${index}`}
                                    fill={entry.percentage > 70 ? '#10b981' : entry.percentage > 40 ? '#3b82f6' : '#ef4444'}
                                />
                            ))}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}
