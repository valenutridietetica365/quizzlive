import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
        return NextResponse.json({
            error: "Falta la GEMINI_API_KEY",
            details: "Configúrala en Vercel."
        }, { status: 500 });
    }

    const genAI = new GoogleGenerativeAI(apiKey);

    try {
        const { topic, count, grade, language } = await req.json();

        // 1. Usar el modelo base gemini-1.5-flash (el más gratuito y compatible)
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

        const prompt = `Act as an expert educator. Topic: "${topic}", Grade: "${grade}", Language: ${language === 'es' ? 'Spanish' : 'English'}.
        
        Generate ${count} multiple choice questions.
        Return ONLY a JSON array, no preamble.
        Format:
        [
          {
            "question_text": "text",
            "question_type": "multiple_choice",
            "options": ["a", "b", "c", "d"],
            "correct_answer": "the_matching_option_text",
            "time_limit": 20,
            "points": 1000
          }
        ]`;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();

        // Limpiamos la respuesta en caso de que incluya markdown (vuelvan quites)
        const cleanedText = text.replace(/```json/g, "").replace(/```/g, "").trim();

        try {
            const questions = JSON.parse(cleanedText);
            return NextResponse.json(questions);
        } catch {
            console.error("JSON Parse Error:", cleanedText);
            return NextResponse.json({
                error: "Dificultades técnicas",
                details: "La IA respondió pero con un formato no válido. Inténtalo de nuevo."
            }, { status: 500 });
        }

    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Error desconocido";
        console.error("AI Route Error:", errorMessage);

        // Error descriptivo para el usuario si es un 404
        if (errorMessage.includes("404") || errorMessage.includes("not found")) {
            return NextResponse.json({
                error: "Modelo no reconocido por tu clave (404)",
                details: "CONSEJO FINAL:\n1. Ve a AI STUDIO.\n2. Haz clic en 'Create API Key'.\n3. Elige 'Create API key in a NEW project' (¡No el que ya tienes!).\n4. Reemplaza la clave en Vercel."
            }, { status: 404 });
        }

        return NextResponse.json({
            error: "Error en el servicio de IA",
            details: errorMessage
        }, { status: 500 });
    }
}
