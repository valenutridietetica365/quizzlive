"use server";

import { createSupabaseServerClient } from "@/lib/supabase-server";
import { revalidatePath } from "next/cache";

export async function startSession(quizId: string, mode: string, config: Record<string, unknown> = {}) {
    const supabase = createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Unauthorized");

    let pin = "";
    let unique = false;
    let attempts = 0;

    // Securely generate a unique pin purely on the backend
    while (!unique && attempts < 3) {
        pin = Math.floor(100000 + Math.random() * 900000).toString();
        const { data: existing } = await supabase.from("sessions").select("id").eq("pin", pin).in("status", ["waiting", "active"]).maybeSingle();
        if (!existing) unique = true;
        attempts++;
    }

    const { data, error } = await supabase
        .from("sessions")
        .insert({ quiz_id: quizId, pin, status: "waiting", game_mode: mode, config })
        .select()
        .single();

    if (error) throw new Error(error.message);
    revalidatePath("/teacher/dashboard");
    return data;
}

export async function finishSession(sessionId: string) {
    const supabase = createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Unauthorized");

    // Verify ownership: session must belong to a quiz owned by this teacher
    const { data: session } = await supabase
        .from("sessions")
        .select("id, quiz:quizzes!inner(teacher_id)")
        .eq("id", sessionId)
        .single();

    if (!session || (session.quiz as unknown as { teacher_id: string }).teacher_id !== user.id) {
        throw new Error("Unauthorized: you don't own this session");
    }

    const { error } = await supabase
        .from("sessions")
        .update({ status: "finished", finished_at: new Date().toISOString() })
        .eq("id", sessionId);

    if (error) throw new Error(error.message);
    revalidatePath("/teacher/dashboard");
    return { success: true };
}

export async function deleteHistory(sessionId: string) {
    const supabase = createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Unauthorized");

    // Verify ownership: session must belong to a quiz owned by this teacher
    const { data: session } = await supabase
        .from("sessions")
        .select("id, quiz:quizzes!inner(teacher_id)")
        .eq("id", sessionId)
        .single();

    if (!session || (session.quiz as unknown as { teacher_id: string }).teacher_id !== user.id) {
        throw new Error("Unauthorized: you don't own this session");
    }

    const { error } = await supabase.from("sessions").delete().eq("id", sessionId);
    if (error) throw new Error(error.message);
    revalidatePath("/teacher/dashboard");
    return { success: true };
}

export async function deleteMultipleHistory(sessionIds: string[]) {
    const supabase = createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Unauthorized");

    if (!sessionIds.length) return { success: true };

    // Verify ownership for all sessions
    const { data: sessions } = await supabase
        .from("sessions")
        .select("id, quiz:quizzes!inner(teacher_id)")
        .in("id", sessionIds);

    const unauthorized = sessions?.some(s => (s.quiz as unknown as { teacher_id: string }).teacher_id !== user.id);
    if (unauthorized || !sessions || sessions.length !== sessionIds.length) {
        throw new Error("Unauthorized: you don't own all these sessions");
    }

    const { error } = await supabase.from("sessions").delete().in("id", sessionIds);
    if (error) throw new Error(error.message);

    revalidatePath("/teacher/dashboard");
    return { success: true };
}
