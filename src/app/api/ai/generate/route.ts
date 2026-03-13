import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { checkRateLimit } from "@/lib/rate-limit";

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
    // Auth check: only authenticated teachers can generate questions
    const supabase = createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        return NextResponse.json({ error: "Unauthorized", details: "You must be logged in to generate questions." }, { status: 401 });
    }

    // Rate limiting: 10 requests per minute per user
    const { allowed, resetIn } = await checkRateLimit(user.id, "ai-generate", 10, 60_000);
    if (!allowed) {
        return NextResponse.json({ error: "Rate limit exceeded", details: `Too many requests. Try again in ${Math.ceil(resetIn / 1000)} seconds.` }, { status: 429 });
    }

    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey || apiKey.trim().length < 20) {
        return NextResponse.json({
            error: "Clave no detectada",
            details: "Por favor, añade GEMINI_API_KEY en Vercel y haz un REDEPLOY."
        }, { status: 500 });
    }

    try {
        const { topic, count, grade, language, questionType = "multiple_choice", pdfText } = await req.json();

        // Probamos modelos en orden. Gemini 3 es el que venía en tu snippet.
        const models = ["gemini-3-flash-preview", "gemini-1.5-flash", "gemini-1.5-flash-latest"];
        let lastError = "";

        for (const modelName of models) {
            try {
                const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;

                let promptInstructions = "";
                let expectedFormat = "";

                const isSpanish = language === "es";
                const trueText = isSpanish ? "Verdadero" : "True";
                const falseText = isSpanish ? "Falso" : "False";

                if (questionType === "hangman") {
                    promptInstructions = `Generate ${count} hangman game questions. The question_text should be a clue, definition, or a phrase with a missing word. The secret word MUST be placed in "correct_answer". "options" should be an empty array [].`;
                    expectedFormat = `
                [
                  {
                    "question_text": "Clue or definition here...",
                    "question_type": "fill_in_the_blank",
                    "options": [],
                    "correct_answer": "SECRET_WORD",
                    "time_limit": 30,
                    "points": 1000
                  }
                ]`;
                } else if (questionType === "matching") {
                    promptInstructions = `Generate ${count} matching game questions based on the topic. The question_text should be a general instruction like "Match the following terms with their definitions." The options array MUST contain exactly 4 pairs. Each pair MUST be a single string formatted exactly as "Term:Definition" with a colon separating them. No spaces around the colon internally if possible. "correct_answer" MUST be exactly "MATCHING_MODE".`;
                    expectedFormat = `
                [
                  {
                    "question_text": "Match the following terms...",
                    "question_type": "matching",
                    "options": ["Term1:Definition1", "Term2:Definition2", "Term3:Definition3", "Term4:Definition4"],
                    "correct_answer": "MATCHING_MODE",
                    "time_limit": 60,
                    "points": 1000
                  }
                ]`;
                } else if (questionType === "true_false") {
                    promptInstructions = `Generate ${count} True or False questions. The "options" array MUST be exactly ["${trueText}", "${falseText}"]. The "correct_answer" MUST be one of those two exact strings.`;
                    expectedFormat = `
                [
                  {
                    "question_text": "Fact statement here...",
                    "question_type": "true_false",
                    "options": ["${trueText}", "${falseText}"],
                    "correct_answer": "${trueText}",
                    "time_limit": 15,
                    "points": 1000
                  }
                ]`;
                } else if (questionType === "fill_in_the_blank") {
                    promptInstructions = `Generate ${count} "fill in the blank" questions. The "question_text" should contain a sentence with the missing word represented by "____". The "correct_answer" should be the missing word. "options" should be an empty array [].`;
                    expectedFormat = `
                [
                  {
                    "question_text": "The capital of France is ____.",
                    "question_type": "fill_in_the_blank",
                    "options": [],
                    "correct_answer": "Paris",
                    "time_limit": 30,
                    "points": 1000
                  }
                ]`;
                } else if (questionType === "mixed") {
                    promptInstructions = `Generate a mixture of ${count} questions. Approximately 50% should be "multiple_choice" (4 options) and 50% should be "true_false" (options: ["${trueText}", "${falseText}"]).`;
                    expectedFormat = `
                [
                  {
                    "question_text": "...",
                    "question_type": "multiple_choice",
                    "options": ["a", "b", "c", "d"],
                    "correct_answer": "...",
                    "time_limit": 20,
                    "points": 1000
                  },
                  {
                    "question_text": "...",
                    "question_type": "true_false",
                    "options": ["${trueText}", "${falseText}"],
                    "correct_answer": "${trueText}",
                    "time_limit": 15,
                    "points": 1000
                  }
                ]`;
                } else {
                    promptInstructions = `Generate ${count} multiple choice questions. Each question MUST have exactly 4 options.`;
                    expectedFormat = `
                [
                  {
                    "question_text": "text",
                    "question_type": "multiple_choice",
                    "options": ["a", "b", "c", "d"],
                    "correct_answer": "exact string matching one option",
                    "time_limit": 20,
                    "points": 1000
                  }
                ]`;
                }

                const baseContext = pdfText 
                    ? `Based on the following document content: """${pdfText}"""`
                    : `Topic: "${topic}"`;

                const prompt = `Act as an expert educator. ${baseContext}, Grade: "${grade}", Language: ${language === 'es' ? 'Spanish' : 'English'}.
                ${promptInstructions}
                Return ONLY a valid JSON array. Do not include markdown formatting like \`\`\`json.
                Format:
                ${expectedFormat}`;

                const res = await fetch(url, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        contents: [{ parts: [{ text: prompt }] }]
                    })
                });

                const data = await res.json();

                if (!res.ok) {
                    lastError = (data.error && typeof data.error.message === 'string')
                        ? data.error.message
                        : "Error desconocido en " + modelName;
                    console.error(`Fallo con ${modelName}:`, lastError);
                    continue;
                }

                const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
                if (!text) throw new Error("No hay texto en la respuesta de " + modelName);

                const cleanedText = text.replace(/```json/g, "").replace(/```/g, "").trim();
                const questions = JSON.parse(cleanedText);

                return NextResponse.json(questions);

            } catch (err) {
                lastError = err instanceof Error ? err.message : String(err);
                console.warn(`Error capturado en ${modelName}:`, lastError);
            }
        }

        return NextResponse.json({
            error: "Error Final",
            details: `Ningún modelo funcionó. El último error fue: "${lastError}". \n\nTIP: Tu clave empieza por "${apiKey.substring(0, 5)}...". Revisa en AI Studio que tengas permiso para el modelo 'Gemini 3 Flash (Preview)'.`
        }, { status: 500 });

    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Error crítico desconocido";
        return NextResponse.json({
            error: "Error Crítico de Servidor",
            details: errorMessage
        }, { status: 500 });
    }
}
