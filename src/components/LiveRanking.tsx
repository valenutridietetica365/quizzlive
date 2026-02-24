"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Trophy, Medal } from "lucide-react";

interface LiveRankingProps {
    sessionId: string;
}

export default function LiveRanking({ sessionId }: LiveRankingProps) {
    const [scores, setScores] = useState<any[]>([]);

    useEffect(() => {
        fetchScores();

        const channel = supabase
            .channel(`ranking_${sessionId}`)
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'scores', filter: `session_id=eq.${sessionId}` },
                () => fetchScores()
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [sessionId]);

    const fetchScores = async () => {
        const { data } = await supabase
            .from("scores")
            .select("*, participant:participants(nickname)")
            .eq("session_id", sessionId)
            .order("total_points", { ascending: false })
            .limit(5);

        setScores(data || []);
    };

    return (
        <div className="w-full max-w-md mx-auto space-y-4">
            <h3 className="text-xl font-black text-white flex items-center gap-2 justify-center mb-6">
                <Trophy className="w-6 h-6 text-yellow-500" />
                TOP 5 RANKING
            </h3>

            {scores.map((score, index) => (
                <div
                    key={score.id}
                    className={`flex items-center justify-between p-4 rounded-2xl border-b-4 transition-all animate-in slide-in-from-right duration-300 delay-${index * 100} ${index === 0 ? "bg-yellow-500/20 border-yellow-500" :
                            index === 1 ? "bg-slate-400/20 border-slate-400" :
                                index === 2 ? "bg-amber-700/20 border-amber-800" :
                                    "bg-slate-800 border-slate-700"
                        }`}
                >
                    <div className="flex items-center gap-4">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-black ${index === 0 ? "bg-yellow-500 text-slate-900" : "bg-slate-700 text-slate-300"
                            }`}>
                            {index + 1}
                        </div>
                        <span className="font-bold text-lg">{score.participant?.nickname}</span>
                    </div>
                    <span className="font-black text-xl">{score.total_points}</span>
                </div>
            ))}

            {scores.length === 0 && (
                <p className="text-slate-500 italic text-center">Esperando puntuaciones...</p>
            )}
        </div>
    );
}
