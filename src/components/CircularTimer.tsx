"use client";

import { useEffect, useState } from "react";

interface CircularTimerProps {
    startedAt: string | null;
    timeLimit: number;
    size?: "sm" | "lg";
    onTimeUp?: () => void;
}

export default function CircularTimer({ startedAt, timeLimit, size = "sm", onTimeUp }: CircularTimerProps) {
    const isLarge = size === "lg";
    const dimension = isLarge ? 160 : 80;
    const strokeWidth = isLarge ? 10 : 6;
    const radius = (dimension - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;

    const [timeLeft, setTimeLeft] = useState<number>(timeLimit);

    useEffect(() => {
        if (!startedAt) {
            setTimeLeft(timeLimit);
            return;
        }

        const startMs = new Date(startedAt).getTime();

        // Initial check
        const initialElapsed = Math.floor((Date.now() - startMs) / 1000);
        const initialRemaining = Math.max(0, timeLimit - initialElapsed);
        setTimeLeft(initialRemaining);
        if (initialRemaining <= 0) {
            onTimeUp?.();
            return;
        }

        const timer = setInterval(() => {
            const elapsed = Math.floor((Date.now() - startMs) / 1000);
            const remaining = Math.max(0, timeLimit - elapsed);
            setTimeLeft(remaining);

            if (remaining <= 0) {
                clearInterval(timer);
                onTimeUp?.();
            }
        }, 1000);

        return () => clearInterval(timer);
    }, [startedAt, timeLimit, onTimeUp]);

    const progress = Math.max(0, timeLeft / timeLimit);
    const dashOffset = circumference * (1 - progress);
    const color = timeLeft < 5 ? "#ef4444" : timeLeft < 10 ? "#f59e0b" : "#3b82f6";
    const fontSize = isLarge ? "text-4xl" : "text-xl";

    return (
        <div className="relative flex items-center justify-center" style={{ width: dimension, height: dimension }}>
            <svg
                width={dimension}
                height={dimension}
                className="-rotate-90"
                style={{ position: "absolute" }}
            >
                {/* Background track */}
                <circle
                    cx={dimension / 2}
                    cy={dimension / 2}
                    r={radius}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={strokeWidth}
                    className="text-slate-200 dark:text-slate-800"
                />
                {/* Progress arc */}
                <circle
                    cx={dimension / 2}
                    cy={dimension / 2}
                    r={radius}
                    fill="none"
                    stroke={color}
                    strokeWidth={strokeWidth}
                    strokeLinecap="round"
                    strokeDasharray={circumference}
                    strokeDashoffset={dashOffset}
                    style={{ transition: "stroke-dashoffset 1s linear, stroke 0.5s ease" }}
                />
            </svg>
            <span
                className={`relative z-10 font-black tabular-nums ${fontSize} transition-colors duration-500`}
                style={{ color }}
            >
                {timeLeft}
            </span>
        </div>
    );
}
