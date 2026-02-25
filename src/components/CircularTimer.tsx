"use client";

interface CircularTimerProps {
    timeLeft: number;
    timeLimit: number;
    size?: "sm" | "lg";
}

export default function CircularTimer({ timeLeft, timeLimit, size = "sm" }: CircularTimerProps) {
    const isLarge = size === "lg";
    const dimension = isLarge ? 160 : 80;
    const strokeWidth = isLarge ? 10 : 6;
    const radius = (dimension - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;
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
