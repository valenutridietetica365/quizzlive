"use client";

import { Trash2, Check, ToggleLeft, ListChecks, Share2, Type } from "lucide-react";
import Image from "next/image";
import { Image as ImageIcon } from "lucide-react";
import { Question } from "@/lib/schemas";

interface QuestionCardProps {
    question: Question;
    index: number;
    t: (key: string) => string;
    onUpdate: (index: number, field: keyof Question, value: string | number | string[]) => void;
    onUpdateOption: (qIndex: number, oIndex: number, value: string) => void;
    onDelete: (index: number) => void;
}

export default function QuestionCard({ question: q, index: qIndex, t, onUpdate, onUpdateOption, onDelete }: QuestionCardProps) {
    return (
        <div className="bg-white rounded-[3rem] p-10 md:p-14 shadow-sm border border-slate-50 space-y-10 relative group hover:shadow-2xl hover:shadow-slate-200/50 transition-all duration-500">
            {/* Header: Number + Type Tabs + Delete */}
            <div className="flex justify-between items-center">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-slate-900 text-white flex items-center justify-center rounded-2xl font-black text-lg shadow-lg rotate-3 group-hover:rotate-0 transition-transform">
                        {qIndex + 1}
                    </div>
                    <div className="flex bg-slate-100 p-1.5 rounded-2xl overflow-x-auto no-scrollbar max-w-[200px] sm:max-w-none">
                        {([
                            { type: "multiple_choice", icon: ListChecks, label: t('editor.options_tab'), color: "text-blue-600" },
                            { type: "true_false", icon: ToggleLeft, label: t('editor.tf_tab'), color: "text-orange-600" },
                            { type: "fill_in_the_blank", icon: Type, label: t('editor.sentence_tab'), color: "text-emerald-600" },
                            { type: "matching", icon: Share2, label: t('editor.matching_tab'), color: "text-purple-600" },
                        ] as const).map(({ type, icon: Icon, label, color }) => (
                            <button
                                key={type}
                                onClick={() => onUpdate(qIndex, "question_type", type)}
                                className={`px-4 py-2 rounded-xl text-[10px] font-black transition-all flex items-center gap-2 whitespace-nowrap ${q.question_type === type ? `bg-white shadow-md ${color}` : "text-slate-400"}`}
                            >
                                <Icon className="w-4 h-4" /> {label}
                            </button>
                        ))}
                    </div>
                </div>
                <button onClick={() => onDelete(qIndex)} className="p-4 text-slate-200 hover:text-red-500 hover:bg-red-50 rounded-[1.5rem] transition-all"><Trash2 className="w-6 h-6" /></button>
            </div>

            {/* Question Text */}
            <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-300 uppercase tracking-widest ml-1">{t('editor.question_label')}</label>
                <textarea
                    placeholder={t('editor.question_placeholder')}
                    className="w-full text-2xl md:text-4xl font-black text-slate-900 border-none focus:ring-0 outline-none resize-none placeholder:text-slate-100 leading-tight"
                    rows={2}
                    value={q.question_text}
                    onChange={(e) => onUpdate(qIndex, "question_text", e.target.value)}
                />
            </div>

            {/* Image */}
            <div className="space-y-4">
                <div className="flex items-center gap-4 bg-slate-50 p-6 rounded-[2rem] border border-slate-100">
                    <ImageIcon className="w-6 h-6 text-slate-400" />
                    <input type="text" placeholder={t('editor.image_url_placeholder')} className="flex-1 bg-transparent border-none focus:ring-0 outline-none font-bold text-slate-700" value={q.image_url || ""} onChange={(e) => onUpdate(qIndex, "image_url", e.target.value)} />
                </div>
                {q.image_url && (
                    <div className="relative aspect-video rounded-[2rem] overflow-hidden border-4 border-white shadow-xl">
                        <Image src={q.image_url} alt="Preview" fill className="object-cover" unoptimized />
                        <button onClick={() => onUpdate(qIndex, "image_url", "")} className="absolute top-4 right-4 bg-black/60 text-white p-2 rounded-full"><Trash2 className="w-4 h-4" /></button>
                    </div>
                )}
            </div>

            {/* Answer Options */}
            <div className="space-y-4">
                {q.question_type === "multiple_choice" && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {q.options.map((option, oIndex) => (
                            <div key={oIndex} className={`flex items-center p-2 rounded-2xl border-4 ${q.correct_answer === option && option !== "" ? "border-emerald-500 bg-emerald-50" : "border-slate-50 bg-white"}`}>
                                <input type="text" placeholder={`${t('editor.options_tab').toLowerCase()} ${oIndex + 1}`} className="flex-1 bg-transparent border-none focus:ring-0 font-bold" value={option} onChange={(e) => onUpdateOption(qIndex, oIndex, e.target.value)} />
                                <button onClick={() => onUpdate(qIndex, "correct_answer", option)} className={`p-3 rounded-xl ${q.correct_answer === option && option !== "" ? "bg-emerald-500 text-white" : "text-slate-200"}`}>
                                    <Check className="w-6 h-6" />
                                </button>
                            </div>
                        ))}
                    </div>
                )}

                {q.question_type === "true_false" && (
                    <div className="grid grid-cols-2 gap-4">
                        {[t('editor.true_text'), t('editor.false_text')].map(val => (
                            <button key={val} onClick={() => onUpdate(qIndex, "correct_answer", val)} className={`py-8 rounded-3xl border-4 font-black text-xl ${q.correct_answer === val ? "border-emerald-500 bg-emerald-50 text-emerald-600" : "border-slate-50 text-slate-300"}`}>
                                {val}
                            </button>
                        ))}
                    </div>
                )}

                {q.question_type === "fill_in_the_blank" && (
                    <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100">
                        <input type="text" placeholder={t('editor.correct_answer_placeholder')} className="w-full bg-white p-4 rounded-xl border-none font-black text-xl" value={q.correct_answer || ""} onChange={(e) => onUpdate(qIndex, "correct_answer", e.target.value)} />
                    </div>
                )}

                {q.question_type === "matching" && (
                    <div className="space-y-3">
                        {q.options.map((pair, pIndex) => {
                            const [term, match] = pair.includes(":") ? pair.split(":") : [pair, ""];
                            return (
                                <div key={pIndex} className="flex gap-2">
                                    <div className="flex-1 flex gap-2 bg-slate-50 p-3 rounded-xl border">
                                        <input type="text" placeholder={t('editor.term_placeholder')} className="flex-1 bg-transparent border-none text-sm font-bold" value={term} onChange={(e) => { const opts = [...q.options]; opts[pIndex] = `${e.target.value}:${match}`; onUpdate(qIndex, "options", opts); }} />
                                        <div className="w-px bg-slate-200" />
                                        <input type="text" placeholder={t('editor.match_placeholder')} className="flex-1 bg-transparent border-none text-sm font-bold" value={match} onChange={(e) => { const opts = [...q.options]; opts[pIndex] = `${term}:${e.target.value}`; onUpdate(qIndex, "options", opts); }} />
                                    </div>
                                    <button onClick={() => onUpdate(qIndex, "options", q.options.filter((_, i) => i !== pIndex))} className="text-slate-300 hover:text-red-500"><Trash2 className="w-4 h-4" /></button>
                                </div>
                            );
                        })}
                        <button onClick={() => onUpdate(qIndex, "options", [...q.options, ":"])} className="w-full py-2 border-2 border-dashed rounded-xl text-slate-300 text-xs font-black">+ {t('editor.add_pair')}</button>
                    </div>
                )}
            </div>

            {/* Footer: Time Limit */}
            <div className="flex items-center justify-between pt-6 border-t">
                <div className="flex items-center gap-3 bg-slate-50 px-4 py-2 rounded-xl text-[10px] font-black uppercase text-slate-400">
                    {t('editor.time_limit')}
                    <select className="bg-transparent border-none p-0 text-slate-900" value={q.time_limit} onChange={(e) => onUpdate(qIndex, "time_limit", parseInt(e.target.value))}>
                        <option value={10}>10s</option>
                        <option value={20}>20s</option>
                        <option value={30}>30s</option>
                        <option value={60}>60s</option>
                    </select>
                </div>
                <span className="text-[10px] font-black text-slate-200 uppercase tracking-widest flex items-center gap-1"><Check className="w-3 h-3" /> {t('editor.auto_save')}</span>
            </div>
        </div>
    );
}
