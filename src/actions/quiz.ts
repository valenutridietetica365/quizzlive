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

export async function duplicateQuiz(quizId: string) {
    const supabase = createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Unauthorized");

    // Fetch original quiz with questions
    const { data: original, error: fetchError } = await supabase
        .from("quizzes")
        .select("title, description, tags, class_id, folder_id, questions(question_text, question_type, options, correct_answer, time_limit, points, image_url, sort_order)")
        .eq("id", quizId)
        .eq("teacher_id", user.id)
        .single();

    if (fetchError || !original) throw new Error("Quiz not found or unauthorized");

    // Create new quiz
    const { data: newQuiz, error: quizError } = await supabase
        .from("quizzes")
        .insert({
            teacher_id: user.id,
            title: `${original.title} (copia)`,
            description: original.description,
            tags: original.tags,
            class_id: original.class_id,
            folder_id: original.folder_id,
        })
        .select("id")
        .single();

    if (quizError || !newQuiz) throw new Error("Error creating duplicate quiz");

    // Copy questions
    const questions = (original.questions as Question[]) || [];
    if (questions.length > 0) {
        const questionsToInsert = questions.map((q: Question) => ({
            quiz_id: newQuiz.id,
            question_text: q.question_text,
            question_type: q.question_type,
            options: q.options,
            correct_answer: q.correct_answer,
            time_limit: q.time_limit,
            points: q.points,
            image_url: q.image_url || null,
            sort_order: q.sort_order || 0,
        }));
        await supabase.from("questions").insert(questionsToInsert);
    }

    revalidatePath("/teacher/dashboard");
    return { success: true, quizId: newQuiz.id };
}

export async function exportQuizAsJson(quizId: string) {
    const supabase = createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Unauthorized");

    const { data: quiz, error } = await supabase
        .from("quizzes")
        .select("title, description, tags, questions(question_text, question_type, options, correct_answer, time_limit, points, image_url, sort_order)")
        .eq("id", quizId)
        .eq("teacher_id", user.id)
        .single();

    if (error || !quiz) throw new Error("Quiz not found or unauthorized");

    return {
        version: "1.0",
        platform: "QuizzLive",
        exportedAt: new Date().toISOString(),
        quiz: {
            title: quiz.title,
            description: quiz.description,
            tags: quiz.tags,
            questions: quiz.questions,
        },
    };
}
