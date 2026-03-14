"use client";

import { useState } from "react";
import { Shield, Snowflake, Eye, Coins, Check } from "lucide-react";

interface ChaosStoreProps {
    coins: number;
    hasShield: boolean;
    buyPowerup: (type: "shield" | "freeze" | "spy") => Promise<boolean>;
    isSpyActive?: boolean;
}

export default function ChaosStore({ coins, hasShield, buyPowerup, isSpyActive }: ChaosStoreProps) {
    const [buying, setBuying] = useState<string | null>(null);

    const handleBuy = async (type: "shield" | "freeze" | "spy") => {
        if (buying) return;
        setBuying(type);
        await buyPowerup(type);
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
            active: isSpyActive,
            label: 'Espiar'
        }
    ];

    return (
        <div className="flex items-center gap-3">
            {/* Coins Display - Compact & Elegant */}
            <div className="bg-slate-900 border-2 border-amber-400 px-3 py-2 rounded-2xl shadow-xl flex items-center gap-2 group transition-transform hover:scale-105">
                <Coins className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
                <span className="text-white font-black tabular-nums text-xs leading-none">{coins}</span>
            </div>

            {/* Powerups Row */}
            <div className="flex items-center gap-2 bg-white/5 backdrop-blur-md p-1.5 rounded-[2rem] border border-white/10 shadow-xl">
                {powerups.map((pw) => (
                    <div key={pw.id} className="relative group/item">
                        <button
                            disabled={coins < pw.cost || pw.active || buying !== null}
                            onClick={() => handleBuy(pw.id)}
                            className={`
                                w-11 h-11 md:w-13 md:h-13 rounded-full flex items-center justify-center transition-all duration-300 border-2 relative
                                ${pw.active 
                                    ? 'bg-emerald-600 border-emerald-300 text-white cursor-default scale-95 shadow-inner' 
                                    : coins >= pw.cost 
                                        ? `${pw.colorClass} text-white hover:scale-110 active:scale-95 shadow-lg` 
                                        : 'bg-slate-200 border-slate-300 text-slate-400 grayscale opacity-60 cursor-not-allowed'}
                            `}
                        >
                            {pw.active ? <Check className="w-5 h-5 md:w-6 md:h-6" /> : <pw.icon className="w-5 h-5 md:w-6 md:h-6" />}
                            
                            {!pw.active && (
                                <div className="absolute -bottom-1 -right-1 bg-amber-400 text-amber-950 text-[8px] font-black px-1 rounded-full border border-white shadow-sm">
                                    {pw.cost}
                                </div>
                            )}
                        </button>

                        {/* Tooltip on Hover - Positioned Below */}
                        <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 px-2 py-1 bg-slate-900 text-white text-[8px] font-black uppercase tracking-widest rounded-lg opacity-0 group-hover/item:opacity-100 transition-opacity pointer-events-none whitespace-nowrap shadow-xl border border-white/10 z-50">
                            {pw.label}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
