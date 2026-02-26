"use client";

import { useMemo } from 'react';
import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer
} from 'recharts';

interface PerformanceChartProps {
    data: {
        date: string;
        participation: number;
    }[];
    label: string;
    t: (key: string) => string;
}

export default function PerformanceChart({ data, label, t }: PerformanceChartProps) {
    const chartData = useMemo(() => data, [data]);

    return (
        <div className="w-full h-[300px] bg-white p-4 rounded-2xl border border-slate-50">
            <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                        <linearGradient id="colorParticipation" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2} />
                            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                        </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.05)" />
                    <XAxis
                        dataKey="date"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: '#64748b', fontSize: 12 }}
                        dy={10}
                    />
                    <YAxis
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: '#64748b', fontSize: 12 }}
                        allowDecimals={false}
                    />
                    <Tooltip
                        contentStyle={{
                            backgroundColor: '#1e293b',
                            borderRadius: '8px',
                            border: 'none',
                            color: '#fff',
                            fontWeight: 'bold'
                        }}
                        itemStyle={{ color: '#fff' }}
                        // @ts-expect-error - Recharts formatter types are too strict for generic numbers
                        formatter={(value: number) => [value, t('dashboard.participants_label') || 'Participantes']}
                        labelStyle={{ color: '#94a3b8', marginBottom: '4px' }}
                    />
                    <Area
                        type="monotone"
                        dataKey="participation"
                        name={label}
                        stroke="#3b82f6"
                        strokeWidth={2}
                        fillOpacity={1}
                        fill="url(#colorParticipation)"
                        activeDot={{ r: 6, strokeWidth: 0, fill: '#3b82f6' }}
                    />
                </AreaChart>
            </ResponsiveContainer>
        </div>
    );
}
