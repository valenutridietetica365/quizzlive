"use client";

import { useState, useEffect, useRef } from "react";
import { Shield, Snowflake, Eye, Coins, Check } from "lucide-react";

interface ChaosStoreProps {
    coins: number;
    hasShield: boolean;
    buyPowerup: (type: "shield" | "freeze" | "spy") => Promise<boolean>;
    isSpyActive?: boolean;
}

export default function ChaosStore({ coins, hasShield, buyPowerup, isSpyActive }: ChaosStoreProps) {
    const [buying, setBuying] = useState<string | null>(null);
    const [lastBuyTime, setLastBuyTime] = useState(0);
    const [coinDelta, setCoinDelta] = useState<number | null>(null);
    const [coinBounce, setCoinBounce] = useState(false);
    const prevCoins = useRef(coins);

    // Detect coin changes and trigger animation
    useEffect(() => {
        const diff = coins - prevCoins.current;
        if (diff !== 0 && prevCoins.current !== 0) {
            setCoinDelta(diff);
            setCoinBounce(true);
            const t1 = setTimeout(() => setCoinDelta(null), 1200);
            const t2 = setTimeout(() => setCoinBounce(false), 400);
            prevCoins.current = coins;
            return () => { clearTimeout(t1); clearTimeout(t2); };
        }
        prevCoins.current = coins;
    }, [coins]);

    const handleBuy = async (type: "shield" | "freeze" | "spy") => {
        if (buying) return;
        // Rate limit: 2 second cooldown between purchases
        const now = Date.now();
        if (now - lastBuyTime < 2000) return;
        setBuying(type);
        setLastBuyTime(now);
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
        <div className="flex flex-col items-center gap-4">
            {/* Coins Display with Inline Animation */}
            <div className="relative">
                <div className={`bg-slate-900 border-2 border-amber-400 px-3 py-2 rounded-2xl shadow-xl flex items-center gap-2 animate-in slide-in-from-left-10 duration-500 ${coinBounce ? 'scale-125' : 'hover:scale-105'}`}
                    style={{ transition: 'transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)' }}
                >
                    <Coins className={`w-3.5 h-3.5 text-amber-400 ${coinBounce ? 'animate-spin' : ''}`} />
                    <span className="text-white font-black tabular-nums text-xs leading-none">{coins}</span>
                </div>

                {/* Floating "+N" animation */}
                {coinDelta !== null && (
                    <span
                        key={Date.now()}
                        className={`absolute left-1/2 font-black text-sm pointer-events-none whitespace-nowrap ${coinDelta > 0 ? 'text-amber-400' : 'text-red-400'}`}
                        style={{
                            animation: 'coinFloat 1.2s ease-out forwards',
                            top: '-8px',
                            transform: 'translateX(-50%)',
                        }}
                    >
                        {coinDelta > 0 ? `+${coinDelta}` : coinDelta}
                    </span>
                )}
            </div>

            {/* Powerups Column */}
            <div className="flex flex-col items-center gap-3 bg-white/80 dark:bg-white/5 backdrop-blur-md p-2 rounded-[3rem] border border-slate-200 dark:border-white/10 shadow-xl">
                {powerups.map((pw) => (
                    <div key={pw.id} className="relative group/item">
                        <button
                            disabled={coins < pw.cost || pw.active || buying !== null}
                            onClick={() => handleBuy(pw.id)}
                            className={`
                                w-13 h-13 md:w-15 md:h-15 rounded-full flex items-center justify-center transition-all duration-300 border-2 relative
                                ${pw.active 
                                    ? 'bg-emerald-600 border-emerald-300 text-white cursor-default scale-95 shadow-inner' 
                                    : coins >= pw.cost 
                                        ? `${pw.colorClass} text-white hover:scale-110 active:scale-95 shadow-lg` 
                                        : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-400 dark:text-slate-500 grayscale opacity-60 cursor-not-allowed'}
                            `}
                        >
                            {pw.active ? <Check className="w-6 h-6 md:w-8 md:h-8" /> : <pw.icon className="w-5 h-5 md:w-6 md:h-6" />}
                            
                            {!pw.active && (
                                <div className="absolute -bottom-1 -right-1 bg-amber-400 text-amber-950 text-[9px] font-black px-1.5 rounded-full border border-white shadow-sm">
                                    {pw.cost}
                                </div>
                            )}
                        </button>

                        <div className="absolute left-full ml-4 top-1/2 -translate-y-1/2 px-3 py-1 bg-slate-900 text-white text-[9px] font-black uppercase tracking-widest rounded-lg opacity-0 group-hover/item:opacity-100 transition-opacity pointer-events-none whitespace-nowrap shadow-xl border border-white/10 z-50">
                            {pw.label}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
