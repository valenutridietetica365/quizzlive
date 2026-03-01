import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey || apiKey.length < 20) {
        return NextResponse.json({
            error: "Falta la GEMINI_API_KEY o es inválida",
            details: "Asegúrate de haber guardado la clave en Vercel y haber hecho un REDEPLOY."
        }, { status: 500 });
    }

    const genAI = new GoogleGenerativeAI(apiKey);

    try {
        const { topic, count, grade, language } = await req.json();

        // Lista de modelos para intentar en orden de preferencia
        const modelsToTry = ["gemini-1.5-flash", "gemini-1.5-flash-latest", "gemini-pro"];
        let lastRawError = "";

        for (const modelName of modelsToTry) {
            try {
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
                    "correct_answer": "the_matching_option_text",
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
            } catch (err: any) {
                lastRawError = err.message || "Error desconocido";
                console.warn(`Failed with model ${modelName}:`, lastRawError);

                // Si no es un 404, no seguimos intentando otros modelos (ej: cuota excedida)
                if (!lastRawError.toLowerCase().includes("404") && !lastRawError.toLowerCase().includes("not found")) {
                    break;
                }
            }
        }

        // Si llegamos aquí, todos fallaron
        return NextResponse.json({
            error: "La IA no responde correctamente (404)",
            details: `ERROR DE GOOGLE: "${lastRawError}"\n\nPASOS PARA ARREGLAR:\n1. Ve a Vercel > Deployments.\n2. Pulsa "..." en el último y dale a "Redeploy".\n3. Si sigue fallando, crea una clave NUEVA en AI Studio con 'New Project'.`
        }, { status: 404 });

    } catch (error: any) {
        return NextResponse.json({
            error: "Error crítico en el servidor",
            details: error.message
        }, { status: 500 });
    }
}
