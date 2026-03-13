"use client";

import { useState } from "react";
import { Shield, Snowflake, Eye, Coins, X } from "lucide-react";

interface ChaosStoreProps {
    coins: number;
    hasShield: boolean;
    buyPowerup: (type: "shield" | "freeze" | "spy", targetId?: string) => Promise<boolean>;
    participants: { id: string; nickname: string; }[];
    currentParticipantId?: string;
}

export default function ChaosStore({ coins, hasShield, buyPowerup, participants, currentParticipantId }: ChaosStoreProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [buying, setBuying] = useState<string | null>(null);

    const handleBuy = async (type: "shield" | "freeze" | "spy") => {
        setBuying(type);
        
        let targetId = undefined;
        if (type === "freeze") {
            // Select a random rival
            const rivals = participants.filter(p => p.id !== currentParticipantId);
            if (rivals.length > 0) {
                targetId = rivals[Math.floor(Math.random() * rivals.length)].id;
            }
        }

        const success = await buyPowerup(type, targetId);
        if (success) {
            setIsOpen(false);
        }
        setBuying(null);
    };

    return (
        <div className="fixed bottom-24 right-4 md:bottom-8 md:right-8 z-[60]">
            {/* Wallet Toggle */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="relative group bg-amber-400 hover:bg-amber-500 text-amber-950 p-3 md:p-4 rounded-full shadow-2xl transition-all hover:scale-110 border-4 border-amber-200"
            >
                <div className="absolute -top-3 -left-3 bg-red-500 text-white text-xs font-black min-w-[24px] h-[24px] flex items-center justify-center rounded-full shadow-md animate-bounce">
                    {coins}
                </div>
                {isOpen ? <X className="w-6 h-6 md:w-8 md:h-8" /> : <Coins className="w-6 h-6 md:w-8 md:h-8" />}
            </button>

            {/* Store Menu */}
            {isOpen && (
                <div className="absolute bottom-full right-0 mb-4 w-64 md:w-72 bg-white/90 backdrop-blur-md rounded-3xl shadow-2xl border border-slate-100 p-4 animate-in slide-in-from-bottom-5 zoom-in-95 origin-bottom-right">
                    <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest mb-4 flex items-center gap-2">
                        <Coins className="w-4 h-4 text-amber-500" /> Tienda Caos
                    </h3>
                    
                    <div className="space-y-3">
                        {/* Shield */}
                        <button 
                            disabled={coins < 30 || hasShield || buying !== null}
                            onClick={() => handleBuy("shield")}
                            className="w-full relative overflow-hidden group bg-slate-50 hover:bg-emerald-50 disabled:opacity-50 disabled:hover:bg-slate-50 p-3 rounded-2xl border border-slate-200 hover:border-emerald-300 transition-all text-left flex items-center gap-3"
                        >
                            <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center shrink-0">
                                <Shield className="w-5 h-5 text-emerald-600" />
                            </div>
                            <div className="flex-1">
                                <p className="font-black text-slate-800 text-sm">Escudo</p>
                                <p className="text-[10px] sm:text-xs text-slate-500 font-medium leading-tight">Protege tu racha si fallas</p>
                            </div>
                            <div className="font-black text-amber-500 flex items-center gap-1">
                                30 <Coins className="w-3 h-3" />
                            </div>
                            {hasShield && <div className="absolute inset-0 bg-emerald-500/10 flex items-center justify-center font-black text-emerald-700 text-xs backdrop-blur-sm">ACTIVO</div>}
                        </button>

                        {/* Freeze */}
                        <button 
                            disabled={coins < 50 || buying !== null}
                            onClick={() => handleBuy("freeze")}
                            className="w-full relative overflow-hidden group bg-slate-50 hover:bg-blue-50 disabled:opacity-50 disabled:hover:bg-slate-50 p-3 rounded-2xl border border-slate-200 hover:border-blue-300 transition-all text-left flex items-center gap-3"
                        >
                            <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center shrink-0">
                                <Snowflake className="w-5 h-5 text-blue-600 group-hover:rotate-180 transition-transform duration-700" />
                            </div>
                            <div className="flex-1">
                                <p className="font-black text-slate-800 text-sm">Congelar</p>
                                <p className="text-[10px] sm:text-xs text-slate-500 font-medium leading-tight">Gela a un rival al azar 3s</p>
                            </div>
                            <div className="font-black text-amber-500 flex items-center gap-1">
                                50 <Coins className="w-3 h-3" />
                            </div>
                        </button>

                        {/* Spy */}
                        <button 
                            disabled={coins < 40 || buying !== null}
                            onClick={() => handleBuy("spy")}
                            className="w-full relative overflow-hidden group bg-slate-50 hover:bg-purple-50 disabled:opacity-50 disabled:hover:bg-slate-50 p-3 rounded-2xl border border-slate-200 hover:border-purple-300 transition-all text-left flex items-center gap-3"
                        >
                            <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center shrink-0">
                                <Eye className="w-5 h-5 text-purple-600" />
                            </div>
                            <div className="flex-1">
                                <p className="font-black text-slate-800 text-sm">Espía</p>
                                <p className="text-[10px] sm:text-xs text-slate-500 font-medium leading-tight">Ver tendencias de clase</p>
                            </div>
                            <div className="font-black text-amber-500 flex items-center gap-1">
                                40 <Coins className="w-3 h-3" />
                            </div>
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
