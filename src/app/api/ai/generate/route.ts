import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
    const apiKey = process.env.GEMINI_API_KEY;

    // Diagnóstico inicial: Verificación de clave
    if (!apiKey || apiKey.trim().length < 20) {
        return NextResponse.json({
            error: "Clave de API no detectada en Vercel",
            details: `La clave recibida es: "${apiKey ? 'Existe pero es muy corta' : 'No existe (null/undefined)'}". \n\nPASOS:\n1. Ve a Vercel > Settings > Environment Variables.\n2. Asegúrate de que el nombre sea EXACTAMENTE "GEMINI_API_KEY".\n3. Pulsa "Save".\n4. Ve a la pestaña "Deployments" y haz un "REDEPLOY" del último despliegue.`
        }, { status: 500 });
    }

    // Usamos la API v1 explícitamente, que es más estable para AI Studio
    const genAI = new GoogleGenerativeAI(apiKey);

    try {
        const { topic, count, grade, language } = await req.json();

        // Usamos gemini-1.5-flash que es el modelo estándar gratuito actual
        const model = genAI.getGenerativeModel({
            model: "gemini-1.5-flash"
        });

        const prompt = `Act as an expert educator. Generate ${count} quiz questions about "${topic}" for "${grade}" students in ${language === 'es' ? 'Spanish' : 'English'}.
        
        The output MUST be a JSON array of objects:
        [
          {
            "question_text": "text",
            "question_type": "multiple_choice",
            "options": ["a", "b", "c", "d"],
            "correct_answer": "exact string matching one option",
            "time_limit": 20,
            "points": 1000
          }
        ]
        
        Return ONLY the raw JSON array.`;

        try {
            const result = await model.generateContent(prompt);
            const response = await result.response;
            const text = response.text();

            // Limpieza de posibles tags de markdown
            const cleanedText = text.replace(/```json/g, "").replace(/```/g, "").trim();
            const questions = JSON.parse(cleanedText);

            return NextResponse.json(questions);

        } catch (apiError) {
            const errorMessage = apiError instanceof Error ? apiError.message : String(apiError);
            console.error("Gemini API Error:", errorMessage);

            // Tratamiento específico del error 404 para claves de AI Studio
            if (errorMessage.includes("404") || errorMessage.includes("not found")) {
                return NextResponse.json({
                    error: "Error de conexión con Google (404)",
                    details: `ESTADO DE LA CLAVE: Tu servidor detectó una clave que empieza por "${apiKey.substring(0, 4)}...". \n\nSI ESTA NO ES TU CLAVE NUEVA, significa que Vercel no se ha actualizado. \n\nSOLUCIÓN:\n1. Ve a Vercel.\n2. Haz clic en "REDDEPLOY" (es un botón azul en la lista de despliegues).\n3. Si ya hiciste redeploy, intenta crear la clave en AI Studio eligiendo "NEW project".`
                }, { status: 404 });
            }

            throw apiError;
        }

    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error("AI Route Error:", errorMessage);
        return NextResponse.json({
            error: "Error técnico en la IA",
            details: errorMessage
        }, { status: 500 });
    }
}
