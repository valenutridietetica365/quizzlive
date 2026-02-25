"use client";

interface Participant {
    id: string;
    nickname: string;
    current_streak?: number;
}

interface ParticipantMarqueeProps {
    participants: Participant[];
    waitingText: string;
}

export default function ParticipantMarquee({ participants, waitingText }: ParticipantMarqueeProps) {
    return (
        <div className="p-5 bg-black/40 backdrop-blur-lg flex gap-4 overflow-hidden border-t border-white/5 whitespace-nowrap">
            {participants.length === 0 ? (
                <p className="text-slate-700 font-bold uppercase tracking-[0.3em] font-mono text-xs mx-auto animate-pulse">
                    {waitingText}
                </p>
            ) : (
                <div className="flex gap-6 animate-marquee">
                    {participants.map((p) => {
                        const streak = p.current_streak || 0;
                        const isHot = streak > 2;
                        return (
                            <div key={p.id} className="flex items-center gap-2 text-slate-400">
                                <span className={`w-1.5 h-1.5 rounded-full ${isHot ? 'bg-orange-500 animate-pulse shadow-[0_0_12px_rgba(249,115,22,0.8)]' : 'bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.8)]'}`} />
                                <span className={`text-xs font-black uppercase tracking-widest flex items-center gap-1 ${isHot ? 'text-orange-400' : ''}`}>
                                    {p.nickname}
                                    {isHot && <span className="animate-bounce">🔥</span>}
                                </span>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
