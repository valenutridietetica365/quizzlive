"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useQuizStore } from "@/lib/store";
import { Rocket, Sparkles, User, Key, ArrowRight, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { getTranslation } from "@/lib/i18n";
import LanguageSelector from "@/components/LanguageSelector";

interface JoinSessionResponse {
    id: string;
    quiz: {
        class_id: string | null;
        class: {
            id: string;
            name: string;
            students: { id: string; name: string }[];
        } | null;
    } | null;
}

function JoinContent() {
    const { setParticipantInfo, language, participantId, nickname: storedNickname } = useQuizStore();
    const [pin, setPin] = useState("");
    const [nickname, setNickname] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [hasPinFromUrl, setHasPinFromUrl] = useState(false);
    const [rejoinSession, setRejoinSession] = useState<{ sessionId: string; pin: string } | null>(null);
    const [students, setStudents] = useState<{ id: string; name: string }[]>([]);
    const [selectedStudentId, setSelectedStudentId] = useState<string>("");
    const [classInfo, setClassInfo] = useState<{ id: string; name: string } | null>(null);
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

    useEffect(() => {
        if (pin.length === 6) {
            checkPin(pin);
        }
    }, [pin]);

    const checkPin = async (currentPin: string) => {
        const { data: session } = await supabase
            .from("sessions")
            .select(`
                id,
                quiz:quizzes!inner(class_id, class:classes(id, name, students(*)))
            `)
            .eq("pin", currentPin)
            .single();

        if (session) {
            const s = session as unknown as JoinSessionResponse;
            if (s.quiz?.class) {
                setClassInfo(s.quiz.class);
                setStudents(s.quiz.class.students || []);
            } else {
                setClassInfo(null);
                setStudents([]);
            }
        }
    };

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
                    nickname: nickname,
                    student_id: selectedStudentId || null
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
        <div className="min-h-screen bg-white flex flex-col justify-center py-6 md:py-12 px-6">
            <div className="fixed top-4 right-4 md:top-6 md:right-6 z-50">
                <LanguageSelector />
            </div>

            <div className="max-w-md w-full mx-auto space-y-8 md:space-y-12 pt-12 md:pt-0">
                {/* Rejoin Banner */}
                {rejoinSession && (
                    <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-4 md:p-5 rounded-2xl md:rounded-3xl flex items-center justify-between gap-4 animate-in slide-in-from-top-4">
                        <div>
                            <p className="font-black text-xs md:text-sm">¡Sesión activa encontrada!</p>
                            <p className="text-[10px] md:text-xs font-medium text-emerald-600">PIN: {rejoinSession.pin} · {storedNickname}</p>
                        </div>
                        <button
                            onClick={handleRejoin}
                            className="bg-emerald-600 text-white px-3 md:px-4 py-2 rounded-xl font-black text-xs md:text-sm hover:bg-emerald-700 transition-all active:scale-95 whitespace-nowrap"
                        >
                            Volver 🔥
                        </button>
                    </div>
                )}

                <div className="text-center space-y-4 md:space-y-6">
                    <div className="w-16 md:w-20 h-16 md:h-20 bg-slate-900 rounded-[2rem] md:rounded-[2.5rem] flex items-center justify-center text-white shadow-2xl mx-auto rotate-3">
                        <Rocket className="w-8 md:w-10 h-8 md:h-10 animate-float" />
                    </div>
                    <div className="space-y-2">
                        <h1 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tighter">
                            QuizzLive
                        </h1>
                        <p className="text-slate-400 font-bold uppercase tracking-[0.3em] text-[8px] md:text-[10px] mt-2">
                            {t('join.title')}
                        </p>
                    </div>
                </div>

                <div className="relative group">
                    <div className="absolute -inset-4 bg-gradient-to-r from-blue-500/20 via-purple-500/20 to-pink-500/20 rounded-[3rem] md:rounded-[4rem] blur-2xl opacity-50 group-hover:opacity-100 transition-opacity duration-1000" />

                    <div className="relative bg-white/40 backdrop-blur-3xl p-6 md:p-10 rounded-[2.5rem] md:rounded-[3rem] border border-white/50 shadow-[0_32px_120px_-20px_rgba(0,0,0,0.1)] overflow-hidden">
                        <div className="absolute top-0 left-0 w-24 md:w-32 h-24 md:h-32 bg-blue-100/30 rounded-br-[3rem] md:rounded-br-[4rem] -ml-6 md:-ml-8 -mt-6 md:-mt-8" />

                        <form onSubmit={handleJoin} className="space-y-6 md:space-y-8 relative z-10">
                            <div className="space-y-6">
                                {hasPinFromUrl ? (
                                    <div className="bg-slate-900 text-white p-5 md:p-7 rounded-2xl md:rounded-[2rem] flex items-center justify-between shadow-2xl relative overflow-hidden group/pin">
                                        <div className="absolute inset-0 bg-gradient-to-r from-blue-600/20 to-transparent opacity-0 group-hover/pin:opacity-100 transition-opacity" />
                                        <div className="flex items-center gap-3 md:gap-4 relative z-10">
                                            <div className="w-8 md:w-10 h-8 md:h-10 bg-blue-500 rounded-lg md:rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/30">
                                                <Key className="w-4 md:w-5 h-4 md:h-5 text-white" />
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-[8px] md:text-[10px] font-black uppercase tracking-widest text-slate-400">Sesión Activa</span>
                                                <span className="text-[10px] md:text-sm font-bold text-blue-400">Listo para entrar</span>
                                            </div>
                                        </div>
                                        <span className="text-2xl md:text-4xl font-black font-mono tracking-widest relative z-10">{pin}</span>
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

                                {students.length > 0 ? (
                                    <div className="space-y-2">
                                        <label className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                                            <User className="w-3 h-3 text-blue-500" />
                                            Selecciona tu nombre ({classInfo?.name})
                                        </label>
                                        <select
                                            value={selectedStudentId}
                                            onChange={(e) => {
                                                const student = students.find(s => s.id === e.target.value);
                                                setSelectedStudentId(e.target.value);
                                                if (student) setNickname(student.name);
                                            }}
                                            className="input-premium !bg-white/80 appearance-none"
                                            required
                                        >
                                            <option value="">-- Elige tu nombre --</option>
                                            {students.sort((a, b) => a.name.localeCompare(b.name)).map(s => (
                                                <option key={s.id} value={s.id}>{s.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                ) : (
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
                                )}
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
