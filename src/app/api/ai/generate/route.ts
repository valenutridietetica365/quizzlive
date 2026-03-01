import { NextResponse } from "next/server";

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
    const apiKey = process.env.GEMINI_API_KEY;
    const version = "REST-v1.6-Gemini3";

    if (!apiKey || apiKey.trim().length < 20) {
        return NextResponse.json({
            error: `Clave no detectada (${version})`,
            details: "Por favor, añade GEMINI_API_KEY en Vercel y haz un REDEPLOY."
        }, { status: 500 });
    }

    try {
        const { topic, count, grade, language } = await req.json();

        // Probamos modelos en orden. Gemini 3 es el que venía en tu snippet.
        const models = ["gemini-3-flash-preview", "gemini-1.5-flash", "gemini-1.5-flash-latest"];
        let lastError = "";

        for (const modelName of models) {
            try {
                // Usamos la URL exacta de tu snippet
                const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;

                const prompt = `Act as an expert educator. Topic: "${topic}", Grade: "${grade}", Language: ${language === 'es' ? 'Spanish' : 'English'}.
                Generate ${count} multiple choice questions.
                Return ONLY a JSON array.
                Format:
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
            error: `Error Final (${version})`,
            details: `Ningún modelo funcionó. El último error fue: "${lastError}". \n\nTIP: Tu clave empieza por "${apiKey.substring(0, 5)}...". Revisa en AI Studio que tengas permiso para el modelo 'Gemini 3 Flash (Preview)'.`
        }, { status: 500 });

    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Error crítico desconocido";
        return NextResponse.json({
            error: `Error Crítico de Servidor (${version})`,
            details: errorMessage
        }, { status: 500 });
    }
}
