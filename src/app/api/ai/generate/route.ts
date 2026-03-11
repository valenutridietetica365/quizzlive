import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
    // Auth check: only authenticated teachers can generate questions
    const supabase = createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        return NextResponse.json({ error: "Unauthorized", details: "You must be logged in to generate questions." }, { status: 401 });
    }

    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey || apiKey.trim().length < 20) {
        return NextResponse.json({
            error: "Clave no detectada",
            details: "Por favor, añade GEMINI_API_KEY en Vercel y haz un REDEPLOY."
        }, { status: 500 });
    }

    try {
        const { topic, count, grade, language, questionType = "multiple_choice" } = await req.json();

        // Probamos modelos en orden. Gemini 3 es el que venía en tu snippet.
        const models = ["gemini-3-flash-preview", "gemini-1.5-flash", "gemini-1.5-flash-latest"];
        let lastError = "";

        for (const modelName of models) {
            try {
                const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;

                let promptInstructions = "";
                let expectedFormat = "";

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
                    promptInstructions = `Generate ${count} matching game questions based on the topic. The question_text should be a general instruction like "Match the following terms with their definitions." The options array MUST contain exactly 4 pairs. Each pair MUST be a single string formatted exactly as "Term:Definition" with a colon separating them. No spaces around the colon internally if possible, but the format MUST be strict.`;
                    expectedFormat = `
                [
                  {
                    "question_text": "Match the following terms...",
                    "question_type": "matching",
                    "options": ["Term1:Definition1", "Term2:Definition2", "Term3:Definition3", "Term4:Definition4"],
                    "correct_answer": null,
                    "time_limit": 60,
                    "points": 1000
                  }
                ]`;
                } else {
                    promptInstructions = `Generate ${count} multiple choice questions.`;
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

                const prompt = `Act as an expert educator. Topic: "${topic}", Grade: "${grade}", Language: ${language === 'es' ? 'Spanish' : 'English'}.
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
