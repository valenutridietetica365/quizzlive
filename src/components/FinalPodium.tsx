"use client";

import React, { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { Crown, Medal, Trophy } from "lucide-react";
import confetti from "canvas-confetti";

interface PodiumEntry {
    participant_id: string;
    nickname: string;
    total_points: number;
    rank: number;
}

interface FinalPodiumProps {
    sessionId: string;
    highlightId?: string;
}

const FinalPodium = React.memo(function FinalPodium({ sessionId, highlightId }: FinalPodiumProps) {
    const [top3, setTop3] = useState<PodiumEntry[]>([]);
    const [myRank, setMyRank] = useState<PodiumEntry | null>(null);
    const [loading, setLoading] = useState(true);

    const fetchTop3 = useCallback(async () => {
        const { data } = await supabase
            .from("scores")
            .select("participant_id, total_points, participants(nickname)")
            .eq("session_id", sessionId)
            .order("total_points", { ascending: false })
            .limit(10);

        if (!data) return;

        const all = data.map((row, i) => ({
            participant_id: row.participant_id,
            nickname: (row.participants as unknown as { nickname: string })?.nickname || "???",
            total_points: row.total_points,
            rank: i + 1,
        }));

        setTop3(all.slice(0, 3));

        if (highlightId) {
            const me = all.find(e => e.participant_id === highlightId);
            if (me && me.rank > 3) setMyRank(me);
        }

        setLoading(false);
    }, [sessionId, highlightId]);

    useEffect(() => {
        fetchTop3();
    }, [fetchTop3]);

    useEffect(() => {
        if (!loading && top3.length > 0) {
            // Optimized Confetti: 3 discrete bursts instead of a continuous loop
            const duration = 3 * 1000;
            const animationEnd = Date.now() + duration;
            const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 };

            const randomInRange = (min: number, max: number) => Math.random() * (max - min) + min;

            const interval: NodeJS.Timeout = setInterval(function () {
                const timeLeft = animationEnd - Date.now();

                if (timeLeft <= 0) {
                    return clearInterval(interval);
                }

                const particleCount = 50 * (timeLeft / duration);

                // Fire from left and right
                confetti({
                    ...defaults,
                    particleCount,
                    origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 }
                });
                confetti({
                    ...defaults,
                    particleCount,
                    origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 }
                });
            }, 250);

            return () => clearInterval(interval);
        }
    }, [loading, top3]);

    // Podium visual order: 2nd, 1st, 3rd
    const podiumOrder = [
        { rank: 2, height: "h-32", bg: "bg-slate-600", icon: <Medal className="w-10 h-10 text-slate-300" />, delay: "delay-300" },
        { rank: 1, height: "h-48", bg: "bg-amber-500", icon: <Crown className="w-12 h-12 text-white" />, delay: "delay-100" },
        { rank: 3, height: "h-24", bg: "bg-amber-700", icon: <Medal className="w-10 h-10 text-amber-300" />, delay: "delay-500" },
    ];

    if (loading) return (
        <div className="flex items-center justify-center p-12">
            <div className="w-10 h-10 border-4 border-amber-400 border-t-transparent rounded-full animate-spin" />
        </div>
    );

    return (
        <div className="w-full flex flex-col items-center gap-10 animate-in fade-in duration-1000">
            <div className="flex items-center gap-2">
                <Trophy className="w-8 h-8 text-amber-400 animate-float" />
                <h2 className="text-3xl md:text-4xl font-black text-white uppercase tracking-wider">Podio Final</h2>
                <Trophy className="w-8 h-8 text-amber-400 animate-float" />
            </div>

            <div className="flex items-end justify-center gap-4 w-full max-w-lg">
                {podiumOrder.map(({ rank, height, bg, icon, delay }) => {
                    const entry = top3.find(e => e.rank === rank);
                    const isMe = entry?.participant_id === highlightId;

                    return (
                        <div key={rank} className={`flex flex-col items-center gap-3 animate-in slide-in-from-bottom-8 duration-700 ${delay}`}>
                            {/* Avatar / icon */}
                            <div className={`w-16 h-16 rounded-full flex items-center justify-center ${bg} shadow-xl ${isMe ? "ring-4 ring-blue-400" : ""}`}>
                                {icon}
                            </div>
                            {/* Nickname */}
                            <p className={`font-black text-center text-sm max-w-[90px] truncate ${isMe ? "text-blue-400" : "text-white"}`}>
                                {entry?.nickname ?? "—"}
                            </p>
                            {/* Points */}
                            <p className="text-xs font-black text-slate-400 tabular-nums">
                                {entry ? entry.total_points.toLocaleString() : "—"}
                            </p>
                            {/* Podium block */}
                            <div className={`w-24 ${height} ${bg} rounded-t-2xl flex items-start justify-center pt-3`}>
                                <span className="text-5xl font-black text-white/80">{rank}</span>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* My rank if outside top 3 */}
            {myRank && (
                <div className="px-6 py-4 rounded-2xl bg-blue-500/10 border-2 border-blue-500/30 text-center">
                    <p className="text-blue-400 font-black text-sm uppercase tracking-widest">Tu posición</p>
                    <p className="text-white font-black text-3xl">#{myRank.rank} — {myRank.nickname}</p>
                    <p className="text-slate-400 text-sm font-bold">{myRank.total_points.toLocaleString()} pts</p>
                </div>
            )}
        </div>
    );
});

export default FinalPodium;
