import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
    const apiKey = process.env.GEMINI_API_KEY;
    const version = "v1.4-final"; // Tag para identificar si el despliegue es el correcto

    if (!apiKey || apiKey.trim().length < 20) {
        return NextResponse.json({
            error: "Clave de API no detectada (" + version + ")",
            details: "Por favor, añade GEMINI_API_KEY en Vercel y haz un REDEPLOY."
        }, { status: 500 });
    }

    const genAI = new GoogleGenerativeAI(apiKey);

    try {
        const { topic, count, grade, language } = await req.json();

        // Lista de modelos para intentar en orden. 
        // 1.5-flash es el mejor para estos casos gratuitos.
        const models = ["gemini-1.5-flash", "gemini-1.5-flash-latest", "gemini-pro"];
        let lastError = "";

        for (const modelName of models) {
            try {
                console.log(`Intentando con modelo: ${modelName}`);
                const model = genAI.getGenerativeModel({ model: modelName });

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
                lastError = err instanceof Error ? err.message : String(err);
                console.error(`Fallo con ${modelName}:`, lastError);

                // Si no es un error de "modelo no encontrado (404)", paramos de intentar
                if (!lastError.toLowerCase().includes("404") && !lastError.toLowerCase().includes("not found")) {
                    break;
                }
            }
        }

        // Si todos fallan
        return NextResponse.json({
            error: `Error de Google (${version})`,
            details: `Intentamos varios modelos pero falló: "${lastRawError || lastError}". \n\nPASO OBLIGATORIO: Ve a Vercel > Deployments y confirma que este despliegue se ha completado. Si el error sigue diciendo 'gemini-pro', NO estás viendo la versión actual.`
        }, { status: 500 });

    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Error desconocido";
        return NextResponse.json({
            error: `Error crítico (${version})`,
            details: errorMessage
        }, { status: 500 });
    }
}
