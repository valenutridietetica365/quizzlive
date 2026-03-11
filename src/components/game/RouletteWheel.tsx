"use client";

import { useState, useEffect, useMemo } from "react";
import { Sparkles } from "lucide-react";

interface RouletteWheelProps {
    items: string[];
    onFinish: (winner: string) => void;
    spinning: boolean;
    winnerIndex?: number | null;
}

export default function RouletteWheel({ items, onFinish, spinning, winnerIndex }: RouletteWheelProps) {
    const [rotation, setRotation] = useState(0);
    const [isAnimating, setIsAnimating] = useState(false);

    // Fixed colors
    const colors = useMemo(() => [
        "#3b82f6", "#ef4444", "#10b981", "#f59e0b",
        "#8b5cf6", "#ec4899", "#06b6d4", "#f43f5e"
    ], []);

    // Generate conic-gradient string
    const gradient = useMemo(() => {
        if (items.length === 0) return "#f8fafc";
        if (items.length === 1) return colors[0];

        const segmentAngle = 360 / items.length;
        const parts = items.map((_, i) => {
            const start = i * segmentAngle;
            const end = (i + 1) * segmentAngle;
            return `${colors[i % colors.length]} ${start}deg ${end}deg`;
        });
        return `conic-gradient(${parts.join(', ')})`;
    }, [items, colors]);

    useEffect(() => {
        if (spinning && !isAnimating && winnerIndex !== undefined && winnerIndex !== null) {
            startSpin();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [spinning, winnerIndex, isAnimating]);

    const startSpin = () => {
        if (items.length === 0 || winnerIndex === undefined || winnerIndex === null) return;

        setIsAnimating(true);
        const segmentAngle = 360 / items.length;

        // Final position: indicator is at top (0 or 360 deg)
        // Each segment i is at [i*segmentAngle, (i+1)*segmentAngle]
        // Center of segment i is (i + 0.5) * segmentAngle
        // To put center of winner segment at top (0 deg), we need to rotate wheel by -(center)
        const targetAngle = (winnerIndex + 0.5) * segmentAngle;
        const extraRotations = 8 + Math.floor(Math.random() * 5);

        // We subtract the targetAngle from the total rotations to align the winner to the top
        const totalRotation = (extraRotations * 360) - targetAngle;

        // To avoid "jumps", we add to current base rotation
        const currentBase = rotation - (rotation % 360);
        setRotation(currentBase + totalRotation);

        setTimeout(() => {
            setIsAnimating(false);
            onFinish(items[winnerIndex]);
        }, 4000);
    };

    return (
        <div className="relative w-full max-w-[320px] aspect-square mx-auto flex items-center justify-center p-4">
            {/* Top Indicator */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 z-20 -mt-2">
                <div className="w-8 h-8 bg-slate-900 shadow-xl rounded-full flex items-center justify-center border-4 border-white">
                    <div className="w-0 h-0 border-l-[8px] border-l-transparent border-r-[8px] border-r-transparent border-t-[12px] border-t-blue-500 translate-y-2"></div>
                </div>
            </div>

            {/* The Wheel */}
            <div
                className="w-full h-full rounded-full border-[8px] border-white shadow-2xl relative overflow-hidden transition-transform duration-[4000ms] ease-[cubic-bezier(0.15,0,0.15,1)]"
                style={{
                    transform: `rotate(${rotation}deg)`,
                    background: gradient
                }}
            >
                {/* Labels */}
                {items.length > 0 && items.map((item, index) => {
                    const segmentAngle = 360 / items.length;
                    const labelRotation = segmentAngle * index + segmentAngle / 2;
                    return (
                        <div
                            key={index}
                            className="absolute top-0 left-1/2 h-1/2 origin-bottom flex items-start justify-center pt-2 pointer-events-none"
                            style={{
                                transform: `translateX(-50%) rotate(${labelRotation}deg)`,
                                width: '2px'
                            }}
                        >
                            <span
                                className="text-white font-black whitespace-nowrap text-[8px] md:text-[10px] uppercase tracking-tighter"
                                style={{
                                    writingMode: 'vertical-rl',
                                    transform: 'rotate(180deg)'
                                }}
                            >
                                {item}
                            </span>
                        </div>
                    );
                })}

                {items.length === 0 && (
                    <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-slate-300 font-bold uppercase tracking-widest text-xs">Vacío</span>
                    </div>
                )}
            </div>

            {/* Center Hub */}
            <div className="absolute inset-0 m-auto w-14 h-14 bg-white rounded-full shadow-xl z-10 flex items-center justify-center border-4 border-slate-50">
                <div className="w-9 h-9 bg-slate-900 rounded-xl flex items-center justify-center text-white">
                    <Sparkles className="w-4 h-4 animate-pulse" />
                </div>
            </div>

            {/* Glossy Overlay */}
            <div className="absolute inset-1 rounded-full pointer-events-none bg-gradient-to-br from-white/20 to-transparent z-0" />
        </div>
    );
}
