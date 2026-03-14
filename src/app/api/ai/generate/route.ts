import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { checkRateLimit } from "@/lib/rate-limit";
import { generateQuizFromAI } from "@/lib/ai";

export const dynamic = 'force-dynamic';
// Usamos runtime estándar para evitar timeouts en generaciones largas
// export const runtime = 'edge';

export async function POST(req: Request) {
    // Auth check: only authenticated teachers can generate questions
    const supabase = createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        return NextResponse.json({ error: "Unauthorized", details: "You must be logged in to generate questions." }, { status: 401 });
    }

    // Rate limiting: 5 requests per minute per user for AI (more expensive)
    const { allowed, resetIn } = await checkRateLimit(user.id, "ai-generate", 5, 60_000);
    if (!allowed) {
        return NextResponse.json({ error: "Rate limit exceeded", details: `Too many requests. Try again in ${Math.ceil(resetIn / 1000)} seconds.` }, { status: 429 });
    }

    const groqKey = process.env.GROQ_API_KEY;

    if (!groqKey) {
        return NextResponse.json({
            error: "Clave Groq no detectada",
            details: "Por favor, añade GROQ_API_KEY en el archivo .env o variables de entorno."
        }, { status: 500 });
    }

    try {
        const body = await req.json();
        const { topic, count, grade, language, questionType, pdfText } = body;

        if (!topic && !pdfText) {
            return NextResponse.json({ error: "Missing content", details: "Please provide a topic or PDF text." }, { status: 400 });
        }

        const questions = await generateQuizFromAI({
            topic,
            count: count || 5,
            grade: grade || "General",
            language: language || "es",
            questionType: questionType || "multiple_choice",
            pdfText
        });

        if (!questions || questions.length === 0) {
            throw new Error("La IA no devolvió ninguna pregunta válida.");
        }

        return NextResponse.json(questions);

    } catch (error) {
        console.error("AI Generation Error:", error);
        const errorMessage = error instanceof Error ? error.message : "Error crítico desconocido";
        return NextResponse.json({
            error: "Error en Generación IA (Groq)",
            details: errorMessage
        }, { status: 500 });
    }
}
