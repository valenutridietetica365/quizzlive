"use client";

import { Play } from "lucide-react";
import QRDisplay from "@/components/QRDisplay";

interface WaitingRoomProps {
    pin: string;
    joinUrl: string;
    gameMode: "classic" | "survival" | "teams" | "hangman";
    participantsCount: number;
    t: (key: string) => string;
    onStart: () => void;
}

export default function WaitingRoom({ pin, joinUrl, gameMode, participantsCount, t, onStart }: WaitingRoomProps) {
    return (
        <div className="w-full grid md:grid-cols-2 gap-16 items-center animate-in fade-in zoom-in duration-700">
            <div className="space-y-4 text-center md:text-left">
                <div className="space-y-2">
                    <h1 className="text-4xl md:text-6xl font-black tracking-tighter leading-none">
                        {t('session.it_is_time')} <br />
                        <span className="text-blue-500">{t('session.to_play')}</span>
                    </h1>
                    <p className="text-lg text-slate-400 font-medium max-w-md">
                        {t('session.share_desc')}
                    </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-4">
                    <div className="bg-slate-900/50 p-6 rounded-[2rem] border border-white/5 text-center">
                        <p className="text-xs font-black text-slate-500 uppercase tracking-[0.2em] mb-4">{t('session.access_code')}</p>
                        <h2 className="text-5xl font-black text-white tracking-[0.2em] font-mono">{pin}</h2>
                    </div>
                    <button
                        onClick={onStart}
                        disabled={participantsCount === 0}
                        className="btn-premium !bg-blue-600 !hover:bg-blue-700 !shadow-blue-900/40 text-2xl flex items-center justify-center gap-3 disabled:opacity-30 disabled:grayscale transition-all"
                    >
                        <Play className="w-8 h-8 fill-white" />
                        {t('session.start_action')}
                    </button>
                </div>
            </div>

            <div className="flex flex-col items-center gap-8">
                <div className="p-8 bg-white rounded-[3rem] shadow-2xl rotate-2 hover:rotate-0 transition-transform duration-500 group">
                    <QRDisplay value={joinUrl} />
                    <div className="mt-8 text-center text-slate-900">
                        <p className="font-black text-sm uppercase tracking-widest opacity-30 group-hover:opacity-100 transition-opacity">{t('session.join_now')}</p>
                    </div>
                </div>
                {gameMode === 'teams' && (
                    <div className="bg-slate-900/50 p-6 rounded-3xl border border-white/5 text-center w-full">
                        <p className="text-xs font-black text-blue-400 uppercase tracking-widest mb-2">Configuración de Equipos</p>
                        <p className="text-slate-400 text-sm">Los alumnos serán asignados a equipos automáticamente al entrar.</p>
                    </div>
                )}
                {gameMode === 'survival' && (
                    <div className="bg-red-500/10 p-6 rounded-3xl border border-red-500/20 text-center w-full">
                        <p className="text-xs font-black text-red-400 uppercase tracking-widest mb-2">Modo Supervivencia</p>
                        <p className="text-red-400/60 text-sm">¡Un fallo y estás fuera!</p>
                    </div>
                )}
            </div>
        </div>
    );
}
