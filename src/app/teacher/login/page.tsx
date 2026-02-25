"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { Mail, Lock, AlertCircle, Eye, EyeOff, UserPlus, LogIn } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuizStore } from "@/lib/store";
import { getTranslation } from "@/lib/i18n";
import LanguageSelector from "@/components/LanguageSelector";

export default function TeacherLogin() {
    const { language } = useQuizStore();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [mode, setMode] = useState<"login" | "signup">("login");
    const router = useRouter();

    const t = (key: string) => getTranslation(language, key);

    const handleAuth = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            if (mode === "login") {
                const { error } = await supabase.auth.signInWithPassword({
                    email,
                    password,
                });
                if (error) throw error;
                router.push("/teacher/dashboard");
            } else {
                const { error } = await supabase.auth.signUp({
                    email,
                    password,
                    options: {
                        emailRedirectTo: `${window.location.origin}/teacher/dashboard`,
                    }
                });
                if (error) throw error;
                toast.success(t('auth.signup_success'));
                setMode("login");
            }
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : t('auth.unexpected_error'));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8 selection:bg-blue-100 italic-none">
            <div className="absolute top-8 right-8">
                <LanguageSelector />
            </div>

            <div className="sm:mx-auto sm:w-full sm:max-w-md space-y-4">
                <div className="flex justify-center">
                    <div className="w-16 h-16 bg-slate-900 rounded-3xl flex items-center justify-center text-white shadow-xl">
                        {mode === "login" ? <LogIn className="w-8 h-8" /> : <UserPlus className="w-8 h-8" />}
                    </div>
                </div>
                <div>
                    <h2 className="text-center text-3xl font-black text-slate-900 tracking-tight">
                        {mode === "login" ? t('auth.login_title') : t('auth.signup_title')}
                    </h2>
                    <p className="mt-2 text-center text-sm text-slate-500 font-medium">
                        {mode === "login"
                            ? t('auth.login_subtitle')
                            : t('auth.signup_subtitle')}
                    </p>
                </div>
            </div>

            <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4 sm:px-0">
                <div className="bg-white py-10 px-6 shadow-xl shadow-slate-200/50 sm:rounded-[2.5rem] sm:px-12 border border-slate-100">
                    <form className="space-y-6" onSubmit={handleAuth}>
                        <div>
                            <label htmlFor="email" className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">
                                {t('auth.email_label')}
                            </label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                    <Mail className="h-5 w-5 text-slate-300" aria-hidden="true" />
                                </div>
                                <input
                                    id="email"
                                    type="email"
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="block w-full pl-12 pr-4 py-4 bg-slate-50 border-none focus:ring-2 focus:ring-blue-500 rounded-2xl text-slate-900 font-bold placeholder:text-slate-300 transition-all outline-none"
                                    placeholder={t('auth.email_placeholder')}
                                />
                            </div>
                        </div>

                        <div>
                            <label htmlFor="password" className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">
                                {t('auth.password_label')}
                            </label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                    <Lock className="h-5 w-5 text-slate-300" aria-hidden="true" />
                                </div>
                                <input
                                    id="password"
                                    type={showPassword ? "text" : "password"}
                                    required
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="block w-full pl-12 pr-12 py-4 bg-slate-50 border-none focus:ring-2 focus:ring-blue-500 rounded-2xl text-slate-900 font-bold placeholder:text-slate-300 transition-all outline-none"
                                    placeholder="••••••••"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-300 hover:text-slate-500"
                                >
                                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                                </button>
                            </div>
                        </div>

                        {error && (
                            <div className="rounded-2xl bg-red-50 p-4 border border-red-100 flex items-start gap-3 animate-in fade-in slide-in-from-top-2">
                                <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" aria-hidden="true" />
                                <p className="text-sm font-bold text-red-800 leading-tight">{error}</p>
                            </div>
                        )}

                        <div>
                            <button
                                type="submit"
                                disabled={loading}
                                className="group w-full flex justify-center py-4 px-4 border border-transparent rounded-2xl shadow-lg text-lg font-black text-white bg-slate-900 hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-900 transition-all active:scale-[0.98] disabled:opacity-50"
                            >
                                {loading ? t('auth.processing') : (mode === "login" ? t('auth.login_button') : t('auth.signup_button'))}
                            </button>
                        </div>
                    </form>

                    <div className="mt-8 flex flex-col gap-4">
                        <button
                            onClick={() => setMode(mode === "login" ? "signup" : "login")}
                            className="text-sm font-bold text-blue-600 hover:text-blue-700 transition-colors"
                        >
                            {mode === "login"
                                ? t('auth.no_account')
                                : t('auth.has_account')}
                        </button>
                        <Link href="/" className="text-sm font-bold text-slate-400 hover:text-slate-600 transition-colors">
                            {t('auth.back_to_home')}
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}
