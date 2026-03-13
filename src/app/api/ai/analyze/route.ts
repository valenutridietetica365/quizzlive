import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { checkRateLimit } from "@/lib/rate-limit";

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
    // Auth check: only authenticated teachers can use AI
    const supabase = createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        return NextResponse.json({ error: "Unauthorized", details: "You must be logged in to use AI features." }, { status: 401 });
    }

    // Rate limiting: 10 requests per minute per user
    const { allowed, resetIn } = await checkRateLimit(user.id, "ai-analyze", 10, 60_000);
    if (!allowed) {
        return NextResponse.json({ error: "Rate limit exceeded", details: `Too many requests. Try again in ${Math.ceil(resetIn / 1000)} seconds.` }, { status: 429 });
    }

    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey || apiKey.trim().length < 20) {
        return NextResponse.json({
            error: "API Key not found",
            details: "Please add GEMINI_API_KEY to your environment variables."
        }, { status: 500 });
    }

    try {
        const { quizTitle, questions, heatmapData, language = 'es' } = await req.json();

        interface AnalyzedQuestion {
            question_text: string;
            points: number;
            options: string[];
            correct_answer: string;
        }

        interface AnalyzedRow {
            studentName: string;
            pedagogicalScore: number;
            answers: Record<string, boolean>;
            selectedAnswers: Record<string, string>;
        }

        const models = ["gemini-1.5-flash", "gemini-1.5-flash-latest", "gemini-3-flash-preview"];
        let lastError = "";

        for (const modelName of models) {
            try {
                const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;

                const prompt = `
                Act as a master pedagogical analyst. You are analyzing the results of a quiz titled "${quizTitle}".
                
                DATA PROVIDED:
                - Questions: ${JSON.stringify(questions.map((q: AnalyzedQuestion) => ({ 
                    text: q.question_text, 
                    points: q.points,
                    options: q.options,
                    correct: q.correct_answer
                  })))}
                - Results: ${JSON.stringify(heatmapData.map((row: AnalyzedRow) => ({ 
                    student: row.studentName, 
                    score: row.pedagogicalScore, 
                    answers: row.answers,
                    choices: row.selectedAnswers 
                  })))}
                
                OBJECTIVE:
                Generate a professional pedagogical report in ${language === 'es' ? 'Spanish' : 'English'}.
                
                STRUCTURE:
                1. Executive Summary: High-level overview of class performance.
                2. Key Distractor Analysis: Identify WHICH incorrect options were most selected and explain the potential misconception behind those choices.
                3. Individualized Insights: Group students by their needs (e.g., those who need basics vs. those who need advanced challenge).
                4. Actionable Reinforcement Plan: 3-5 specific steps for the teacher to help the students improve based on the distractor patterns.
                
                FORMAT: Return ONLY plain Markdown text. Do not use JSON. Use bolding and lists for readability.
                `;

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
                        : "Unknown error in " + modelName;
                    continue;
                }

                const analysis = data.candidates?.[0]?.content?.parts?.[0]?.text;
                if (!analysis) throw new Error("No text in response from " + modelName);

                return NextResponse.json({ analysis });

            } catch (err) {
                lastError = err instanceof Error ? err.message : String(err);
            }
        }

        return NextResponse.json({
            error: "AI Analysis Failed",
            details: `All models failed. Last error: ${lastError}`
        }, { status: 500 });

    } catch (error) {
        return NextResponse.json({
            error: "Server Error",
            details: error instanceof Error ? error.message : "Internal server error"
        }, { status: 500 });
    }
}
