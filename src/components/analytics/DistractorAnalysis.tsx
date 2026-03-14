"use client";

import React, { useState } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";
import { AlertTriangle, ChevronLeft, ChevronRight } from "lucide-react";
import { QuestionStat } from "@/components/SessionAnalytics";

interface DistractorAnalysisProps {
    data: QuestionStat[];
}

export default function DistractorAnalysis({ data }: DistractorAnalysisProps) {
    const [currentIndex, setCurrentIndex] = useState(0);

    // Only show questions with errors
    const questionsWithErrors = data.filter(q => Object.keys(q.distractors).length > 0);

    if (questionsWithErrors.length === 0) return null;

    const currentQuestion = questionsWithErrors[currentIndex];
    
    // Format data for Recharts PieChart
    const pieData = Object.entries(currentQuestion.distractors)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value);

    const COLORS = ['#ef4444', '#f59e0b', '#ec4899', '#8b5cf6', '#6366f1'];

    return (
        <div className="bg-slate-900/50 p-8 rounded-[3rem] border border-white/5 shadow-2xl space-y-6">
            <div className="flex items-center justify-between">
                <h3 className="text-xl font-black flex items-center gap-3">
                    <AlertTriangle className="w-6 h-6 text-amber-500" />
                    Análisis de Distractores
                </h3>
                <div className="flex gap-2">
                    <button 
                        onClick={() => setCurrentIndex(prev => Math.max(0, prev - 1))}
                        disabled={currentIndex === 0}
                        className="p-2 bg-white/5 rounded-xl hover:bg-white/10 disabled:opacity-30 transition-all font-black"
                    >
                        <ChevronLeft className="w-5 h-5" />
                    </button>
                    <span className="text-xs font-black self-center tabular-nums bg-white/10 px-3 py-1 rounded-full text-slate-400 uppercase tracking-widest">
                        {currentIndex + 1} / {questionsWithErrors.length}
                    </span>
                    <button 
                        onClick={() => setCurrentIndex(prev => Math.min(questionsWithErrors.length - 1, prev + 1))}
                        disabled={currentIndex === questionsWithErrors.length - 1}
                        className="p-2 bg-white/5 rounded-xl hover:bg-white/10 disabled:opacity-30 transition-all font-black"
                    >
                        <ChevronRight className="w-5 h-5" />
                    </button>
                </div>
            </div>

            <div className="space-y-4">
                <p className="text-sm font-bold text-slate-400 uppercase tracking-widest leading-relaxed line-clamp-2 min-h-[40px]">
                    {currentQuestion.fullName}
                </p>

                <div className="h-[220px] w-full relative">
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={pieData}
                                cx="50%"
                                cy="50%"
                                innerRadius={60}
                                outerRadius={80}
                                paddingAngle={5}
                                dataKey="value"
                                animationDuration={800}
                            >
                                {pieData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                            </Pie>
                            <Tooltip 
                                contentStyle={{ backgroundColor: '#0f172a', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.1)', padding: '12px' }}
                                itemStyle={{ color: '#fff', fontWeight: 'bold' }}
                            />
                            <Legend 
                                iconType="circle" 
                                verticalAlign="bottom" 
                                align="center"
                                wrapperStyle={{ paddingTop: '20px', fontSize: '10px', color: '#64748b', fontWeight: 'bold', textTransform: 'uppercase' }}
                            />
                        </PieChart>
                    </ResponsiveContainer>
                    
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <div className="text-center">
                            <span className="block text-2xl font-black text-rose-500">
                                {pieData.reduce((a, b) => a + b.value, 0)}
                            </span>
                            <span className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Errores</span>
                        </div>
                    </div>
                </div>

                <div className="bg-rose-500/5 border border-rose-500/10 p-4 rounded-2xl">
                    <p className="text-[10px] font-black text-rose-400 uppercase tracking-[0.2em] mb-2">Opción más confusa:</p>
                    <div className="flex justify-between items-center">
                        <span className="font-black text-white text-sm truncate mr-4">{pieData[0]?.name}</span>
                        <span className="bg-rose-500 text-white px-2 py-0.5 rounded text-[10px] font-black">
                            {Math.round((pieData[0]?.value / currentQuestion.total) * 100)}% de la clase
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
}
