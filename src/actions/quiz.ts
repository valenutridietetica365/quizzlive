"use server";

import { createSupabaseServerClient } from "@/lib/supabase-server";
import { revalidatePath } from "next/cache";
import { Question } from "@/lib/schemas";

export async function deleteQuiz(id: string) {
    const supabase = createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Unauthorized");

    const { error } = await supabase.from("quizzes").delete().eq("id", id).eq("teacher_id", user.id);
    if (error) throw new Error(error.message);

    revalidatePath("/teacher/dashboard");
    return { success: true };
}

export async function createFolder(name: string, color: string) {
    const supabase = createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Unauthorized");

    const { data, error } = await supabase
        .from("folders")
        .insert({ name, color, teacher_id: user.id })
        .select()
        .single();

    if (error) throw new Error(error.message);
    revalidatePath("/teacher/dashboard");
    return data;
}

export async function deleteFolder(id: string) {
    const supabase = createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Unauthorized");

    const { error } = await supabase.from("folders").delete().eq("id", id).eq("teacher_id", user.id);
    if (error) throw new Error(error.message);

    revalidatePath("/teacher/dashboard");
    return { success: true };
}

export async function updateQuizDetails(quizId: string, updates: { title?: string, folder_id?: string | null, class_id?: string | null }) {
    const supabase = createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Unauthorized");

    const { error } = await supabase
        .from("quizzes")
        .update(updates)
        .eq("id", quizId)
        .eq("teacher_id", user.id);

    if (error) throw new Error(error.message);
    revalidatePath(`/teacher/editor/${quizId}`);
    revalidatePath("/teacher/dashboard");
    return { success: true };
}

export async function saveQuizData(isNew: boolean, quizId: string | null, data: {
    title: string;
    tags: string[];
    class_id: string | null;
    folder_id: string | null;
    questions: Question[];
}) {
    const supabase = createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Unauthorized");

    let finalQuizId = quizId;

    if (!isNew && finalQuizId) {
        // Check for active sessions
        const { data: activeSessions, error: sessionCheckError } = await supabase
            .from("sessions")
            .select("id")
            .eq("quiz_id", finalQuizId)
            .in("status", ["waiting", "active"]);

        if (sessionCheckError) throw new Error("Error checking sessions");
        if (activeSessions && activeSessions.length > 0) {
            throw new Error("No se puede editar un cuestionario mientras hay una sesión activa o en espera.");
        }

        // Update quiz
        const { error: quizError } = await supabase
            .from("quizzes")
            .update({
                title: data.title,
                tags: data.tags,
                class_id: data.class_id,
                folder_id: data.folder_id
            })
            .eq("id", finalQuizId)
            .eq("teacher_id", user.id);

        if (quizError) throw new Error("Error updating quiz");

        // Delete existing questions
        const { error: deleteError } = await supabase
            .from("questions")
            .delete()
            .eq("quiz_id", finalQuizId);

        if (deleteError) throw new Error("Error deleting old questions");

    } else {
        // Insert new quiz
        const { data: newQuiz, error: quizError } = await supabase
            .from("quizzes")
            .insert({
                title: data.title,
                tags: data.tags,
                class_id: data.class_id,
                folder_id: data.folder_id,
                teacher_id: user.id
            })
            .select()
            .single();

        if (quizError || !newQuiz) throw new Error("Error creating quiz");
        finalQuizId = newQuiz.id;
    }

    // Insert new questions
    const questionsToInsert = data.questions.map((q, index) => ({
        quiz_id: finalQuizId,
        question_text: q.question_text,
        question_type: q.question_type,
        options: q.options,
        correct_answer: q.correct_answer,
        image_url: q.image_url || null,
        time_limit: q.time_limit,
        points: q.points || 1000,
        sort_order: index
    }));

    const { error: questionsError } = await supabase
        .from("questions")
        .insert(questionsToInsert);

    if (questionsError) throw new Error("Error inserting questions");

    revalidatePath("/teacher/dashboard");
    if (finalQuizId) {
        revalidatePath(`/teacher/editor/${finalQuizId}`);
    }

    return { success: true, quizId: finalQuizId };
}
