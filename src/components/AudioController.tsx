"use client";

import { useEffect, useRef, useState } from "react";
import { useQuizStore } from "@/lib/store";
import { Volume2, VolumeX } from "lucide-react";

interface AudioControllerProps {
    type: "waiting" | "active" | "finished" | "none";
}

const AUDIO_URLS = {
    waiting: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-8.mp3",
    active: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3",
    finished: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3",
    correct: "https://assets.mixkit.co/active_storage/sfx/2000/2000-preview.mp3",
    wrong: "https://assets.mixkit.co/active_storage/sfx/2001/2001-preview.mp3",
    streak: "https://assets.mixkit.co/active_storage/sfx/2012/2012-preview.mp3",
};

export default function AudioController({ type }: AudioControllerProps) {
    const { isMuted, toggleMute } = useQuizStore();
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const [hasInteracted, setHasInteracted] = useState(false);

    useEffect(() => {
        if (!audioRef.current) {
            audioRef.current = new Audio();
            audioRef.current.loop = true;
        }

        const audio = audioRef.current;

        if (type === "none") {
            audio.pause();
            return;
        }

        const url = AUDIO_URLS[type as keyof typeof AUDIO_URLS];
        if (audio.src !== url) {
            audio.src = url;
            audio.load();
        }

        if (hasInteracted && !isMuted) {
            audio.play().catch(e => console.warn("Audio play blocked:", e));
        } else {
            audio.pause();
        }

        return () => {
            audio.pause();
        };
    }, [type, isMuted, hasInteracted]);

    const handleInteraction = () => {
        setHasInteracted(true);
        if (isMuted) toggleMute();
    };

    return (
        <div className="fixed bottom-6 right-6 z-[60] flex items-center gap-3">
            {!hasInteracted && !isMuted ? (
                <button
                    onClick={handleInteraction}
                    className="bg-blue-600 text-white px-4 py-2 rounded-full font-black text-xs uppercase tracking-widest shadow-xl animate-bounce flex items-center gap-2"
                >
                    <Volume2 className="w-4 h-4" /> Activar Sonido
                </button>
            ) : (
                <button
                    onClick={toggleMute}
                    className={`p-4 rounded-2xl transition-all active:scale-90 shadow-lg ${isMuted
                            ? "bg-slate-200 text-slate-500 hover:bg-slate-300"
                            : "bg-white text-blue-600 hover:bg-blue-50 border border-blue-100"
                        }`}
                >
                    {isMuted ? <VolumeX className="w-6 h-6" /> : <Volume2 className="w-6 h-6 transition-all" />}
                </button>
            )}
        </div>
    );
}

// Helper to play SFX from anywhere
export const playSFX = (type: "correct" | "wrong" | "streak") => {
    const isMuted = useQuizStore.getState().isMuted;
    if (isMuted) return;

    const audio = new Audio(AUDIO_URLS[type]);
    audio.play().catch(() => { });
};
