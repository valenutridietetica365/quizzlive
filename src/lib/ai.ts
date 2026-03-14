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
    const questions = await withRetry(async () => {
      console.log(`Attempting Groq Generation for ${params.topic || 'PDF Content'}...`);
      const result = await generateWithGroq(params);
      
      const schema = z.array(QuestionSchema.omit({ id: true, quiz_id: true, sort_order: true }));
      const validated = schema.parse(result);
      return validated as GeneratedQuestion[];
    });

    // Final multi-layer validation and normalization
    return questions.map(q => normalizeQuestion(q));

  } catch (error) {
    console.warn("Groq failed, falling back to Gemini:", error);
    try {
      // 2. Try Gemini Fallback
      const geminiQuestions = await withRetry(async () => {
        console.log("Attempting Gemini Fallback...");
        const result = await generateWithGemini(params);
        const schema = z.array(QuestionSchema.omit({ id: true, quiz_id: true, sort_order: true }));
        const validated = schema.parse(result);
        return validated as GeneratedQuestion[];
      });

      return geminiQuestions.map(q => normalizeQuestion(q));

    } catch (geminiError) {
      console.error("Critical AI Failure:", geminiError);
      const detail = geminiError instanceof Error ? geminiError.message : String(geminiError);
      throw new Error(`Error en la generación: ${detail.substring(0, 50)}... Intenta de nuevo o verifica tu conexión.`);
    }
  }
}

/**
 * Ensures the question follows strict rules before being saved
 */
function normalizeQuestion(q: GeneratedQuestion): GeneratedQuestion {
  const normOptions = q.options.map(o => o.trim());
  let correct = q.correct_answer?.trim() || "";

  // For Multiple Choice / True-False: Ensure the correct answer matches exactly one option
  if (q.question_type === 'multiple_choice' || q.question_type === 'true_false') {
    // If not found exactly, try case-insensitive
    if (!normOptions.includes(correct)) {
      const match = normOptions.find(o => o.toLowerCase() === correct.toLowerCase());
      if (match) {
        correct = match;
      } else {
        // Fallback to first option if something went totally wrong, but AI should prevent this
        correct = normOptions[0] || "";
      }
    }
  } else if (q.question_type === 'hangman') {
    correct = correct.toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, ""); // Basic normalization
  }

  return {
    ...q,
    options: normOptions,
    correct_answer: correct
  };
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
  
  const prompt = `Act as an Expert Pedagogue, Fact-Checker and Quiz Creator. 
  Your mission is to create a quiz that is factually indisputable and grammatically flawless.
  ${context}
  
  Target Audience Grade: ${grade || 'General'}
  Output Language: ${isSpanish ? 'Spanish (Universal/Neutral)' : 'English'}
  Question Type: ${typeInstruction}
  Number of Questions: ${count}

  STRICT QUALITY CRITERIA:
  1. FACTUAL TRUTH: Perform a mental check of every fact. (e.g., If the topic is science, ensure "Platino" is indeed denser than "Oro" if that's the answer).
  2. ORTHOGRAPHY (Very Important): 
     - No spelling errors. Use "gravedad" NOT "gravidad".
     - Proper accentuation in Spanish (e.g., "geografía", "energía", "biología").
     - Capitalize the beginning of sentences and proper nouns.
  3. LOGICAL OPTIONS: Ensure there is EXACTLY ONE clearly correct answer.
  4. NO HALLUCINATIONS: Do not invent facts.

  STRICT JSON FORMAT:
  Return a JSON object with a "questions" key containing an array of question objects.
  
  QUESTION STRUCTURE:
  - "question_text": The clear question text.
  - "question_type": "multiple_choice", "true_false", "fill_in_the_blank", "matching", or "hangman".
  - "options": Array of 4 strings for Multiple Choice, 2 for True/False.
  - "correct_answer": MUST be a string that exists exactly in the "options" array.
  - "time_limit": 20.
  - "points": 1000.

  ${questionType === 'multiple_choice' || questionType === 'mixed' ? examples.multiple_choice : ''}
  ${questionType === 'hangman' ? examples.hangman : ''}`;

  const completion = await groq.chat.completions.create({
    messages: [
      { 
        role: "system", 
        content: `You are a professional quiz generator. 
        You MUST verify all facts before responding. 
        You MUST ensure perfect spelling and grammar in ${isSpanish ? 'Spanish' : 'English'}.
        You always return a JSON object with a 'questions' array.` 
      },
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

  const prompt = `Act as an Expert Quiz Generator and Pedagogue. 
  Generate ${count} ${typeInstruction} questions. 
  Context: ${context}
  Target Grade: ${grade}. 
  Output Language: ${language}.
  
  STRICT RULES:
  1. Perfect spelling and grammar in ${language}. No typos (e.g. use "gravedad").
  2. Fact-check everything. The correct_answer must be objectively true.
  3. Plausible distractors.
  
  Return a JSON array of objects. Each object MUST have:
  - question_text (string)
  - question_type ("multiple_choice", "true_false", "fill_in_the_blank", or "hangman")
  - options (array of strings)
  - correct_answer (string from options or CAPS word for hangman)
  - points (1000)
  - time_limit (number between 15 and 30)
  
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
