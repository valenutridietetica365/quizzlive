"use client";

import { useState } from "react";
import { Shield, Snowflake, Eye, Coins, Check } from "lucide-react";

interface ChaosStoreProps {
    coins: number;
    hasShield: boolean;
    buyPowerup: (type: "shield" | "freeze" | "spy", targetId?: string) => Promise<boolean>;
    participants: { id: string; nickname: string; }[];
    currentParticipantId?: string;
}

export default function ChaosStore({ coins, hasShield, buyPowerup, participants, currentParticipantId }: ChaosStoreProps) {
    const [buying, setBuying] = useState<string | null>(null);

    const handleBuy = async (type: "shield" | "freeze" | "spy") => {
        if (buying) return;
        setBuying(type);
        
        let targetId = undefined;
        if (type === "freeze") {
            const rivals = participants.filter(p => p.id !== currentParticipantId);
            if (rivals.length > 0) {
                targetId = rivals[Math.floor(Math.random() * rivals.length)].id;
            }
        }

        await buyPowerup(type, targetId);
        setBuying(null);
    };

    const powerups = [
        { 
            id: 'shield' as const, 
            icon: Shield, 
            cost: 30, 
            colorClass: 'bg-emerald-500 border-emerald-200',
            active: hasShield,
            label: 'Escudo'
        },
        { 
            id: 'freeze' as const, 
            icon: Snowflake, 
            cost: 50, 
            colorClass: 'bg-blue-500 border-blue-200',
            active: false,
            label: 'Congelar'
        },
        { 
            id: 'spy' as const, 
            icon: Eye, 
            cost: 40, 
            colorClass: 'bg-purple-500 border-purple-200',
            active: false,
            label: 'Espiar'
        }
    ];

    return (
        <div className="fixed left-4 bottom-1/2 translate-y-[-10%] z-[60] flex flex-col items-center gap-4">
            {/* Coins Display */}
            <div className="bg-slate-900 border-2 border-amber-400 px-3 py-2 rounded-2xl shadow-xl flex items-center gap-2 animate-in slide-in-from-left-10 duration-500">
                <Coins className="w-4 h-4 text-amber-400 animate-pulse" />
                <span className="text-white font-black tabular-nums text-sm">{coins}</span>
            </div>

            {/* Powerups Column */}
            <div className="flex flex-col gap-3 bg-white/10 backdrop-blur-md p-2 rounded-[2.5rem] border border-white/20 shadow-2xl">
                {powerups.map((pw) => (
                    <div key={pw.id} className="relative group">
                        <button
                            disabled={coins < pw.cost || pw.active || buying !== null}
                            onClick={() => handleBuy(pw.id)}
                            className={`
                                w-14 h-14 md:w-16 md:h-16 rounded-full flex flex-col items-center justify-center transition-all duration-300 border-4 relative
                                ${pw.active 
                                    ? 'bg-emerald-600 border-emerald-300 text-white cursor-default scale-95 shadow-inner' 
                                    : coins >= pw.cost 
                                        ? `${pw.colorClass} text-white hover:scale-110 active:scale-95 shadow-lg` 
                                        : 'bg-slate-200 border-slate-300 text-slate-400 grayscale opacity-60 cursor-not-allowed'}
                            `}
                        >
                            {pw.active ? <Check className="w-6 h-6 md:w-8 md:h-8" /> : <pw.icon className="w-6 h-6 md:w-8 md:h-8" />}
                            
                            {!pw.active && (
                                <div className="absolute -bottom-1 -right-1 bg-amber-400 text-amber-950 text-[10px] font-black px-1.5 rounded-full border-2 border-white shadow-sm">
                                    {pw.cost}
                                </div>
                            )}
                        </button>

                        {/* Tooltip on Hover */}
                        <div className="absolute left-full ml-3 top-1/2 -translate-y-1/2 px-3 py-1 bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap shadow-xl border border-white/10">
                            {pw.label}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
