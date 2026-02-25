"use client";

import Link from "next/link";
import { Play, Rocket, BookOpen, GraduationCap, ArrowRight, Zap, Shield, Sparkles } from "lucide-react";
import { useQuizStore } from "@/lib/store";
import { getTranslation } from "@/lib/i18n";
import LanguageSelector from "@/components/LanguageSelector";

export default function Home() {
    const { language } = useQuizStore();
    const t = (key: string) => getTranslation(language, key);

    return (
        <div className="min-h-screen bg-white selection:bg-blue-100 italic-none">
            {/* Navigation */}
            <nav className="fixed top-0 w-full z-50 border-b border-slate-100 bg-white/80 backdrop-blur-xl">
                <div className="max-w-7xl mx-auto px-6 h-20 flex justify-between items-center">
                    <div className="flex items-center gap-2">
                        <div className="w-10 h-10 bg-slate-900 rounded-xl flex items-center justify-center text-white">
                            <Rocket className="w-6 h-6 animate-float" />
                        </div>
                        <span className="text-2xl font-black text-slate-900 tracking-tighter">QuizzLive</span>
                    </div>

                    <div className="hidden md:flex items-center gap-8 text-sm font-bold text-slate-500">
                        <a href="#features" className="hover:text-blue-600 transition-colors">{t('landing.features')}</a>
                        <a href="#how-it-works" className="hover:text-blue-600 transition-colors">{t('landing.how_it_works')}</a>

                        <div className="flex items-center gap-4">
                            <LanguageSelector />
                            <Link href="/teacher/login" className="px-6 py-2.5 bg-slate-900 text-white rounded-xl hover:bg-slate-800 transition-all active:scale-95 shadow-lg shadow-slate-200">
                                {t('landing.teacher_panel')}
                            </Link>
                        </div>
                    </div>

                    {/* Mobile version could have a minimal language selector too, 
                        but keeping it simple for now as requested by "professionalize" 
                        but not overengineering unless necessary */}
                </div>
            </nav>

            {/* Hero Section */}
            <section className="pt-48 pb-32 px-6 relative overflow-hidden">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[600px] bg-gradient-to-b from-blue-50/50 to-transparent -z-10" />

                <div className="max-w-5xl mx-auto text-center space-y-8 relative">
                    <div className="inline-flex items-center gap-2 bg-blue-50 text-blue-600 px-4 py-2 rounded-full text-xs font-black uppercase tracking-widest animate-in fade-in slide-in-from-top-4 duration-700">
                        <Sparkles className="w-4 h-4" />
                        {t('landing.hero_badge')}
                    </div>

                    <h1 className="text-6xl md:text-8xl font-black text-slate-900 tracking-tighter leading-[1] transition-all animate-in fade-in slide-in-from-bottom-8 duration-1000">
                        {t('landing.hero_title_1')} <br />
                        <span className="text-blue-600">{t('landing.hero_title_2')}</span>
                    </h1>

                    <p className="max-w-2xl mx-auto text-xl text-slate-500 font-medium leading-relaxed animate-in fade-in duration-1000 delay-300">
                        {t('landing.hero_subtitle')}
                    </p>

                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-6 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-500">
                        <Link
                            href="/join"
                            className="group w-full sm:w-auto px-10 py-5 bg-blue-600 text-white rounded-[2rem] font-black text-lg hover:bg-blue-700 transition-all hover:shadow-2xl hover:shadow-blue-200 active:scale-95 flex items-center justify-center gap-2"
                        >
                            <Play className="w-6 h-6 fill-white" />
                            {t('landing.student_button')}
                        </Link>

                        <Link
                            href="/teacher/login"
                            className="group w-full sm:w-auto px-10 py-5 bg-white text-slate-900 border-2 border-slate-100 rounded-[2rem] font-black text-lg hover:border-blue-100 hover:bg-slate-50 transition-all active:scale-95 flex items-center justify-center gap-2"
                        >
                            <GraduationCap className="w-6 h-6" />
                            {t('landing.teacher_button')}
                            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                        </Link>
                    </div>
                </div>
            </section>

            {/* Stats/Social Proof */}
            <section className="py-20 border-y border-slate-50" id="features">
                <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-3 gap-12">
                    <div className="flex flex-col items-center text-center space-y-4">
                        <div className="w-14 h-14 bg-orange-100 text-orange-600 rounded-2xl flex items-center justify-center">
                            <Zap className="w-7 h-7" />
                        </div>
                        <h3 className="text-xl font-black">{t('landing.feature_1_title')}</h3>
                        <p className="text-slate-500 font-medium">{t('landing.feature_1_desc')}</p>
                    </div>
                    <div className="flex flex-col items-center text-center space-y-4">
                        <div className="w-14 h-14 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center">
                            <Shield className="w-7 h-7" />
                        </div>
                        <h3 className="text-xl font-black">{t('landing.feature_2_title')}</h3>
                        <p className="text-slate-500 font-medium">{t('landing.feature_2_desc')}</p>
                    </div>
                    <div className="flex flex-col items-center text-center space-y-4">
                        <div className="w-14 h-14 bg-green-100 text-green-600 rounded-2xl flex items-center justify-center">
                            <BookOpen className="w-7 h-7" />
                        </div>
                        <h3 className="text-xl font-black">{t('landing.feature_3_title')}</h3>
                        <p className="text-slate-500 font-medium">{t('landing.feature_3_desc')}</p>
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="py-20 bg-slate-50">
                <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-8">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-slate-900 rounded-lg flex items-center justify-center text-white">
                            <Rocket className="w-5 h-5" />
                        </div>
                        <span className="text-xl font-black text-slate-900 tracking-tighter">QuizzLive</span>
                    </div>
                    <p className="text-slate-400 font-bold text-sm">{t('landing.footer_rights')}</p>
                    <div className="flex gap-6 text-sm font-bold text-slate-400">
                        <a href="#" className="hover:text-slate-900 transition-colors">{t('landing.privacy')}</a>
                        <a href="#" className="hover:text-slate-900 transition-colors">{t('landing.terms')}</a>
                    </div>
                </div>
            </footer>
        </div>
    );
}
