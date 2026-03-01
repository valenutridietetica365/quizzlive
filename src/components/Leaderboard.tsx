"use client";

import React, { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { Trophy, Medal, Crown } from "lucide-react";

interface LeaderboardEntry {
    id: string;
    nickname: string;
    score: number;
    team: string | null;
    is_eliminated: boolean;
}

interface LeaderboardProps {
    sessionId: string;
    currentParticipantId?: string;
    compact?: boolean;
    variant?: 'full' | 'compact' | 'minimal';
}

const Leaderboard = React.memo(function Leaderboard({
    sessionId,
    currentParticipantId,
    compact = false,
    variant = 'full'
}: LeaderboardProps) {
    const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [sessionMode, setSessionMode] = useState<string>('classic');
    const [teamScores, setTeamScores] = useState<Record<string, number>>({});

    const fetchLeaderboard = useCallback(async () => {
        try {
            // Fetch session mode
            const { data: sessionData } = await supabase
                .from("sessions")
                .select("game_mode")
                .eq("id", sessionId)
                .single();
            if (sessionData) setSessionMode(sessionData.game_mode);

            // Fetch participants joining with scores
            const { data, error } = await supabase
                .from("participants")
                .select(`
                    id, 
                    nickname, 
                    team, 
                    is_eliminated,
                    scores:scores(total_points)
                `)
                .eq("session_id", sessionId);

            if (error || !data) return;

            // Map data to LeaderboardEntry format
            const participants: LeaderboardEntry[] = (data as any[]).map(p => ({
                id: p.id,
                nickname: p.nickname,
                team: p.team,
                is_eliminated: p.is_eliminated,
                score: p.scores?.[0]?.total_points ?? 0
            }));

            // Sort participants by score descending
            participants.sort((a, b) => b.score - a.score);
            setEntries(participants);

            // Team Scores calculation
            if (sessionData?.game_mode === 'teams') {
                const scores: Record<string, number> = {};
                participants.forEach(p => {
                    if (p.team) {
                        scores[p.team] = (scores[p.team] || 0) + (p.score || 0);
                    }
                });
                setTeamScores(scores);
            }
        } finally {
            setLoading(false);
        }
    }, [sessionId]);

    useEffect(() => {
        fetchLeaderboard();

        const participantsChannel = supabase
            .channel(`participants_realtime_${sessionId}`)
            .on(
                "postgres_changes",
                { event: "*", schema: "public", table: "participants", filter: `session_id=eq.${sessionId}` },
                () => fetchLeaderboard()
            )
            .subscribe();

        const scoresChannel = supabase
            .channel(`scores_realtime_${sessionId}`)
            .on(
                "postgres_changes",
                { event: "*", schema: "public", table: "scores", filter: `session_id=eq.${sessionId}` },
                () => fetchLeaderboard()
            )
            .subscribe();

        return () => {
            supabase.removeChannel(participantsChannel);
            supabase.removeChannel(scoresChannel);
        };
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

    if (loading) return null; // Invisible while loading if minimal

    if (variant === 'minimal') {
        const top3 = entries.slice(0, 3);
        if (top3.length === 0) return null;

        return (
            <div className="flex flex-col items-center gap-2 animate-in fade-in slide-in-from-top-4 duration-700">
                <div className="flex items-center gap-3 bg-slate-900/90 backdrop-blur-xl px-5 py-2.5 rounded-2xl border border-white/10 shadow-2xl ring-1 ring-white/5">
                    <div className="flex items-center gap-2 border-r border-white/10 pr-4 mr-1">
                        <Trophy className="w-4 h-4 text-amber-400 animate-pulse" />
                        <span className="text-[10px] font-black text-amber-500/80 uppercase tracking-[0.2em]">Live Top 3</span>
                    </div>
                    <div className="flex items-center gap-6">
                        {top3.map((entry, i) => {
                            const isMe = entry.id === currentParticipantId;
                            const rank = i + 1;
                            return (
                                <div key={entry.id} className="flex items-center gap-2.5 group">
                                    <div className="flex items-center justify-center">
                                        {rankIcon(rank)}
                                    </div>
                                    <div className="flex flex-col">
                                        <span className={`text-[11px] font-black truncate max-w-[90px] transition-colors ${isMe ? 'text-blue-400' : 'text-slate-200'}`}>
                                            {entry.nickname}
                                            {isMe && <span className="ml-1 text-[8px] text-blue-500">★</span>}
                                        </span>
                                        <span className="text-[9px] font-bold text-slate-500 mt-[-2px] tabular-nums tracking-wider uppercase">
                                            {entry.score.toLocaleString()} pts
                                        </span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        );
    }

    if (entries.length === 0) return (
        <div className="text-center py-6 text-slate-500 font-black text-xs uppercase tracking-widest">
            Sin participantes aún...
        </div>
    );

    const myEntry = entries.find(e => e.id === currentParticipantId);
    const myRank = entries.findIndex(e => e.id === currentParticipantId) + 1;

    return (
        <div className="w-full space-y-4">
            {!compact && (
                <div className="flex items-center gap-2 mb-4">
                    <Trophy className="w-5 h-5 text-amber-400" />
                    <h3 className="font-black text-white uppercase tracking-widest text-xs">
                        {sessionMode === 'teams' ? 'Ranking de Equipos' : 'Ranking'}
                    </h3>
                </div>
            )}

            {sessionMode === 'teams' ? (
                <div className="space-y-6">
                    {Object.entries(teamScores)
                        .sort(([, a], [, b]) => b - a)
                        .map(([team, score]) => (
                            <div key={team} className="space-y-2">
                                <div className="flex justify-between items-end">
                                    <span className="font-black text-white uppercase tracking-widest text-[10px]">{team}</span>
                                    <span className="font-black text-blue-400 text-lg">{score.toLocaleString()}</span>
                                </div>
                                <div className="h-3 bg-slate-950 rounded-full border border-white/5 overflow-hidden">
                                    <div
                                        className={`h-full transition-all duration-1000 ${team.includes('Azul') ? 'bg-blue-600' : 'bg-red-600'}`}
                                        style={{ width: `${Math.min((score / (Math.max(...Object.values(teamScores)) || 1)) * 100, 100)}%` }}
                                    />
                                </div>
                            </div>
                        ))}
                </div>
            ) : (
                <div className="space-y-2">
                    {entries.slice(0, compact ? 5 : 15).map((entry, index) => {
                        const isMe = entry.id === currentParticipantId;
                        const rank = index + 1;
                        return (
                            <div
                                key={entry.id}
                                className={`flex items-center gap-3 px-4 py-3 rounded-2xl border transition-all ${rankBg(rank)} ${isMe ? "ring-2 ring-blue-500 scale-[1.02]" : ""}`}
                            >
                                <div className="flex items-center justify-center w-6 h-6 flex-shrink-0">
                                    {rankIcon(rank)}
                                </div>
                                <span className={`flex-1 font-black truncate text-sm ${isMe ? "text-blue-400" : "text-white"} ${entry.is_eliminated ? 'text-slate-600 line-through' : ''}`}>
                                    {entry.nickname}
                                    {isMe && <span className="ml-2 text-[10px] font-black text-blue-400 uppercase tracking-widest bg-blue-500/10 px-2 py-0.5 rounded-full">Tú</span>}
                                    {entry.is_eliminated && <span className="ml-2">💀</span>}
                                </span>
                                <span className="font-black text-sm text-slate-300 tabular-nums">
                                    {entry.score.toLocaleString()}
                                </span>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Show my position if not in top list */}
            {myEntry && myRank > (compact ? 5 : 15) && (
                <div className="flex items-center gap-3 px-4 py-3 rounded-2xl border bg-blue-500/10 border-blue-500/20 ring-2 ring-blue-500 mt-2">
                    <span className="text-xs font-black text-blue-400 w-6 text-center">{myRank}</span>
                    <span className="flex-1 font-black text-blue-400 truncate text-sm">{myEntry.nickname} (Tú)</span>
                    <span className="font-black text-sm text-blue-300 tabular-nums">{myEntry.score.toLocaleString()}</span>
                </div>
            )}
        </div>
    );
});

export default Leaderboard;
