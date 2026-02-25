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
                    if (!row[colQuestion]) return;

                    try {
                        const question_text = String(row[colQuestion] || "").trim();
                        const raw_type = String(row[colType] || "multiple_choice").trim().toLowerCase();

                        let question_type: Question['question_type'] = "multiple_choice";
                        if (raw_type.includes("v") || raw_type.includes("f") || raw_type === "true_false") question_type = "true_false";
                        else if (raw_type.includes("oracion") || raw_type.includes("blank") || raw_type === "fill_in_the_blank") question_type = "fill_in_the_blank";
                        else if (raw_type.includes("parear") || raw_type.includes("matching")) question_type = "matching";

                        let options: string[] = [];

                        if (question_type === "multiple_choice" || question_type === "matching") {
                            // Check if options are in a single delimited column or multiple columns
                            const firstOptionVal = String(row[colOptionsStart] || "");
                            if (firstOptionVal.includes(";") || firstOptionVal.includes("|")) {
                                options = firstOptionVal.split(/[;|]/).map(o => o.trim()).filter(o => o !== "");
                            } else {
                                // Collect from multiple columns until we hit a known "named" column or run out of alternatives
                                // We'll look at the next 4-6 columns starting from colOptionsStart
                                for (let i = colOptionsStart; i < colOptionsStart + 6; i++) {
                                    if (i === colCorrect || i === colTime || i === colPoints) break;
                                    const val = String(row[i] || "").trim();
                                    if (val) options.push(val);
                                }
                            }

                            if (options.length < 2 && question_type === "multiple_choice") {
                                errors.push(`Fila ${index + 2}: Opciones insuficientes para selección múltiple.`);
                            }
                        } else if (question_type === "true_false") {
                            options = ["Verdadero", "Falso"];
                        }

                        const correct_answer = String(row[colCorrect] || "").trim();
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
        ["¿Cuál es el planeta más grande?", "opciones", "Marte", "Júpiter", "Saturno", "Tierra", "Júpiter", 20, 1000],
        ["¿2+2 es 4?", "vf", "Verdadero", "Falso", "", "", "Verdadero", 10, 500],
        ["La ______ es vital para la vida.", "oracion", "", "", "", "", "agua", 20, 1000],
        ["España:Madrid;Italia:Roma", "parear", "", "", "", "", "MATCHING_MODE", 30, 1500]
    ];
    const ws = XLSX.utils.aoa_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "QuizzLive Template");
    XLSX.writeFile(wb, "Plantilla_QuizzLive.xlsx");
};
