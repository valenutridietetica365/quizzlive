import Groq from "groq-sdk";
import { z } from "zod";
import { QuestionSchema, Question } from "./schemas";

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

export type GeneratedQuestion = Question;

interface AIParams {
  topic: string;
  count: number;
  grade: string;
  language: string;
  questionType: string;
  pdfText?: string;
}

/**
 * Utility for exponential retries
 */
async function withRetry<T>(fn: () => Promise<T>, retries = 2, delay = 500): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    if (retries <= 0) throw error;
    await new Promise(resolve => setTimeout(resolve, delay));
    return withRetry(fn, retries - 1, delay * 2);
  }
}

/**
 * Main AI Generation Entry Point with Advanced Optimizations
 */
export async function generateQuizFromAI(params: AIParams): Promise<GeneratedQuestion[]> {
  try {
    // 1. Try Groq with Retry and Zod Validation
    return await withRetry(async () => {
      console.log("Attempting Groq Generation...");
      const result = await generateWithGroq(params);
      return z.array(QuestionSchema.omit({ id: true, quiz_id: true, sort_order: true })).parse(result) as GeneratedQuestion[];
    });
  } catch (error) {
    console.warn("Groq failed after retries, falling back to Gemini:", error);
    try {
      // 2. Try Gemini Fallback
      return await withRetry(async () => {
        console.log("Attempting Gemini Fallback...");
        const result = await generateWithGemini(params);
        return z.array(QuestionSchema.omit({ id: true, quiz_id: true, sort_order: true })).parse(result) as GeneratedQuestion[];
      });
    } catch (geminiError) {
      console.error("Critical AI Failure:", geminiError);
      throw new Error("Lo sentimos, no pudimos generar las preguntas en este momento. Por favor, intenta de nuevo o sube contenido más corto.");
    }
  }
}

/**
 * Groq Optimization: Few-Shot Prompting & Strict Instructions
 */
async function generateWithGroq({ topic, count, grade, language, questionType, pdfText }: AIParams): Promise<unknown[]> {
  const isSpanish = language === "es";
  const trueText = isSpanish ? "Verdadero" : "True";
  const falseText = isSpanish ? "Falso" : "False";

  // Few-Shot Examples to guide the model
  const examples = {
    multiple_choice: isSpanish 
      ? `Ejemplo: {"question_text": "¿Cuál es la capital de Italia?", "question_type": "multiple_choice", "options": ["Roma", "París", "Madrid", "Londres"], "correct_answer": "Roma", "points": 1000, "time_limit": 20}`
      : `Example: {"question_text": "What is the capital of Italy?", "question_type": "multiple_choice", "options": ["Rome", "Paris", "Madrid", "London"], "correct_answer": "Rome", "points": 1000, "time_limit": 20}`,
    hangman: isSpanish
      ? `Ejemplo: {"question_text": "Animal doméstico que maúlla", "question_type": "hangman", "options": [], "correct_answer": "GATO", "points": 1000, "time_limit": 60}`
      : `Example: {"question_text": "A domestic animal that meows", "question_type": "hangman", "options": [], "correct_answer": "CAT", "points": 1000, "time_limit": 60}`
  };

  const context = pdfText ? `Document Content: """${pdfText}"""` : `Topic: "${topic}"`;
  
  const prompt = `Act as an Expert Pedagogue. 
  ${context}
  Target Grade: ${grade}
  Language: ${isSpanish ? 'Spanish' : 'English'}
  Question Type: ${questionType}
  Quantity: ${count}

  STRICT INSTRUCTIONS:
  - Return ONLY a JSON array.
  - ${questionType === 'hangman' ? 'correct_answer MUST be the secret word in CAPS.' : 'correct_answer MUST exactly match one string from the options array.'}
  - ${questionType === 'true_false' ? `options MUST be exactly ["${trueText}", "${falseText}"].` : ''}
  - Time limit should be between 10 and 60 seconds.
  
  PEEDAGOGICAL QUALITY: Make questions tricky but fair. Avoid obvious distractors.
  
  ${questionType === 'multiple_choice' ? examples.multiple_choice : ''}
  ${questionType === 'hangman' ? examples.hangman : ''}`;

  const completion = await groq.chat.completions.create({
    messages: [
      { role: "system", content: "You are a professional quiz generator. You respond exclusively with valid JSON arrays." },
      { role: "user", content: prompt }
    ],
    model: "llama-3.3-70b-versatile",
    response_format: { type: "json_object" }
  });

  const content = completion.choices[0].message.content || "[]";
  const parsed = JSON.parse(content);
  return Array.isArray(parsed) ? parsed : (parsed.questions || parsed.data || []);
}

/**
 * Gemini Fallback with refined prompt
 */
async function generateWithGemini({ topic, count, grade, language, questionType, pdfText }: AIParams): Promise<unknown[]> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY is missing");

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
  const context = pdfText ? `Based on: ${pdfText}` : `Topic: ${topic}`;
  
  const prompt = `Generate ${count} ${questionType} questions about ${context}. Grade: ${grade}. Lang: ${language}.
  Return ONLY JSON array of objects following the quiz schema. Avoid markdown.`;

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
  });

  if (!response.ok) throw new Error("Gemini API error");
  const data = await response.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "[]";
  const cleaned = text.replace(/```json/g, "").replace(/```/g, "").trim();
  return JSON.parse(cleaned);
}

/**
 * Pedagogical summary of session results
 */
export async function summarizeResults(data: unknown): Promise<string> {
  try {
    const completion = await groq.chat.completions.create({
      messages: [
        { role: "system", content: "Eres un director académico experto. Analiza los datos de la sesión y da un resumen ejecutivo de 3 líneas." },
        { role: "user", content: JSON.stringify(data) }
      ],
      model: "llama-3.1-8b-instant",
    });
    return completion.choices[0].message.content || "Análisis no disponible.";
  } catch {
    return "Error en el análisis automático. Por favor revisa los KPI manuales.";
  }
}
