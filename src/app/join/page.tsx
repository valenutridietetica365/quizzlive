"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useQuizStore } from "@/lib/store";
import { Rocket, Sparkles, User, Key, ArrowRight, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { getTranslation } from "@/lib/i18n";
import LanguageSelector from "@/components/LanguageSelector";

function JoinContent() {
    const { setParticipantInfo, language, participantId, nickname: storedNickname } = useQuizStore();
    const [pin, setPin] = useState("");
    const [nickname, setNickname] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [hasPinFromUrl, setHasPinFromUrl] = useState(false);
    const [rejoinSession, setRejoinSession] = useState<{ sessionId: string; pin: string } | null>(null);
    const router = useRouter();
    const searchParams = useSearchParams();

    const t = (key: string) => getTranslation(language, key);

    useEffect(() => {
        const pinFromUrl = searchParams.get("pin");
        if (pinFromUrl) {
            setPin(pinFromUrl);
            setHasPinFromUrl(true);
        }

        // Check if there's an existing active session for the stored participant
        const checkRejoin = async () => {
            if (!participantId) return;
            const { data } = await supabase
                .from("participants")
                .select("session_id, sessions(id, pin, status)")
                .eq("id", participantId)
                .single();
            if (!data?.sessions) return;
            const s = data.sessions as unknown as { id: string; pin: string; status: string };
            if (s.status === "active") {
                setRejoinSession({ sessionId: s.id, pin: s.pin });
            }
        };
        checkRejoin();
    }, [searchParams, participantId]);

    const handleJoin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            const { data: session, error: sessionError } = await supabase
                .from("sessions")
                .select("id, status")
                .eq("pin", pin)
                .single();

            if (sessionError || !session) throw new Error(t('join.invalid_pin'));
            if (session.status === "finished") throw new Error("Esta sesión ya ha finalizado");

            const { data: participant, error: participantError } = await supabase
                .from("participants")
                .insert({
                    session_id: session.id,
                    nickname: nickname
                })
                .select()
                .single();

            if (participantError) throw new Error("Error al unirse a la sesión");

            setParticipantInfo(participant.id, nickname);
            router.push(`/play/${session.id}`);
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : "Error desconocido";
            setError(msg);
            toast.error(msg);
        } finally {
            setLoading(false);
        }
    };

    const handleRejoin = () => {
        if (rejoinSession) router.push(`/play/${rejoinSession.sessionId}`);
    };

    return (
        <div className="min-h-screen bg-white flex flex-col justify-center py-12 px-6">
            <div className="fixed top-6 right-6 z-50">
                <LanguageSelector />
            </div>

            <div className="max-w-md w-full mx-auto space-y-12">
                {/* Rejoin Banner */}
                {rejoinSession && (
                    <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-5 rounded-3xl flex items-center justify-between gap-4 animate-in slide-in-from-top-4">
                        <div>
                            <p className="font-black text-sm">¡Sesión activa encontrada!</p>
                            <p className="text-xs font-medium text-emerald-600">PIN: {rejoinSession.pin} · {storedNickname}</p>
                        </div>
                        <button
                            onClick={handleRejoin}
                            className="bg-emerald-600 text-white px-4 py-2 rounded-xl font-black text-sm hover:bg-emerald-700 transition-all active:scale-95"
                        >
                            Volver 🔥
                        </button>
                    </div>
                )}

                <div className="text-center space-y-6">
                    <div className="w-20 h-20 bg-slate-900 rounded-[2.5rem] flex items-center justify-center text-white shadow-2xl mx-auto rotate-3">
                        <Rocket className="w-10 h-10 animate-float" />
                    </div>
                    <div className="space-y-2">
                        <h1 className="text-5xl font-black text-slate-900 tracking-tighter">
                            QuizzLive
                        </h1>
                        <p className="text-slate-400 font-bold uppercase tracking-[0.3em] text-[10px] mt-2">
                            {t('join.title')}
                        </p>
                    </div>
                </div>

                <div className="relative group">
                    <div className="absolute -inset-4 bg-gradient-to-r from-blue-500/20 via-purple-500/20 to-pink-500/20 rounded-[4rem] blur-2xl opacity-50 group-hover:opacity-100 transition-opacity duration-1000" />

                    <div className="relative bg-white/40 backdrop-blur-3xl p-10 rounded-[3rem] border border-white/50 shadow-[0_32px_120px_-20px_rgba(0,0,0,0.1)] overflow-hidden">
                        <div className="absolute top-0 left-0 w-32 h-32 bg-blue-100/30 rounded-br-[4rem] -ml-8 -mt-8" />

                        <form onSubmit={handleJoin} className="space-y-8 relative z-10">
                            <div className="space-y-6">
                                {hasPinFromUrl ? (
                                    <div className="bg-slate-900 text-white p-7 rounded-[2rem] flex items-center justify-between shadow-2xl relative overflow-hidden group/pin">
                                        <div className="absolute inset-0 bg-gradient-to-r from-blue-600/20 to-transparent opacity-0 group-hover/pin:opacity-100 transition-opacity" />
                                        <div className="flex items-center gap-4 relative z-10">
                                            <div className="w-10 h-10 bg-blue-500 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/30">
                                                <Key className="w-5 h-5 text-white" />
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Sesión Activa</span>
                                                <span className="text-sm font-bold text-blue-400">Listo para entrar</span>
                                            </div>
                                        </div>
                                        <span className="text-4xl font-black font-mono tracking-widest relative z-10">{pin}</span>
                                    </div>
                                ) : (
                                    <div className="space-y-2">
                                        <label className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                                            <Key className="w-3 h-3 text-blue-500" />
                                            {t('join.pin_placeholder')}
                                        </label>
                                        <input
                                            type="text"
                                            placeholder="000000"
                                            value={pin}
                                            onChange={(e) => setPin(e.target.value.toUpperCase())}
                                            className="input-premium !bg-white/60 !text-3xl !py-6 !font-mono !tracking-[0.5em] text-center !shadow-inner"
                                            maxLength={6}
                                            required
                                        />
                                    </div>
                                )}

                                <div className="space-y-2">
                                    <label className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                                        <User className="w-3 h-3 text-blue-500" />
                                        {t('join.nickname_placeholder')}
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="Ej: ProfeGenial"
                                        value={nickname}
                                        onChange={(e) => setNickname(e.target.value)}
                                        className="input-premium !bg-white/80"
                                        required
                                        autoFocus={hasPinFromUrl}
                                    />
                                </div>
                            </div>

                            {error && (
                                <div className="bg-red-50 text-red-600 p-4 rounded-2xl text-xs font-black border border-red-100 animate-in slide-in-from-top-2">
                                    {error}
                                </div>
                            )}

                            <button
                                type="submit"
                                disabled={loading}
                                className="btn-premium w-full !bg-slate-900 !text-white !shadow-slate-200 flex items-center justify-center gap-3 active:scale-95 disabled:opacity-50 transition-all font-black text-xl !py-6 !rounded-[2rem]"
                            >
                                {loading ? (
                                    <Loader2 className="w-7 h-7 animate-spin" />
                                ) : (
                                    <>
                                        {t('join.button')} <ArrowRight className="w-6 h-6" />
                                    </>
                                )}
                            </button>
                        </form>
                    </div>
                </div>

                <div className="flex justify-center flex-wrap gap-4">
                    <div className="flex items-center gap-2 bg-slate-50 px-4 py-2 rounded-full border border-slate-100">
                        <Sparkles className="w-4 h-4 text-amber-500" />
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Sin registro</span>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default function JoinPage() {
    return (
        <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-white"><Loader2 className="w-10 h-10 animate-spin text-blue-600" /></div>}>
            <JoinContent />
        </Suspense>
    );
}
