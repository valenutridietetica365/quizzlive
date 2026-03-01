"use server";

import { createSupabaseServerClient } from "@/lib/supabase-server";
import { revalidatePath } from "next/cache";

export async function createClass(name: string) {
    const supabase = createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Unauthorized");

    const { data, error } = await supabase
        .from("classes")
        .insert({ name, teacher_id: user.id })
        .select()
        .single();

    if (error) throw new Error(error.message);
    revalidatePath("/teacher/dashboard");
    return data;
}

export async function deleteClass(id: string) {
    const supabase = createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Unauthorized");

    const { error } = await supabase.from("classes").delete().eq("id", id).eq("teacher_id", user.id);
    if (error) throw new Error(error.message);
    revalidatePath("/teacher/dashboard");
    return { success: true };
}

export async function addStudentToClass(classId: string, name: string) {
    const supabase = createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Unauthorized");

    // RLS handles protecting whether this teacher owns the class
    const { data, error } = await supabase
        .from("students")
        .insert({ class_id: classId, name: name.trim() })
        .select()
        .single();

    if (error) throw new Error(error.message);
    revalidatePath("/teacher/dashboard");
    return data;
}

export async function removeStudentFromClass(studentId: string) {
    const supabase = createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Unauthorized");

    const { error } = await supabase.from("students").delete().eq("id", studentId);
    if (error) throw new Error(error.message);
    revalidatePath("/teacher/dashboard");
    return { success: true };
}
