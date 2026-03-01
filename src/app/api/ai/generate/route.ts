import { NextResponse } from "next/server";

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
    const apiKey = process.env.GEMINI_API_KEY;
    const version = "REST-final-v1.2";

    if (!apiKey || apiKey.trim().length < 20) {
        return NextResponse.json({
            error: "Clave de API no detectada (" + version + ")",
            details: "Por favor, añade GEMINI_API_KEY en Vercel y haz un REDEPLOY."
        }, { status: 500 });
    }

    try {
        const { topic, count, grade, language } = await req.json();

        // 1.5-flash es el estándar actual. Probamos alternativas si falla.
        const models = ["gemini-1.5-flash", "gemini-pro"];
        let lastError = "";

        for (const modelName of models) {
            try {
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
                        : "Error desconocido de Google";
                    console.error(`Fallo con ${modelName}:`, lastError);
                    continue;
                }

                const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
                if (!text) throw new Error("Google no devolvió texto");

                const cleanedText = text.replace(/```json/g, "").replace(/```/g, "").trim();
                const questions = JSON.parse(cleanedText);

                return NextResponse.json(questions);

            } catch (err) {
                lastError = err instanceof Error ? err.message : String(err);
                console.warn(`Error en catch de ${modelName}:`, lastError);
            }
        }

        return NextResponse.json({
            error: `Error de Google (${version})`,
            details: `Google rechazó la petición: "${lastError}". \n\nTIP: Si dice 404, es la región o la clave. Tu clave detectada empieza por: "${apiKey.substring(0, 5)}...".`
        }, { status: 500 });

    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Error desconocido";
        return NextResponse.json({
            error: `Error crítico (${version})`,
            details: errorMessage
        }, { status: 500 });
    }
}
