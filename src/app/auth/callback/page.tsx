"use client";

import { useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

export default function AuthCallback() {
    const router = useRouter();

    useEffect(() => {
        const handleAuth = async () => {
            const { data: { session }, error } = await supabase.auth.getSession();

            if (error) {
                console.error("Auth error:", error);
                router.push("/teacher/login?error=auth_failed");
                return;
            }

            if (session) {
                // Session found, move to dashboard
                router.push("/teacher/dashboard");
            } else {
                // No session found yet, Supabase might be processing the hash
                const { data: authListener } = supabase.auth.onAuthStateChange(
                    async (event, session) => {
                        if (event === "SIGNED_IN" && session) {
                            router.push("/teacher/dashboard");
                        }
                    }
                );

                // Timeout safe-guard
                const timeout = setTimeout(() => {
                    router.push("/teacher/login?error=timeout");
                }, 10000);

                return () => {
                    authListener.subscription.unsubscribe();
                    clearTimeout(timeout);
                };
            }
        };

        handleAuth();
    }, [router]);

    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 space-y-4">
            <Loader2 className="w-10 h-10 animate-spin text-blue-600" />
            <div className="text-center">
                <h2 className="text-xl font-bold text-slate-900">Verificando acceso...</h2>
                <p className="text-slate-500">Un momento, por favor.</p>
            </div>
        </div>
    );
}
