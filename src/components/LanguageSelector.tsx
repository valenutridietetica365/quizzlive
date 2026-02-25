"use client";

import { useQuizStore } from "@/lib/store";
import { Globe } from "lucide-react";

export default function LanguageSelector() {
    const { language, setLanguage } = useQuizStore();

    return (
        <div className="flex items-center gap-2 bg-slate-900/50 backdrop-blur-xl px-4 py-2 rounded-2xl border border-white/10 group hover:border-blue-500/50 transition-all duration-300">
            <Globe className="w-4 h-4 text-slate-400 group-hover:text-blue-400" />
            <select
                value={language}
                onChange={(e) => setLanguage(e.target.value as any)}
                className="bg-transparent text-xs font-black text-slate-400 uppercase tracking-widest outline-none cursor-pointer hover:text-white transition-colors"
            >
                <option value="es" className="bg-slate-900 text-white">Español</option>
                <option value="en" className="bg-slate-900 text-white">English</option>
            </select>
        </div>
    );
}
