"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useQuizStore } from "@/lib/store";
import { Rocket, Sparkles, User, Key, ArrowRight, Loader2 } from "lucide-react";
import { toast } from "sonner";

function JoinContent() {
    const [pin, setPin] = useState("");
    const [nickname, setNickname] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const router = useRouter();
    const searchParams = useSearchParams();
    const setParticipantInfo = useQuizStore((state) => state.setParticipantInfo);

    useEffect(() => {
        const pinFromUrl = searchParams.get("pin");
        if (pinFromUrl) setPin(pinFromUrl);
    }, [searchParams]);

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

            if (sessionError || !session) throw new Error("PIN inválido o no encontrado");
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
            setError(err instanceof Error ? err.message : "Error desconocido");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-white flex flex-col justify-center py-12 px-6">
            <div className="max-w-md w-full mx-auto space-y-12">
                <div className="text-center space-y-6">
                    <div className="w-20 h-20 bg-slate-900 rounded-[2.5rem] flex items-center justify-center text-white shadow-2xl mx-auto rotate-3">
                        <Rocket className="w-10 h-10 animate-float" />
                    </div>
                    <div className="space-y-2">
                        <h1 className="text-5xl font-black text-slate-900 tracking-tighter">Únete ahora</h1>
                        <p className="text-slate-500 font-medium text-lg">Ingresa el código y tu apodo para empezar.</p>
                    </div>
                </div>

                <div className="bg-slate-50 p-10 rounded-[3rem] border border-slate-100 shadow-[0_24px_80px_-15px_rgba(0,0,0,0.05)] relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-32 h-32 bg-blue-100/30 rounded-br-[4rem] -ml-8 -mt-8" />

                    <form onSubmit={handleJoin} className="space-y-8 relative z-10">
                        <div className="space-y-6">
                            <div className="space-y-2">
                                <label className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                                    <Key className="w-3 h-3 text-blue-500" />
                                    Código PIN
                                </label>
                                <input
                                    type="text"
                                    placeholder="000000"
                                    value={pin}
                                    onChange={(e) => setPin(e.target.value.toUpperCase())}
                                    className="input-premium !bg-white !text-3xl !py-6 !font-mono !tracking-[0.5em] text-center !shadow-inner"
                                    maxLength={6}
                                    required
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                                    <User className="w-3 h-3 text-blue-500" />
                                    Tu Apodo (Nickname)
                                </label>
                                <input
                                    type="text"
                                    placeholder="Ej: ProfeGenial"
                                    value={nickname}
                                    onChange={(e) => setNickname(e.target.value)}
                                    className="input-premium !bg-white"
                                    required
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
                            className="btn-premium w-full !bg-blue-600 !hover:bg-blue-700 !shadow-blue-100 flex items-center justify-center gap-3 active:scale-95 disabled:opacity-50 transition-all font-black text-xl !py-5"
                        >
                            {loading ? (
                                <Loader2 className="w-7 h-7 animate-spin" />
                            ) : (
                                <>
                                    ¡VAMOS! <ArrowRight className="w-6 h-6" />
                                </>
                            )}
                        </button>
                    </form>
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
