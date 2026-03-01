import { NextResponse } from "next/server";

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
    const apiKey = process.env.GEMINI_API_KEY;
    const version = "REST-final-v1";

    if (!apiKey || apiKey.trim().length < 20) {
        return NextResponse.json({
            error: "Clave de API no detectada (" + version + ")",
            details: "Por favor, añade GEMINI_API_KEY en Vercel y haz un REDEPLOY."
        }, { status: 500 });
    }

    try {
        const { topic, count, grade, language } = await req.json();

        // 1. Probamos con gemini-1.5-flash (el estándar actual)
        // 2. Probamos con gemini-pro (el clásico) 
        const models = ["gemini-1.5-flash", "gemini-pro"];
        let lastError = "";

        for (const modelName of models) {
            try {
                // Usamos fetch directo (como en tu snippet) para evitar errores del SDK
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
                    lastError = data.error?.message || "Error desconocido de Google";
                    console.error(`Fallo con ${modelName}:`, lastError);
                    continue; // Sigue al siguiente modelo
                }

                const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
                if (!text) throw new Error("Google no devolvió texto");

                const cleanedText = text.replace(/```json/g, "").replace(/```/g, "").trim();
                const questions = JSON.parse(cleanedText);

                return NextResponse.json(questions);

            } catch (err: any) {
                lastError = err.message || String(err);
                console.warn(`Error en catch de ${modelName}:`, lastError);
            }
        }

        // Si todos fallan
        return NextResponse.json({
            error: `Error de Google (${version})`,
            details: `Google rechazó la petición: "${lastError}". \n\nTIP: Si dice 404, es la región o la clave. Tu clave empieza por: "${apiKey.substring(0, 5)}...".`
        }, { status: 500 });

    } catch (error: any) {
        return NextResponse.json({
            error: `Error crítico (${version})`,
            details: error.message || "Error desconocido"
        }, { status: 500 });
    }
}
