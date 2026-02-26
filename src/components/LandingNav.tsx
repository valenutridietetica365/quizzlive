"use client";

import Link from "next/link";
import { Rocket, GraduationCap, Menu, X } from "lucide-react";
import LanguageSelector from "@/components/LanguageSelector";
import { useState, useEffect } from "react";
import { useQuizStore } from "@/lib/store";
import { getTranslation, Language } from "@/lib/i18n";

export default function LandingNav({ initialLang }: { initialLang: Language }) {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const { language, setLanguage } = useQuizStore();

    // Sync URL lang to Zustand on mount
    useEffect(() => {
        if (initialLang && initialLang !== language) {
            setLanguage(initialLang);
        }
    }, [initialLang, language, setLanguage]);

    // Use zustand language for client-side translations or fallback to initial
    const currentLang = language || initialLang;
    const t = (key: string) => getTranslation(currentLang, key);

    return (
        <nav className="fixed top-0 w-full z-[100] border-b border-slate-100 bg-white/80 backdrop-blur-xl">
            <div className="max-w-7xl mx-auto px-6 h-20 flex justify-between items-center">
                <div className="flex items-center gap-2">
                    <div className="w-10 h-10 bg-slate-900 rounded-xl flex items-center justify-center text-white">
                        <Rocket className="w-6 h-6 animate-float" />
                    </div>
                    <span className="text-2xl font-black text-slate-900 tracking-tighter">QuizzLive</span>
                </div>

                {/* Desktop Navigation */}
                <div className="hidden md:flex items-center gap-8 text-sm font-bold text-slate-500">
                    <a href="#features" className="hover:text-blue-600 transition-colors">{t('landing.features')}</a>

                    <div className="flex items-center gap-4">
                        <LanguageSelector />
                        <Link href="/teacher/login" className="px-6 py-2.5 bg-slate-900 text-white rounded-xl hover:bg-slate-800 transition-all active:scale-95 shadow-lg shadow-slate-200">
                            {t('landing.teacher_panel')}
                        </Link>
                    </div>
                </div>

                {/* Mobile Menu Toggle */}
                <div className="flex md:hidden items-center gap-3">
                    <LanguageSelector />
                    <button
                        onClick={() => setIsMenuOpen(!isMenuOpen)}
                        className="p-2 text-slate-900 bg-slate-50 rounded-xl active:scale-90 transition-transform"
                    >
                        {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
                    </button>
                </div>
            </div>

            {/* Mobile Menu Backdrop */}
            {isMenuOpen && (
                <div className="md:hidden fixed inset-0 top-20 bg-white z-50 animate-in fade-in slide-in-from-top-4">
                    <div className="flex flex-col p-6 gap-6">
                        <a
                            href="#features"
                            onClick={() => setIsMenuOpen(false)}
                            className="text-2xl font-black text-slate-900 border-b border-slate-50 pb-4"
                        >
                            {t('landing.features')}
                        </a>
                        <Link
                            href="/teacher/login"
                            className="w-full py-5 bg-slate-900 text-white rounded-2xl flex items-center justify-center gap-3 font-black text-lg shadow-xl shadow-slate-200"
                        >
                            <GraduationCap className="w-6 h-6" />
                            {t('landing.teacher_panel')}
                        </Link>
                    </div>
                </div>
            )}
        </nav>
    );
}
