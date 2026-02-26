"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/lib/supabase";
import { Heart, ThumbsUp, Star, Zap, Smile } from "lucide-react";



interface ReactionSystemProps {
    sessionId: string;
    isPresenter?: boolean;
}

const EMOJIS = [
    { icon: Heart, name: "Heart", color: "text-red-500", shadow: "shadow-red-200" },
    { icon: ThumbsUp, name: "ThumbsUp", color: "text-blue-500", shadow: "shadow-blue-200" },
    { icon: Smile, name: "Smile", color: "text-yellow-500", shadow: "shadow-yellow-200" },
    { icon: Zap, name: "Zap", color: "text-orange-500", shadow: "shadow-orange-200" },
    { icon: Star, name: "Star", color: "text-purple-500", shadow: "shadow-purple-200" },
];

export default function ReactionSystem({ sessionId, isPresenter = false }: ReactionSystemProps) {
    const [activeReactions, setActiveReactions] = useState<{ id: string; index: number; x: number }[]>([]);

    useEffect(() => {
        if (!isPresenter) return;

        const channel = supabase
            .channel(`session_reactions_${sessionId}`)
            .on(
                'postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'reactions', filter: `session_id=eq.${sessionId}` },
                (payload) => {
                    const index = EMOJIS.findIndex(e => e.name === payload.new.content);
                    const finalIndex = index === -1 ? Math.floor(Math.random() * EMOJIS.length) : index;

                    const id = Math.random().toString(36).substr(2, 9);
                    const x = 20 + Math.random() * 60; // 20% to 80% width

                    setActiveReactions(prev => [...prev, { id, index: finalIndex, x }]);

                    // Cleanup after animation
                    setTimeout(() => {
                        setActiveReactions(prev => prev.filter(r => r.id !== id));
                    }, 4000);
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [sessionId, isPresenter]);

    const sendReaction = async (index: number) => {
        const name = EMOJIS[index].name;

        await supabase.from("reactions").insert({
            session_id: sessionId,
            type: "emoji",
            content: name
        });
    };

    if (isPresenter) {
        return (
            <div className="fixed inset-0 pointer-events-none overflow-hidden z-[60]">
                <AnimatePresence>
                    {activeReactions.map((reaction) => {
                        const Icon = EMOJIS[reaction.index].icon;
                        const color = EMOJIS[reaction.index].color;
                        return (
                            <motion.div
                                key={reaction.id}
                                initial={{ y: "100vh", opacity: 0, scale: 0.5, x: `${reaction.x}vw` }}
                                animate={{
                                    y: "-10vh",
                                    opacity: [0, 1, 1, 0],
                                    scale: [0.5, 1.2, 1, 0.8],
                                    x: `${reaction.x + (Math.random() * 10 - 5)}vw`
                                }}
                                transition={{ duration: 3, ease: "easeOut" }}
                                className={`absolute text-4xl ${color}`}
                            >
                                <Icon className="w-12 h-12 fill-current" />
                            </motion.div>
                        );
                    })}
                </AnimatePresence>
            </div>
        );
    }

    return (
        <div className="flex gap-2 p-2 bg-white/10 backdrop-blur-lg rounded-full border border-white/20 shadow-2xl">
            {EMOJIS.map((emoji, i) => {
                const Icon = emoji.icon;
                return (
                    <button
                        key={i}
                        onClick={() => sendReaction(i)}
                        className={`p-2 rounded-full transition-all active:scale-75 hover:scale-110 ${emoji.color} hover:bg-white/10`}
                    >
                        <Icon className="w-6 h-6 fill-current" />
                    </button>
                );
            })}
        </div>
    );
}
