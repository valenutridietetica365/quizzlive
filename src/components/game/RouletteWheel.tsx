"use client";

import { useState, useEffect, useRef } from "react";
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
    const wheelRef = useRef<HTMLDivElement>(null);

    // Dynamic color palette for the segments
    const colors = [
        "#3b82f6", "#ef4444", "#10b981", "#f59e0b",
        "#8b5cf6", "#ec4899", "#06b6d4", "#f43f5e"
    ];

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

        // Calculate the base rotation to land on the winner segment
        // 360 - (winnerIndex * segmentAngle) aligns the winner with the top (0 degrees)
        // We add multiple full rotations (5-8) for the effect
        const extraRotations = 5 + Math.floor(Math.random() * 3);
        const finalRotation = rotation + (extraRotations * 360) + (360 - (winnerIndex * segmentAngle)) - (rotation % 360);

        setRotation(finalRotation);

        setTimeout(() => {
            setIsAnimating(false);
            onFinish(items[winnerIndex]);
        }, 4000); // Animation duration matches CSS
    };

    return (
        <div className="relative w-full max-w-[400px] aspect-square mx-auto flex items-center justify-center p-4">
            {/* Top Indicator */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 z-20 -mt-2">
                <div className="w-8 h-8 bg-slate-900 shadow-xl rounded-full flex items-center justify-center border-4 border-white">
                    <div className="w-0 h-0 border-l-[8px] border-l-transparent border-r-[8px] border-r-transparent border-t-[12px] border-t-blue-500 translate-y-2"></div>
                </div>
            </div>

            {/* The Wheel */}
            <div
                ref={wheelRef}
                className="w-full h-full rounded-full border-[12px] border-white shadow-2xl relative overflow-hidden transition-transform duration-[4000ms] ease-[cubic-bezier(0.15,0,0.15,1)]"
                style={{
                    transform: `rotate(${rotation}deg)`,
                    backgroundColor: "#f8fafc"
                }}
            >
                {items.length > 0 ? (
                    items.map((item, index) => {
                        const angle = 360 / items.length;
                        const rotate = angle * index;
                        const skew = 90 - angle;

                        return (
                            <div
                                key={index}
                                className="absolute top-0 right-0 w-1/2 h-1/2 origin-bottom-left border-l border-white/20"
                                style={{
                                    transform: `rotate(${rotate}deg) skewY(-${skew}deg)`,
                                    backgroundColor: colors[index % colors.length]
                                }}
                            >
                                <div
                                    className="absolute bottom-0 left-0 w-[140%] h-[140%] origin-bottom-left flex items-center justify-center -rotate-45 skew-y-[inherit] italic-none"
                                    style={{
                                        transform: `skewY(${skew}deg) rotate(${angle / 2}deg)`,
                                        width: '200px',
                                        height: '200px',
                                        paddingLeft: '60px'
                                    }}
                                >
                                    <span
                                        className="text-white font-black whitespace-nowrap overflow-hidden text-ellipsis max-w-[120px] text-xs uppercase tracking-tight"
                                        style={{ transform: 'rotate(-90deg)' }}
                                    >
                                        {item}
                                    </span>
                                </div>
                            </div>
                        );
                    })
                ) : (
                    <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-slate-300 font-bold uppercase tracking-widest text-sm">Vacío</span>
                    </div>
                )}
            </div>

            {/* Center Hub */}
            <div className="absolute inset-0 m-auto w-16 h-16 bg-white rounded-full shadow-xl z-10 flex items-center justify-center border-4 border-slate-50">
                <div className="w-10 h-10 bg-slate-900 rounded-xl flex items-center justify-center text-white scale-90 sm:scale-100">
                    <Sparkles className="w-5 h-5 animate-pulse" />
                </div>
            </div>

            {/* Glossy Overlay */}
            <div className="absolute inset-4 rounded-full pointer-events-none bg-gradient-to-br from-white/20 to-transparent z-0" />
        </div>
    );
}
