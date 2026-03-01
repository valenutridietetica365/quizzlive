import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
        return NextResponse.json({
            error: "Configuracion incompleta: Falta la clave de API.",
            details: "Agrega GEMINI_API_KEY en Vercel."
        }, { status: 500 });
    }

    const genAI = new GoogleGenerativeAI(apiKey);

    try {
        const { topic, count, grade, language } = await req.json();

        if (!topic || !count) {
            return NextResponse.json({ error: "Faltan datos (tema o cantidad)" }, { status: 400 });
        }

        // Standard try for gemini-1.5-flash
        try {
            const model = genAI.getGenerativeModel({
                model: "gemini-1.5-flash",
                generationConfig: {
                    responseMimeType: "application/json",
                }
            });

            const prompt = `Act as an expert educator. Generate ${count} quiz questions about "${topic}" for "${grade}" students in ${language === 'es' ? 'Spanish' : 'English'}.
            
            Return ONLY a JSON array:
            [
              {
                "question_text": "string",
                "question_type": "multiple_choice",
                "options": ["string", "string", "string", "string"],
                "correct_answer": "string matching one of the options",
                "time_limit": 20,
                "points": 1000
              }
            ]`;

            const result = await model.generateContent(prompt);
            const response = await result.response;
            const text = response.text();

            const questions = JSON.parse(text);
            return NextResponse.json(questions);

        } catch (error: any) {
            console.error("Gemini Model Error:", error.message);

            if (error.message?.includes("404") || error.message?.includes("not found")) {
                return NextResponse.json({
                    error: "Modelo de IA no encontrado (ERROR 404)",
                    details: "Tu clave de API pertenece a un proyecto de Google Cloud, pero la 'Generative Language API' no está ACTIVADA. \n\nPasos: \n1. Ve a https://console.cloud.google.com/ \n2. Busca el proyecto: 228307201666 \n3. Busca y ACTIVA la 'Generative Language API'. \n\nSi ya la activaste, espera 1 minuto y vuelve a intentar."
                }, { status: 404 });
            }

            throw error; // Re-throw to main handler if it's another error
        }

    } catch (error: any) {
        console.error("AI Generation Critical Error:", error);
        return NextResponse.json({
            error: "Error en el servicio de IA",
            details: error.message || "Error desconocido"
        }, { status: 500 });
    }
}
