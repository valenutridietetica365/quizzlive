"use client";

import { useState } from "react";
import { Play, Users, BookOpen } from "lucide-react";
import { GameModeConfig } from "@/lib/schemas";

interface ModeSelectionModalProps {
    isOpen: boolean;
    onClose: () => void;
    onStart: (mode: "classic" | "survival" | "teams" | "hangman", config: GameModeConfig) => void;
}

export default function ModeSelectionModal({ isOpen, onClose, onStart }: ModeSelectionModalProps) {
    const [selectedMode, setSelectedMode] = useState<"classic" | "survival" | "teams" | "hangman">("classic");
    const [config, setConfig] = useState<GameModeConfig>({
        hangmanLives: 6, hangmanIgnoreAccents: true, teamsCount: 2, survivalLives: 1
    });

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="bg-white w-full max-w-xl rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
                <div className="p-8 md:p-12 space-y-8">
                    <div className="text-center space-y-2">
                        <h3 className="text-3xl font-black text-slate-900 tracking-tight">Selecciona un Modo de Juego</h3>
                        <p className="text-slate-500 font-medium">Personaliza cómo van a competir tus alumnos hoy.</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {([
                            { id: 'classic', icon: Play, name: 'Clásico', desc: 'Todos contra todos por puntos.' },
                            { id: 'survival', icon: Users, name: 'Supervivencia', desc: 'Un fallo y quedas fuera del podio.' },
                            { id: 'teams', icon: Users, name: 'Equipos', desc: 'Competición grupal (2-4 equipos).' },
                            { id: 'hangman', icon: BookOpen, name: 'Ahorcado', desc: 'Adivina la palabra letra por letra.' }
                        ] as const).map((mode) => (
                            <button
                                key={mode.id}
                                onClick={() => setSelectedMode(mode.id)}
                                className={`p-6 rounded-[2rem] border-2 text-left transition-all space-y-3 ${selectedMode === mode.id
                                    ? "border-blue-600 bg-blue-50/50 ring-4 ring-blue-50"
                                    : "border-slate-100 bg-white hover:border-slate-200"
                                    }`}
                            >
                                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${selectedMode === mode.id ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-500"}`}>
                                    <mode.icon className="w-6 h-6" />
                                </div>
                                <div>
                                    <p className="font-black text-slate-900">{mode.name}</p>
                                    <p className="text-xs text-slate-500 font-medium">{mode.desc}</p>
                                </div>
                            </button>
                        ))}
                    </div>

                    {/* Mode Specific Config */}
                    <div className="bg-slate-50 p-6 rounded-[2rem] space-y-4 border border-slate-100">
                        <p className="text-xs font-black text-slate-400 uppercase tracking-widest pl-2">Configuración del Modo</p>

                        {selectedMode === 'hangman' && (
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <div className="space-y-0.5">
                                        <p className="font-bold text-slate-800 text-sm">Intentos (Vidas)</p>
                                        <p className="text-xs text-slate-500">Número de fallos permitidos.</p>
                                    </div>
                                    <div className="flex items-center gap-4 bg-white px-4 py-2 rounded-xl border border-slate-200">
                                        <button onClick={() => setConfig({ ...config, hangmanLives: Math.max(3, config.hangmanLives - 1) })} className="text-blue-600 font-bold">-</button>
                                        <span className="font-black text-slate-900 w-4 text-center">{config.hangmanLives}</span>
                                        <button onClick={() => setConfig({ ...config, hangmanLives: Math.min(10, config.hangmanLives + 1) })} className="text-blue-600 font-bold">+</button>
                                    </div>
                                </div>
                                <div className="flex items-center justify-between">
                                    <div className="space-y-0.5">
                                        <p className="font-bold text-slate-800 text-sm">Ignorar Acentos</p>
                                        <p className="text-xs text-slate-500">Tratar Á como A, É como E, etc.</p>
                                    </div>
                                    <button
                                        onClick={() => setConfig({ ...config, hangmanIgnoreAccents: !config.hangmanIgnoreAccents })}
                                        className={`w-12 h-6 rounded-full transition-all relative ${config.hangmanIgnoreAccents ? 'bg-blue-600' : 'bg-slate-300'}`}
                                    >
                                        <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${config.hangmanIgnoreAccents ? 'left-7' : 'left-1'}`} />
                                    </button>
                                </div>
                            </div>
                        )}

                        {selectedMode === 'teams' && (
                            <div className="flex items-center justify-between">
                                <div className="space-y-0.5">
                                    <p className="font-bold text-slate-800 text-sm">Número de Equipos</p>
                                    <p className="text-xs text-slate-500">Dividir a los alumnos en grupos.</p>
                                </div>
                                <div className="flex gap-2">
                                    {[2, 3, 4].map(n => (
                                        <button
                                            key={n}
                                            onClick={() => setConfig({ ...config, teamsCount: n })}
                                            className={`w-10 h-10 rounded-xl font-black text-sm transition-all ${config.teamsCount === n ? 'bg-blue-600 text-white' : 'bg-white border border-slate-200 text-slate-50'}`}
                                        >
                                            {n}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {selectedMode === 'survival' && (
                            <div className="flex items-center justify-between">
                                <div className="space-y-0.5">
                                    <p className="font-bold text-slate-800 text-sm">Vidas Iniciales</p>
                                    <p className="text-xs text-slate-500">¿Cuántos fallos antes de eliminar?</p>
                                </div>
                                <div className="flex items-center gap-4 bg-white px-4 py-2 rounded-xl border border-slate-200">
                                    <button onClick={() => setConfig({ ...config, survivalLives: Math.max(1, config.survivalLives - 1) })} className="text-blue-600 font-bold">-</button>
                                    <span className="font-black text-slate-900 w-4 text-center">{config.survivalLives}</span>
                                    <button onClick={() => setConfig({ ...config, survivalLives: Math.min(5, config.survivalLives + 1) })} className="text-blue-600 font-bold">+</button>
                                </div>
                            </div>
                        )}

                        {selectedMode === 'classic' && (
                            <p className="text-xs text-slate-400 font-medium italic">Sin configuraciones adicionales para este modo.</p>
                        )}
                    </div>

                    <div className="flex gap-4 pt-4">
                        <button
                            onClick={onClose}
                            className="px-8 py-4 rounded-2xl font-black text-slate-400 hover:bg-slate-50 transition-all"
                        >
                            Cancelar
                        </button>
                        <button
                            onClick={() => onStart(selectedMode, config)}
                            className="flex-1 px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-black shadow-xl shadow-blue-200 transition-all transform active:scale-95"
                        >
                            ¡Comenzar Juego!
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
