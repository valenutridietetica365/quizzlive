import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
        return NextResponse.json({
            error: "Configuracion incompleta: Falta la clave de API en el servidor (Vercel).",
            details: "Asegúrate de haber agregado GEMINI_API_KEY en las variables de entorno de Vercel."
        }, { status: 500 });
    }

    const genAI = new GoogleGenerativeAI(apiKey);

    try {
        const { topic, count, grade, language } = await req.json();

        if (!topic || !count) {
            return NextResponse.json({ error: "Topic and count are required" }, { status: 400 });
        }

        // List of models to try in case of 404 errors
        const modelsToTry = ["gemini-1.5-flash", "gemini-1.5-flash-latest", "gemini-pro"];
        let lastError: Error | null = null;

        for (const modelName of modelsToTry) {
            try {
                const model = genAI.getGenerativeModel({
                    model: modelName,
                    generationConfig: {
                        responseMimeType: "application/json",
                    }
                });

                const prompt = `Act as an expert educator. Generate ${count} quiz questions about "${topic}" for "${grade}" students in ${language === 'es' ? 'Spanish' : 'English'}.
                
                The output MUST be a JSON array of objects following this exact schema:
                [
                  {
                    "question_text": "The question string",
                    "question_type": "multiple_choice",
                    "options": ["Option A", "Option B", "Option C", "Option D"],
                    "correct_answer": "The exact string of the correct option",
                    "time_limit": 20,
                    "points": 1000
                  }
                ]

                Important rules:
                - Return ONLY the JSON array.
                - All multiple choice questions must have exactly 4 options.
                - The correct_answer must be identical to one of the strings in the options array.
                - Use clear and appropriate language for the specified grade level.
                - Avoid accents in correct_answer if they might cause comparison issues, or ensure they match exactly.`;

                const result = await model.generateContent(prompt);
                const response = await result.response;
                const text = response.text();

                const questions = JSON.parse(text);
                return NextResponse.json(questions);

            } catch (error) {
                const errorMessage = error instanceof Error ? error.message : String(error);
                console.warn(`Failed with model ${modelName}:`, errorMessage);
                lastError = error instanceof Error ? error : new Error(errorMessage);
                // If it's not a 404 (model not found), don't keep trying other models
                if (!errorMessage.includes("404") && !errorMessage.includes("not found")) {
                    break;
                }
            }
        }

        // If we reach here, all models failed
        const details = lastError?.message || "Error desconocido en la generación";

        return NextResponse.json({
            error: "Error en el servicio de IA",
            details: details + ". Verifica que la 'Generative Language API' esté activada en tu proyecto de Google Cloud Console si estás usando un proyecto de GCP."
        }, { status: 500 });

    } catch (error) {
        console.error("AI Generation Critical Error:", error);
        return NextResponse.json({
            error: "Error interno",
            details: error instanceof Error ? error.message : String(error)
        }, { status: 500 });
    }
}
