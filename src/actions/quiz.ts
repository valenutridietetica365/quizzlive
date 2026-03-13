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
    class_ids?: string[];
    class_id?: string | null; // Keep for legacy
    folder_id: string | null;
    questions: Question[];
}) {
    const supabase = createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Unauthorized");

    const { data: result, error: rpcError } = await supabase.rpc('save_quiz_with_questions', {
        p_is_new: isNew,
        p_quiz_id: quizId,
        p_teacher_id: user.id,
        p_title: data.title,
        p_tags: data.tags,
        p_folder_id: data.folder_id,
        p_class_ids: data.class_ids || (data.class_id ? [data.class_id] : []),
        p_questions: data.questions.map((q, i) => ({
            ...q,
            sort_order: i,
            points: q.points || 1000,
            time_limit: q.time_limit || 20,
            image_url: q.image_url || null
        }))
    });

    if (rpcError) throw new Error(rpcError.message);

    revalidatePath("/teacher/dashboard");
    if (result.quiz_id) {
        revalidatePath(`/teacher/editor/${result.quiz_id}`);
    }

    return { success: true, quizId: result.quiz_id };
}

export async function duplicateQuiz(quizId: string) {
    const supabase = createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Unauthorized");

    // Fetch original quiz with questions and class assignments
    const { data: original, error: fetchError } = await supabase
        .from("quizzes")
        .select("title, description, tags, folder_id, quiz_classes(class_id), questions(question_text, question_type, options, correct_answer, time_limit, points, image_url, sort_order)")
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
            folder_id: original.folder_id,
        })
        .select("id")
        .single();

    if (quizError || !newQuiz) throw new Error("Error creating duplicate quiz");

    // Copy class assignments
    const assignments = (original.quiz_classes as { class_id: string }[]) || [];
    if (assignments.length > 0) {
        const assignmentsToInsert = assignments.map(a => ({
            quiz_id: newQuiz.id,
            class_id: a.class_id
        }));
        await supabase.from("quiz_classes").insert(assignmentsToInsert);
    }

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
