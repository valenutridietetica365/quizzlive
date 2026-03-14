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
    console.warn(`AI Attempt failed, retrying in ${delay}ms... (${retries} retries left). Error:`, error instanceof Error ? error.message : error);
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
      console.log(`Attempting Groq Generation for ${params.topic || 'PDF Content'}...`);
      const result = await generateWithGroq(params);
      
      const schema = z.array(QuestionSchema.omit({ id: true, quiz_id: true, sort_order: true }));
      const validated = schema.parse(result);
      return validated as GeneratedQuestion[];
    });
  } catch (error) {
    console.warn("Groq failed, falling back to Gemini:", error);
    try {
      // 2. Try Gemini Fallback
      return await withRetry(async () => {
        console.log("Attempting Gemini Fallback...");
        const result = await generateWithGemini(params);
        const schema = z.array(QuestionSchema.omit({ id: true, quiz_id: true, sort_order: true }));
        const validated = schema.parse(result);
        return validated as GeneratedQuestion[];
      });
    } catch (geminiError) {
      console.error("Critical AI Failure:", geminiError);
      // Incluimos detalles del error para depuración si es posible
      const detail = geminiError instanceof Error ? geminiError.message : String(geminiError);
      throw new Error(`Lo sentimos, no pudimos generar las preguntas en este momento. Por favor, intenta de nuevo o sube contenido más corto. (Ref: ${detail.substring(0, 50)})`);
    }
  }
}

/**
 * Groq Optimization: Few-Shot Prompting & Strict Instructions
 */
async function generateWithGroq({ topic, count, grade, language, questionType, pdfText }: AIParams): Promise<unknown[]> {
  const isSpanish = language === "es";
  // Mapeo de tipos para el prompt si es 'mixed'
  const typeInstruction = questionType === 'mixed' 
    ? "mix of multiple_choice and true_false" 
    : questionType;

  // Few-Shot Examples to guide the model
  const examples = {
    multiple_choice: isSpanish 
      ? `Ejemplo: {"question_text": "¿Cuál es la capital de Italia?", "question_type": "multiple_choice", "options": ["Roma", "París", "Madrid", "Londres"], "correct_answer": "Roma", "points": 1000, "time_limit": 20}`
      : `Example: {"question_text": "What is the capital of Italy?", "question_type": "multiple_choice", "options": ["Rome", "Paris", "Madrid", "London"], "correct_answer": "Rome", "points": 1000, "time_limit": 20}`,
    hangman: isSpanish
      ? `Ejemplo: {"question_text": "Animal doméstico que maúlla", "question_type": "hangman", "options": [], "correct_answer": "GATO", "points": 1000, "time_limit": 60}`
      : `Example: {"question_text": "A domestic animal that meows", "question_type": "hangman", "options": [], "correct_answer": "CAT", "points": 1000, "time_limit": 60}`
  };

  const context = pdfText 
    ? `Analyze this content and generate questions strictly based on it. Document Content: """${pdfText.substring(0, 50000)}"""` 
    : `Generate questions based on the topic: "${topic}"`;
  
  const prompt = `Act as an Expert Pedagogue and Quiz Creator.
  ${context}
  
  Target Audience Grade: ${grade || 'General'}
  Output Language: ${isSpanish ? 'Spanish' : 'English'}
  Question Type: ${typeInstruction}
  Number of Questions: ${count}

  STRICT JSON FORMAT:
  Return a JSON object with a "questions" key containing an array of question objects.
  
  QUESTION STRUCTURE:
  - "question_text": The text of the question.
  - "question_type": Must be one of: "multiple_choice", "true_false", "fill_in_the_blank", "matching", "hangman". (Do NOT use "mixed" here).
  - "options": Array of strings.
  - "correct_answer": The exact string from "options" that is correct. For hangman, use the word in CAPS.
  - "time_limit": Number between 10 and 60.
  - "points": 1000.

  ${questionType === 'multiple_choice' || questionType === 'mixed' ? examples.multiple_choice : ''}
  ${questionType === 'hangman' ? examples.hangman : ''}`;

  const completion = await groq.chat.completions.create({
    messages: [
      { role: "system", content: "You are a professional quiz generator. You always return a JSON object with a 'questions' array." },
      { role: "user", content: prompt }
    ],
    model: "llama-3.3-70b-versatile",
    response_format: { type: "json_object" }
  });

  const content = completion.choices[0].message.content || '{"questions": []}';
  try {
    const parsed = JSON.parse(content);
    const questions = parsed.questions || (Array.isArray(parsed) ? parsed : []);
    return questions;
  } catch (err) {
    console.error("Failed to parse Groq response:", content);
    throw err;
  }
}

/**
 * Gemini Fallback with refined prompt
 */
async function generateWithGemini({ topic, count, grade, language, questionType, pdfText }: AIParams): Promise<unknown[]> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY is missing");

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
  const context = pdfText ? `Based on this document: ${pdfText.substring(0, 50000)}` : `Topic: ${topic}`;
  
  const typeInstruction = questionType === 'mixed' ? "multiple choice and true/false" : questionType;

  const prompt = `Act as a Quiz Generator. Generate ${count} ${typeInstruction} questions. 
  Context: ${context}
  Target Grade: ${grade}. 
  Output Language: ${language}.
  
  Return a JSON array of objects. Each object MUST have:
  - question_text (string)
  - question_type ("multiple_choice", "true_false", "fill_in_the_blank", or "hangman")
  - options (array of strings)
  - correct_answer (string from options or CAPS word for hangman)
  - points (1000)
  - time_limit (number)
  
  Return ONLY the JSON. No markdown formatting.`;

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ 
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        response_mime_type: "application/json"
      }
    })
  });

  if (!response.ok) {
    const errData = await response.json();
    throw new Error(`Gemini API error: ${JSON.stringify(errData)}`);
  }
  
  const data = await response.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "[]";
  const cleaned = text.replace(/```json/g, "").replace(/```/g, "").trim();
  
  try {
    const parsed = JSON.parse(cleaned);
    return Array.isArray(parsed) ? parsed : (parsed.questions || []);
  } catch (err) {
    console.error("Gemini JSON parse fail:", cleaned);
    throw err;
  }
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
