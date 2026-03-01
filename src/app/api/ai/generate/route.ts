import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
    const apiKey = process.env.GEMINI_API_KEY;
    const version = "v1.5-stable";

    if (!apiKey || apiKey.trim().length < 20) {
        return NextResponse.json({
            error: "Clave de API no detectada (" + version + ")",
            details: "Por favor, añade GEMINI_API_KEY en Vercel y haz un REDEPLOY."
        }, { status: 500 });
    }

    const genAI = new GoogleGenerativeAI(apiKey);

    try {
        const { topic, count, grade, language } = await req.json();

        // 1.5-flash es el modelo más compatible.
        const models = ["gemini-1.5-flash", "gemini-1.5-flash-latest", "gemini-pro"];
        let lastError = "";

        for (const modelName of models) {
            // Probamos primero con la API estable (v1)
            try {
                const model = genAI.getGenerativeModel({ model: modelName }, { apiVersion: "v1" });

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

                const result = await model.generateContent(prompt);
                const response = await result.response;
                const text = response.text();

                const cleanedText = text.replace(/```json/g, "").replace(/```/g, "").trim();
                const questions = JSON.parse(cleanedText);

                return NextResponse.json(questions);
            } catch (err) {
                const currentErrorMessage = err instanceof Error ? err.message : String(err);
                lastError = currentErrorMessage;

                // Si falla v1, el loop seguirá o intentará con el siguiente modelo.
                // Registramos el error pero no nos detenemos si es un 404.
                if (!lastError.toLowerCase().includes("404") && !lastError.toLowerCase().includes("not found")) {
                    break;
                }
            }
        }

        // Si llegamos aquí con errores, devolvemos diagnóstico
        return NextResponse.json({
            error: `Error de Configuración (${version})`,
            details: `Google dice: "${lastError}". \n\nDIAGNÓSTICO:\n- Clave detectada empieza por: "${apiKey.substring(0, 5)}..."\n- Si esta NO es tu clave nueva, haz REDEPLOY en Vercel.\n- Si SÍ es tu clave, revisa que la 'Generative Language API' esté activa en Google Cloud y que tu zona geográfica esté admitida.`
        }, { status: 500 });

    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        return NextResponse.json({
            error: `Error crítico (${version})`,
            details: errorMessage
        }, { status: 500 });
    }
}
