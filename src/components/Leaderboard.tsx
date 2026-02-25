"use client";

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { Trophy, Medal, Crown } from "lucide-react";

interface LeaderboardEntry {
    participant_id: string;
    nickname: string;
    total_points: number;
    rank: number;
}

interface LeaderboardProps {
    sessionId: string;
    currentParticipantId?: string;
    compact?: boolean;
}

export default function Leaderboard({ sessionId, currentParticipantId, compact = false }: LeaderboardProps) {
    const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchLeaderboard = useCallback(async () => {
        const { data, error } = await supabase
            .from("scores")
            .select("participant_id, total_points, participants(nickname)")
            .eq("session_id", sessionId)
            .order("total_points", { ascending: false })
            .limit(compact ? 5 : 15);

        if (error || !data) return;

        const ranked = data.map((row, index) => ({
            participant_id: row.participant_id,
            nickname: (row.participants as unknown as { nickname: string })?.nickname || "???",
            total_points: row.total_points,
            rank: index + 1,
        }));

        setEntries(ranked);
        setLoading(false);
    }, [sessionId, compact]);

    useEffect(() => {
        fetchLeaderboard();

        const channel = supabase
            .channel(`leaderboard_${sessionId}`)
            .on(
                "postgres_changes",
                { event: "*", schema: "public", table: "scores", filter: `session_id=eq.${sessionId}` },
                () => fetchLeaderboard()
            )
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, [sessionId, fetchLeaderboard]);

    const rankIcon = (rank: number) => {
        if (rank === 1) return <Crown className="w-4 h-4 text-amber-400" />;
        if (rank === 2) return <Medal className="w-4 h-4 text-slate-400" />;
        if (rank === 3) return <Medal className="w-4 h-4 text-amber-600" />;
        return <span className="text-xs font-black text-slate-600 w-4 text-center">{rank}</span>;
    };

    const rankBg = (rank: number) => {
        if (rank === 1) return "bg-amber-500/10 border-amber-500/20";
        if (rank === 2) return "bg-slate-700/50 border-slate-600/20";
        if (rank === 3) return "bg-amber-900/20 border-amber-700/20";
        return "bg-slate-900/50 border-white/5";
    };

    if (loading) return (
        <div className="flex items-center justify-center p-6">
            <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
    );

    if (entries.length === 0) return (
        <div className="text-center py-6 text-slate-500 font-black text-xs uppercase tracking-widest">
            Nadie ha respondido aún...
        </div>
    );

    const myEntry = entries.find(e => e.participant_id === currentParticipantId);

    return (
        <div className="w-full space-y-2">
            {!compact && (
                <div className="flex items-center gap-2 mb-4">
                    <Trophy className="w-5 h-5 text-amber-400" />
                    <h3 className="font-black text-white uppercase tracking-widest text-xs">Ranking</h3>
                </div>
            )}
            {entries.map((entry) => {
                const isMe = entry.participant_id === currentParticipantId;
                return (
                    <div
                        key={entry.participant_id}
                        className={`flex items-center gap-3 px-4 py-3 rounded-2xl border transition-all ${rankBg(entry.rank)} ${isMe ? "ring-2 ring-blue-500 scale-[1.02]" : ""}`}
                    >
                        <div className="flex items-center justify-center w-6 h-6 flex-shrink-0">
                            {rankIcon(entry.rank)}
                        </div>
                        <span className={`flex-1 font-black truncate text-sm ${isMe ? "text-blue-400" : "text-white"}`}>
                            {entry.nickname}
                            {isMe && <span className="ml-2 text-[10px] font-black text-blue-400 uppercase tracking-widest bg-blue-500/10 px-2 py-0.5 rounded-full">Tú</span>}
                        </span>
                        <span className="font-black text-sm text-slate-300 tabular-nums">
                            {entry.total_points.toLocaleString()}
                        </span>
                    </div>
                );
            })}

            {/* Show my position if not in top list */}
            {myEntry && myEntry.rank > (compact ? 5 : 15) && (
                <div className="flex items-center gap-3 px-4 py-3 rounded-2xl border bg-blue-500/10 border-blue-500/20 ring-2 ring-blue-500 mt-2">
                    <span className="text-xs font-black text-blue-400 w-6 text-center">{myEntry.rank}</span>
                    <span className="flex-1 font-black text-blue-400 truncate text-sm">{myEntry.nickname} (Tú)</span>
                    <span className="font-black text-sm text-blue-300 tabular-nums">{myEntry.total_points.toLocaleString()}</span>
                </div>
            )}
        </div>
    );
}
