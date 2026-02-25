import { z } from "zod";

export const QuestionTypeSchema = z.enum([
    "multiple_choice",
    "true_false",
    "fill_in_the_blank",
    "matching",
]);

export const QuestionSchema = z.object({
    id: z.string().optional(),
    quiz_id: z.string().optional(),
    question_text: z.string().min(1, "La pregunta no puede estar vacía"),
    question_type: QuestionTypeSchema,
    options: z.array(z.string()),
    correct_answer: z.string().min(1, "Debe haber una respuesta correcta"),
    image_url: z.string().url().or(z.literal("")).optional(),
    time_limit: z.number().min(5).max(300).default(20),
    points: z.number().min(0).default(1000),
    sort_order: z.number().optional(),
});

export const QuizSchema = z.object({
    id: z.string().optional(),
    title: z.string().min(1, "El título es obligatorio"),
    teacher_id: z.string().optional(),
    created_at: z.string().optional(),
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

export type Question = z.infer<typeof QuestionSchema>;
export type Quiz = z.infer<typeof QuizSchema>;
export type Session = z.infer<typeof SessionSchema>;
export type Participant = z.infer<typeof ParticipantSchema>;
