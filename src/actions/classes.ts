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

export async function addStudentsBulk(classId: string, names: string[]) {
    const supabase = createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Unauthorized");

    if (names.length === 0) return [];

    const studentsToInsert = names.map(name => ({
        class_id: classId,
        name: name.trim()
    }));

    const { data, error } = await supabase
        .from("students")
        .insert(studentsToInsert)
        .select();

    if (error) throw new Error(error.message);
    revalidatePath("/teacher/dashboard");
    return data;
}

export async function removeStudentFromClass(studentId: string) {
    const supabase = createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Unauthorized");

    // Verify ownership: student must belong to a class owned by this teacher
    const { data: student } = await supabase
        .from("students")
        .select("id, class:classes!inner(teacher_id)")
        .eq("id", studentId)
        .single();

    const classData = student?.class as { teacher_id: string } | { teacher_id: string }[] | null;
    const teacherId = Array.isArray(classData) ? classData[0]?.teacher_id : classData?.teacher_id;
    if (!student || teacherId !== user.id) {
        throw new Error("Unauthorized: you don't own this student's class");
    }

    const { error } = await supabase.from("students").delete().eq("id", studentId);
    if (error) throw new Error(error.message);
    revalidatePath("/teacher/dashboard");
    return { success: true };
}
