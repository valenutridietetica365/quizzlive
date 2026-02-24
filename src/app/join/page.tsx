"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useQuizStore } from "@/lib/store";
import { User, Hash, ArrowRight, Loader2 } from "lucide-react";

export default function StudentJoin() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [pin, setPin] = useState(searchParams.get("pin") || "");
    const [nickname, setNickname] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const setParticipantInfo = useQuizStore(state => state.setParticipantInfo);

    const handleJoin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        // 1. Verify Session PIN
        const { data: session, error: sessionError } = await supabase
            .from("sessions")
            .select("id, status")
            .eq("pin", pin)
            .single();

        if (sessionError || !session) {
            setError("Código PIN inválido.");
            setLoading(false);
            return;
        }

        if (session.status === "finished") {
            setError("Este quiz ya ha finalizado.");
            setLoading(false);
            return;
        }

        // 2. Create Participant
        const { data: participant, error: partError } = await supabase
            .from("participants")
            .insert({
                session_id: session.id,
                nickname: nickname.trim()
            })
            .select()
            .single();

        if (partError) {
            if (partError.code === "23505") { // Unique violation
                setError("Este nickname ya está en uso en esta sesión.");
            } else {
                setError("Error al unirse a la sesión.");
            }
            setLoading(false);
            return;
        }

        // 3. Save to store and redirect
        setParticipantInfo(participant.id, participant.nickname);
        router.push(`/play/${session.id}`);
    };

    return (
        <div className="min-h-screen bg-blue-600 flex flex-col justify-center items-center p-6 sm:p-12 relative overflow-hidden">
            {/* Decorative background shapes */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-20 -mt-20 blur-3xl"></div>
            <div className="absolute bottom-0 left-0 w-80 h-80 bg-blue-400/20 rounded-full -ml-32 -mb-32 blur-3xl"></div>

            <div className="max-w-md w-full animate-in fade-in slide-in-from-bottom-8 duration-700">
                <div className="bg-white rounded-[2.5rem] p-8 sm:p-12 shadow-2xl space-y-8">
                    <div className="text-center space-y-2">
                        <h1 className="text-4xl font-black text-slate-900 tracking-tighter">¡Únete al Quiz!</h1>
                        <p className="text-slate-500 font-medium">Ingresa tus datos para empezar</p>
                    </div>

                    <form onSubmit={handleJoin} className="space-y-4">
                        <div className="space-y-1.5">
                            <div className="relative group">
                                <Hash className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                                <input
                                    type="text"
                                    placeholder="Código PIN"
                                    className="w-full pl-12 pr-4 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-blue-500 outline-none text-xl font-bold tracking-widest placeholder:text-slate-300 transition-all"
                                    value={pin}
                                    onChange={(e) => setPin(e.target.value.toUpperCase())}
                                    maxLength={6}
                                    required
                                />
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <div className="relative group">
                                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                                <input
                                    type="text"
                                    placeholder="Tu Nickname"
                                    className="w-full pl-12 pr-4 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-blue-500 outline-none text-xl font-bold placeholder:text-slate-300 transition-all"
                                    value={nickname}
                                    onChange={(e) => setNickname(e.target.value)}
                                    maxLength={15}
                                    required
                                />
                            </div>
                        </div>

                        {error && (
                            <p className="text-red-500 text-sm font-bold text-center animate-shake">{error}</p>
                        )}

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-5 bg-slate-900 text-white rounded-2xl font-black text-xl hover:bg-slate-800 transition-all flex items-center justify-center gap-3 shadow-lg active:scale-95 disabled:opacity-50"
                        >
                            {loading ? (
                                <Loader2 className="w-6 h-6 animate-spin" />
                            ) : (
                                <>
                                    LISTO PARA JUGAR
                                    <ArrowRight className="w-6 h-6" />
                                </>
                            )}
                        </button>
                    </form>
                </div>

                <p className="text-center mt-8 text-blue-100/60 text-sm font-medium">
                    Divertite aprendiendo con tus compañeros
                </p>
            </div>

            <style jsx>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-4px); }
          75% { transform: translateX(4px); }
        }
        .animate-shake {
          animation: shake 0.2s ease-in-out 0s 2;
        }
      `}</style>
        </div>
    );
}
