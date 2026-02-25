import * as XLSX from 'xlsx';
import { Question } from './schemas';

export interface ImportResult {
    questions: Question[];
    errors: string[];
}

export const parseQuizFile = async (file: File): Promise<ImportResult> => {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = e.target?.result;
                const workbook = XLSX.read(data, { type: 'binary' });
                const sheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[sheetName];
                const json = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as unknown[][];

                if (json.length < 2) {
                    resolve({ questions: [], errors: ["El archivo está vacío o no tiene el formato correcto."] });
                    return;
                }

                const headers = (json[0] as unknown[]).map(h => String(h || "").toLowerCase());

                // Helper to find column index by keywords
                const findCol = (keywords: string[], defaultIdx: number) => {
                    const idx = headers.findIndex(h => keywords.some(k => h.includes(k)));
                    return idx === -1 ? defaultIdx : idx;
                };

                const colQuestion = findCol(["pregunta", "question", "text"], 0);
                const colType = findCol(["tipo", "type"], 1);
                const colOptionsStart = findCol(["opcion", "option", "alternativa"], 2);
                const colCorrect = findCol(["correct", "respuesta", "solucion"], 3);
                const colTime = findCol(["tiempo", "time", "seg"], 4);
                const colPoints = findCol(["puntos", "point", "score"], 5);

                const rows = json.slice(1);
                const questions: Question[] = [];
                const errors: string[] = [];

                rows.forEach((row, index) => {
                    const question_text = String(row[colQuestion] || "").trim();
                    if (!question_text) return;

                    try {
                        let raw_type = String(row[colType] || "").trim().toLowerCase();
                        let options: string[] = [];

                        // Collect options first to help with type inference
                        const firstOptionVal = String(row[colOptionsStart] || "");
                        if (firstOptionVal.includes(";") || firstOptionVal.includes("|")) {
                            options = firstOptionVal.split(/[;|]/).map(o => o.trim()).filter(o => o !== "");
                        } else {
                            // Collect from multiple columns (up to 8)
                            for (let i = colOptionsStart; i < colOptionsStart + 8; i++) {
                                if (i === colCorrect || i === colTime || i === colPoints) break;
                                const val = String(row[i] || "").trim();
                                if (val) options.push(val);
                            }
                        }

                        // Intelligent Type Inference
                        let question_type: Question['question_type'] = "multiple_choice";
                        if (raw_type.includes("v") || raw_type.includes("f") || raw_type === "true_false") {
                            question_type = "true_false";
                        } else if (raw_type.includes("oracion") || raw_type.includes("blank") || raw_type === "fill_in_the_blank") {
                            question_type = "fill_in_the_blank";
                        } else if (raw_type.includes("parear") || raw_type.includes("matching")) {
                            question_type = "matching";
                        } else if (!raw_type) {
                            // Infer if empty: 2 options usually means True/False if they match standard values
                            if (options.length === 2 && options.some(o => /^(verdadero|falso|true|false|v|f)$/i.test(o))) {
                                question_type = "true_false";
                            }
                        }

                        if (question_type === "true_false") {
                            options = ["Verdadero", "Falso"];
                        }

                        let correct_answer = String(row[colCorrect] || "").trim();

                        // Handle "Marked by Letter/Index" (A, B, C, D or 1, 2, 3, 4)
                        const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
                        const letterIdx = alphabet.indexOf(correct_answer.toUpperCase());

                        // Try to parse as number (1-indexed)
                        const numVal = parseInt(correct_answer);
                        const isNumericIndex = !isNaN(numVal) && String(numVal) === correct_answer;

                        if (letterIdx !== -1 && letterIdx < options.length && options.length > 2) {
                            // If it's a letter like A, B, C and we have enough options
                            correct_answer = options[letterIdx];
                        } else if (isNumericIndex && numVal >= 1 && numVal <= options.length) {
                            // If it's a number like 1, 2, 3
                            correct_answer = options[numVal - 1];
                        }

                        // Special case for T/F mapping if it wasn't caught
                        if (question_type === "true_false") {
                            if (/^(v|true|verdadero|1)$/i.test(correct_answer)) correct_answer = "Verdadero";
                            else if (/^(f|false|falso|0)$/i.test(correct_answer)) correct_answer = "Falso";
                        }

                        if (question_type === "multiple_choice" && options.length < 2) {
                            errors.push(`Fila ${index + 2}: Opciones insuficientes.`);
                        }

                        const time_limit = parseInt(String(row[colTime])) || 20;
                        const points = parseInt(String(row[colPoints])) || 1000;

                        questions.push({
                            question_text,
                            question_type,
                            options,
                            correct_answer,
                            time_limit,
                            points
                        } as Question);
                    } catch {
                        errors.push(`Fila ${index + 2}: Error de formato.`);
                    }
                });

                resolve({ questions, errors });
            } catch {
                resolve({ questions: [], errors: ["Error al leer el archivo. Asegúrate de que sea un Excel o CSV válido."] });
            }
        };

        reader.onerror = () => resolve({ questions: [], errors: ["Error de lectura del archivo."] });
        reader.readAsBinaryString(file);
    });
};

export const downloadTemplate = () => {
    const data = [
        ["Pregunta", "Tipo", "Opción 1", "Opción 2", "Opción 3", "Opción 4", "Correcta", "Tiempo", "Puntos"],
        ["¿Cuál es el planeta más grande?", "opciones", "Marte", "Júpiter", "Saturno", "Tierra", "B", 20, 1000],
        ["¿2+2 es 4?", "vf", "Verdadero", "Falso", "", "", "1", 10, 500],
        ["La ______ es vital para la vida.", "oracion", "", "", "", "", "agua", 20, 1000],
        ["España:Madrid;Italia:Roma", "parear", "", "", "", "", "MATCHING_MODE", 30, 1500]
    ];
    const ws = XLSX.utils.aoa_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "QuizzLive Template");
    XLSX.writeFile(wb, "Plantilla_QuizzLive.xlsx");
};
