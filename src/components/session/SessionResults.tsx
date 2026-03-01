"use client";

import { useState } from "react";
import { BarChart3 } from "lucide-react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";

const FinalPodium = dynamic(() => import("@/components/FinalPodium"), { ssr: false });
const SessionAnalytics = dynamic(() => import("@/components/SessionAnalytics"), { ssr: false });
const SessionReport = dynamic(() => import("@/components/SessionReport"), { ssr: false });

interface SessionResultsProps {
    sessionId: string;
    t: (key: string) => string;
}

export default function SessionResults({ sessionId, t }: SessionResultsProps) {
    const [showAnalytics, setShowAnalytics] = useState(false);
    const router = useRouter();

    return (
        <div className="max-w-2xl w-full space-y-8 animate-in fade-in duration-1000">
            <FinalPodium sessionId={sessionId} />

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <button
                    onClick={() => setShowAnalytics(!showAnalytics)}
                    className={`btn-premium flex items-center justify-center gap-2 ${showAnalytics ? "!bg-slate-700" : "!bg-emerald-600"}`}
                >
                    <BarChart3 className="w-5 h-5" />
                    {t('session.view_detailed_analytics')}
                </button>
                <button
                    onClick={() => router.push("/teacher/dashboard")}
                    className="btn-premium !bg-blue-600 flex items-center justify-center gap-2"
                >
                    <BarChart3 className="w-5 h-5" />
                    {t('session.view_results')}
                </button>
            </div>

            {showAnalytics && (
                <div className="w-full space-y-12 animate-in fade-in slide-in-from-top-4 duration-700">
                    <SessionAnalytics sessionId={sessionId} />
                    <SessionReport sessionId={sessionId} />
                </div>
            )}
        </div>
    );
}
