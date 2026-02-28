import { z } from "zod";

export const QuestionTypeSchema = z.enum([
    "multiple_choice",
    "true_false",
    "fill_in_the_blank",
    "matching",
]);

export const QuestionSchema = z.object({
    id: z.string().nullable().optional(),
    quiz_id: z.string().nullable().optional(),
    question_text: z.string().min(1, "La pregunta no puede estar vacía"),
    question_type: QuestionTypeSchema,
    options: z.array(z.string()),
    correct_answer: z.string().min(1, "Debe haber una respuesta correcta").nullish(),
    image_url: z.string().url().or(z.literal("")).nullable().optional(),
    time_limit: z.number().min(5).max(300).default(20),
    points: z.number().min(0).default(1000),
    sort_order: z.number().nullable().optional(),
});

export const quizSchema = z.object({
    id: z.string().optional(),
    teacher_id: z.string().optional(),
    title: z.string().min(1, "El título es requerido"),
    class_id: z.string().nullable().optional(),
    folder_id: z.string().nullable().optional(),
    tags: z.array(z.string()).optional().default([]),
    created_at: z.string().optional(),
});

export const classSchema = z.object({
    id: z.string().optional(),
    teacher_id: z.string().optional(),
    name: z.string().min(1, "El nombre de la clase es requerido"),
    description: z.string().nullable().optional(),
    created_at: z.string().optional(),
    students: z.array(z.object({
        id: z.string().optional(),
        class_id: z.string(),
        name: z.string().min(1, "El nombre es obligatorio"),
        email: z.string().email().optional().nullable(),
        created_at: z.string().optional(),
    })).optional(),
});

export const SessionSchema = z.object({
    id: z.string(),
    pin: z.string().length(6),
    status: z.enum(["waiting", "active", "finished"]),
    quiz_id: z.string(),
    current_question_id: z.string().nullable().optional(),
    current_question_started_at: z.string().nullable().optional(),
    started_at: z.string().nullable().optional(),
    finished_at: z.string().nullable().optional(),
});

export const ParticipantSchema = z.object({
    id: z.string(),
    session_id: z.string(),
    nickname: z.string().min(2).max(20),
    joined_at: z.string().optional(),
    current_streak: z.number().default(0),
    max_streak: z.number().default(0),
});

export const studentSchema = z.object({
    id: z.string().optional(),
    class_id: z.string(),
    name: z.string().min(1, "El nombre es obligatorio"),
    email: z.string().email().optional().nullable(),
    created_at: z.string().optional(),
});

export const folderSchema = z.object({
    id: z.string().optional(),
    teacher_id: z.string().optional(),
    name: z.string().min(1, "El nombre es requerido"),
    color: z.string().optional().default('#3b82f6'),
    created_at: z.string().optional(),
});

export type Question = z.infer<typeof QuestionSchema>;
export type Quiz = z.infer<typeof quizSchema>;
export type Session = z.infer<typeof SessionSchema>;
export type Participant = z.infer<typeof ParticipantSchema>;
export type ClassModel = z.infer<typeof classSchema>;
export type StudentParams = z.infer<typeof studentSchema>;
export type Folder = z.infer<typeof folderSchema>;

export interface FinishedSession {
    id: string;
    pin: string;
    created_at: string;
    finished_at: string;
    quiz: { title: string; tags?: string[]; class_id?: string | null };
    _count?: { participants: number };
}

export interface SupabaseSessionResponse {
    id: string;
    pin: string;
    created_at: string;
    finished_at: string;
    quiz: { title: string; teacher_id: string; tags?: string[]; class_id?: string | null };
    participants: { count: number }[];
}

export interface LiveSession {
    id: string;
    pin: string;
    status: "waiting" | "active";
    quiz: { title: string; class_id?: string | null };
    created_at: string;
}
