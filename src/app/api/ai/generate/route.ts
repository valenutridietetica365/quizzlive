import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
        console.error("AI Generation Error: GEMINI_API_KEY is not defined in environment variables.");
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

        const model = genAI.getGenerativeModel({
            model: "gemini-1.5-flash",
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

        try {
            const questions = JSON.parse(text);
            return NextResponse.json(questions);
        } catch (parseError) {
            console.error("Error parsing Gemini response:", text);
            return NextResponse.json({
                error: "Error al procesar la respuesta de la IA",
                details: "La IA devolvió un formato no válido."
            }, { status: 500 });
        }

    } catch (error: any) {
        console.error("AI Generation Error:", error);

        // Handle specific Gemini errors if possible
        const errorMessage = error?.message || "Error desconocido en la generación";

        return NextResponse.json({
            error: "Error en el servicio de IA",
            details: errorMessage
        }, { status: 500 });
    }
}
