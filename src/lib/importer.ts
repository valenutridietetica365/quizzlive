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
                const json = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];

                if (json.length < 2) {
                    resolve({ questions: [], errors: ["El archivo está vacío o no tiene el formato correcto."] });
                    return;
                }

                // Header mapping (Expected: Pregunta, Tipo, Opciones, Correcta, Tiempo, Puntos)
                // First row is headers
                const rows = json.slice(1);
                const questions: Question[] = [];
                const errors: string[] = [];

                rows.forEach((row, index) => {
                    if (!row[0]) return; // Skip empty rows

                    try {
                        const question_text = String(row[0] || "").trim();
                        const raw_type = String(row[1] || "multiple_choice").trim().toLowerCase();

                        // Map human readable/common types to schema types
                        let question_type: any = "multiple_choice";
                        if (raw_type.includes("v") || raw_type.includes("f") || raw_type === "true_false") question_type = "true_false";
                        else if (raw_type.includes("oracion") || raw_type.includes("blank") || raw_type === "fill_in_the_blank") question_type = "fill_in_the_blank";
                        else if (raw_type.includes("parear") || raw_type.includes("matching")) question_type = "matching";

                        const raw_options = String(row[2] || "");
                        let options: string[] = [];

                        if (question_type === "multiple_choice") {
                            options = raw_options.split(/[;|,]/).map(o => o.trim()).filter(o => o !== "");
                            if (options.length < 2) errors.push(`Transline ${index + 2}: Opciones insuficientes para selección múltiple.`);
                        } else if (question_type === "true_false") {
                            options = ["Verdadero", "Falso"]; // Defaulting to Spanish for now, will be handled by UI
                        } else if (question_type === "matching") {
                            options = raw_options.split(/[;|,]/).map(o => o.trim()).filter(o => o !== "");
                        }

                        const correct_answer = String(row[3] || "").trim();
                        const time_limit = parseInt(row[4]) || 20;
                        const points = parseInt(row[5]) || 1000;

                        questions.push({
                            question_text,
                            question_type,
                            options,
                            correct_answer,
                            time_limit,
                            points
                        } as Question);
                    } catch (err) {
                        errors.push(`Fila ${index + 2}: Error de formato.`);
                    }
                });

                resolve({ questions, errors });
            } catch (err) {
                resolve({ questions: [], errors: ["Error al leer el archivo. Asegúrate de que sea un Excel o CSV válido."] });
            }
        };

        reader.onerror = () => resolve({ questions: [], errors: ["Error de lectura del archivo."] });
        reader.readAsBinaryString(file);
    });
};

export const downloadTemplate = () => {
    const ws = XLSX.utils.aoa_to_sheet([
        ["Pregunta", "Tipo (opciones/vf/oracion/parear)", "Opciones (separadas por ;)", "Correcta", "Tiempo (seg)", "Puntos"],
        ["¿Cuál es la capital de Francia?", "opciones", "París;Londres;Madrid;Berlín", "París", 20, 1000],
        ["El agua hierve a 100 grados Celsius.", "vf", "", "Verdadero", 10, 500],
        ["La capital de Japón es _______.", "oracion", "", "Tokio", 20, 1000],
        ["Une los países con sus capitales", "parear", "España:Madrid;Italia:Roma;Francia:París", "MATCHING_MODE", 30, 1500]
    ]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Template");
    XLSX.writeFile(wb, "QuizzLive_Template.xlsx");
};
