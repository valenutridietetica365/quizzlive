import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { calculateChileanGrade } from './grading';

export interface ReportAnswer {
    is_correct: boolean;
    points_awarded: number;
    question_id: string;
    participant_id: string;
    answer_text: string;
}

export interface ReportQuestion {
    id: string;
    question_text: string;
    points: number;
    options: string[];
    correct_answer: string;
}

export interface ReportParticipant {
    id: string;
    nickname: string;
}

export interface ReportData {
    session: {
        id: string;
        pin: string;
        created_at: string;
        finished_at: string;
        quiz: {
            title: string;
            class?: { name: string } | string | null;
        };
    };
    answers: ReportAnswer[];
    questions: ReportQuestion[];
    participants: ReportParticipant[];
    exigency?: number;
    branding?: {
        institution_name?: string | null;
        logo_url?: string | null;
        brand_color?: string | null;
    };
}

export const generateExcelReport = (data: ReportData, t: (key: string) => string) => {
    const { session, answers, questions, participants, exigency } = data;

    // --- Helper for professional sheet creation ---
    const createSheet = (rows: (string | number | boolean | null | undefined)[][], colWidths: XLSX.ColInfo[]) => {
        const ws = XLSX.utils.aoa_to_sheet(rows);
        ws['!cols'] = colWidths;
        return ws;
    };

    const BRANDING_TITLE = data.branding?.institution_name 
        ? `${data.branding.institution_name.toUpperCase()} - REPORTE PEDAGÓGICO`
        : "📊 QUIZZLIVE - REPORTE PEDAGÓGICO PROFESIONAL";
    const DATE_STR = new Date(session.finished_at).toLocaleString();

    // --- 1. Sheet: Summary ---
    const summaryRows = [
        [BRANDING_TITLE],
        [t('session.report_summary').toUpperCase()],
        [],
        ["📋 " + t('session.title'), session.quiz.title],
        ["🏫 " + t('sidebar.classes'), typeof session.quiz.class === 'string' ? session.quiz.class : (session.quiz.class?.name || 'N/A')],
        ["🗓️ " + t('dashboard.table_date'), DATE_STR],
        ["🔑 " + t('dashboard.table_pin'), session.pin],
        [],
        ["🚀 INDICADORES CLAVE (KPIs)"],
        [t('analytics.participation'), `${participants.length} ${t('common.student')}s`],
        [t('analytics.avg_success'), `${Math.round((answers.filter(a => a.is_correct).length / Math.max(1, answers.length)) * 100)}%`],
        [],
        ["✨ GENERADO POR QUIZZLIVE PLATFORM"]
    ];
    const summarySheet = createSheet(summaryRows, [
        { wch: 35 }, // A
        { wch: 55 }, // B
    ]);

    // --- 2. Sheet: Grades ---
    const exig = exigency || 0.6;
    const maxTotalScore = questions.reduce((sum, q) => sum + (q.points || 0), 0);
    const calculateGrade = (score: number) => calculateChileanGrade(score, maxTotalScore, { exigency: exig });

    const studentGrades = participants.map(p => {
        const studentAnswers = answers.filter(a => a.participant_id === p.id);
        const correct = studentAnswers.filter(a => a.is_correct).length;
        const total = studentAnswers.length;
        const score = studentAnswers.reduce((sum, a) => sum + (a.points_awarded || 0), 0);
        
        // Pedagogical Score: Sum of base question weights for correct answers
        const pedagogicalScore = studentAnswers.reduce((sum, a) => {
            if (!a.is_correct) return sum;
            const q = questions.find(question => question.id === a.question_id);
            return sum + (q?.points || 0);
        }, 0);

        const accuracy = total > 0 ? Math.round((correct / total) * 100) : 0;
        const grade = calculateGrade(pedagogicalScore);

        return {
            name: p.nickname,
            score,
            grade,
            correct,
            total,
            accuracy: `${accuracy}%`
        };
    }).sort((a, b) => b.score - a.score);

    const gradesRows: (string | number | boolean | null | undefined)[][] = [
        [BRANDING_TITLE],
        ["🎓 " + t('analytics.grading_title').toUpperCase()],
        [t('analytics.exigency') + ":", `${exig * 100}%`],
        [],
        [
            "Puesto", 
            t('session.table_student'), 
            t('analytics.grade'), 
            t('session.table_score'), 
            t('session.table_correct'), 
            t('session.table_accuracy')
        ]
    ];

    studentGrades.forEach((g, idx) => {
        gradesRows.push([
            idx + 1, 
            g.name, 
            g.grade.toFixed(1), 
            g.score, 
            `${g.correct}/${g.total}`, 
            g.accuracy
        ]);
    });

    const gradesSheet = createSheet(gradesRows, [
        { wch: 10 }, // Rank
        { wch: 40 }, // Student
        { wch: 15 }, // Grade
        { wch: 15 }, // Score
        { wch: 15 }, // Corrects
        { wch: 15 }, // Accuracy
    ]);

    // --- 3. Sheet: Matrix ---
    const matrixHeader = [t('session.table_student'), ...questions.map((_, i) => `Q${i + 1}`)];
    const matrixRows: (string | number | boolean | null | undefined)[][] = [
        [BRANDING_TITLE],
        ["🗺️ MATRIZ DE RESPUESTAS (MAPA DE CALOR)"],
        ["Leyenda:", "✅ = Correcto", "❌ = Incorrecto", "➖ = No respondió"],
        [],
        matrixHeader
    ];

    participants.sort((a, b) => a.nickname.localeCompare(b.nickname)).forEach(p => {
        const row = [p.nickname];
        questions.forEach(q => {
            const answer = answers.find(a => a.participant_id === p.id && a.question_id === q.id);
            if (!answer) row.push('➖');
            else row.push(answer.is_correct ? '✅' : '❌');
        });
        matrixRows.push(row);
    });

    matrixRows.push([]);
    matrixRows.push(["📍 REFERENCIA DE PREGUNTAS"]);
    questions.forEach((q, i) => {
        matrixRows.push([`Q${i + 1}`, q.question_text]);
    });

    const matrixSheet = createSheet(matrixRows, [
        { wch: 40 }, // Student
        ...questions.map(() => ({ wch: 8 }))
    ]);

    // --- 4. Sheet: Distractors ---
    const distractorRows: (string | number | boolean | null | undefined)[][] = [
        [BRANDING_TITLE],
        ["🎯 ANÁLISIS DE DISTRACTORES (OPCIONES CONFUSAS)"],
        ["Resumen de cuáles opciones incorrectas fueron el mayor obstáculo"],
        [],
        ["Pregunta", "Opción más elegida (Incorrecta)", "Frecuencia", "% de la Clase"]
    ];

    questions.forEach(q => {
        const qAnswers = answers.filter(a => a.question_id === q.id && !a.is_correct);
        if (qAnswers.length === 0) return;

        const counts: Record<string, number> = {};
        qAnswers.forEach(a => {
            const val = a.answer_text || "Sin respuesta";
            counts[val] = (counts[val] || 0) + 1;
        });

        const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
        const topDistractor = sorted[0];

        distractorRows.push([
            q.question_text,
            topDistractor[0],
            topDistractor[1],
            `${Math.round((topDistractor[1] / participants.length) * 100)}%`
        ]);
    });

    const distractorSheet = createSheet(distractorRows, [
        { wch: 50 }, // Question
        { wch: 40 }, // Top Distractor
        { wch: 15 }, // Frequency
        { wch: 15 }, // Percentage
    ]);

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, summarySheet, t('session.report_summary'));
    XLSX.utils.book_append_sheet(wb, gradesSheet, t('session.report_grades'));
    XLSX.utils.book_append_sheet(wb, matrixSheet, t('session.report_matrix'));
    XLSX.utils.book_append_sheet(wb, distractorSheet, "Distractores");

    const cleanTitle = session.quiz.title.replace(/[\\/?:*|"<>]/g, '').replace(/\s+/g, '_');
    const fileName = `Reporte_${cleanTitle}_${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(wb, fileName);
};

export const generatePDFReport = (data: ReportData, t: (key: string) => string) => {
    const { session, answers, questions, participants, exigency } = data;
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;
    const dateStr = new Date(session.finished_at).toLocaleString();

    // --- 1. Header & Branding ---
    const brandColor = data.branding?.brand_color || '#3b82f6';
    const rgb = hexToRgb(brandColor);

    doc.setFillColor(15, 23, 42); // slate-900
    doc.rect(0, 0, pageWidth, 40, 'F');

    if (data.branding?.logo_url) {
        // We'll try to add the image if possible. In a production env, 
        // normally we should ensure the image is pre-loaded or base64.
        try {
            doc.addImage(data.branding.logo_url, 'PNG', 20, 10, 20, 20);
            doc.setTextColor(255, 255, 255);
            doc.setFontSize(18);
            doc.text(data.branding.institution_name || "QUIZZLIVE", 45, 22);
        } catch {
            doc.setTextColor(255, 255, 255);
            doc.setFontSize(22);
            doc.text(data.branding.institution_name || "QUIZZLIVE", 20, 20);
        }
    } else {
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(22);
        doc.setFont("helvetica", "bold");
        doc.text("QUIZZLIVE", 20, 20);
    }

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(t('analytics.ai_report_title').toUpperCase() || "REPORTE PEDAGÓGICO PROFESIONAL", 20, 28);

    // Header Info Box (Right)
    doc.setFontSize(9);
    doc.text(`${t('dashboard.table_pin')}: ${session.pin}`, pageWidth - 60, 15);
    doc.text(`${t('dashboard.table_date')}: ${dateStr}`, pageWidth - 60, 22);
    doc.text(`ID: ${session.id.substring(0, 8)}`, pageWidth - 60, 29);

    // --- 2. Session Info Section ---
    let yPos = 55;
    doc.setTextColor(15, 23, 42);
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text(session.quiz.title.toUpperCase(), 20, yPos);

    yPos += 10;
    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");
    doc.text(`${t('sidebar.classes')}: ${typeof session.quiz.class === 'string' ? session.quiz.class : (session.quiz.class?.name || 'N/A')}`, 20, yPos);

    // --- 3. KPIs Recap ---
    yPos += 20;
    const correctCount = answers.filter(a => a.is_correct).length;
    const totalAnswers = Math.max(1, answers.length);
    const avgSuccess = Math.round((correctCount / totalAnswers) * 100);

    const exig = exigency || 0.6;
    const maxTotalScore = questions.reduce((sum, q) => sum + (q.points || 0), 0);

    const calculateGrade = (score: number) => calculateChileanGrade(score, maxTotalScore, { exigency: exig });

    autoTable(doc, {
        startY: yPos,
        head: [[t('analytics.participation'), t('analytics.avg_success'), t('analytics.exigency'), t('analytics.max_score')]],
        body: [[`${participants.length} ${t('common.student')}s`, `${avgSuccess}%`, `${exig * 100}%`, maxTotalScore.toLocaleString()]],
        theme: 'grid',
        headStyles: { fillColor: rgb, fontStyle: 'bold' }, 
    });

    // --- 4. Rankings Table ---
    const docWithTable = doc as jsPDF & { lastAutoTable: { finalY: number } };
    yPos = docWithTable.lastAutoTable.finalY + 15;
    doc.setFontSize(13);
    doc.setFont("helvetica", "bold");
    doc.text(`${t('session.report_grades').toUpperCase()} (1.0 - 7.0)`, 20, yPos);

    const studentGrades = participants.map(p => {
        const pAnswers = answers.filter(a => a.participant_id === p.id);
        const gamifiedScore = pAnswers.reduce((s, a) => s + (a.points_awarded || 0), 0);
        
        // Pedagogical Score: Sum of base question weights for correct answers
        const pedagogicalScore = pAnswers.reduce((sum, a) => {
            if (!a.is_correct) return sum;
            const q = questions.find(question => question.id === a.question_id);
            return sum + (q?.points || 0);
        }, 0);

        return {
            name: p.nickname,
            score: gamifiedScore,
            grade: calculateGrade(pedagogicalScore),
            correct: pAnswers.filter(a => a.is_correct).length,
            total: pAnswers.length,
            accuracy: pAnswers.length > 0 ? `${Math.round((pAnswers.filter(a => a.is_correct).length / pAnswers.length) * 100)}%` : '0%'
        };
    }).sort((a, b) => b.score - a.score);

    autoTable(doc, {
        startY: yPos + 8,
        head: [[t('session.table_rank'), t('session.table_student'), t('analytics.grade'), t('session.table_score'), t('session.table_correct'), t('session.table_accuracy')]],
        body: studentGrades.map((g, i) => [i + 1, g.name, g.grade.toFixed(1), g.score, `${g.correct}/${g.total}`, g.accuracy]),
        styles: { fontSize: 9, cellPadding: 3 },
        headStyles: { fillColor: [30, 41, 59], fontStyle: 'bold' }, // slate-800
        didParseCell: (data) => {
            if (data.section === 'body' && data.column.index === 2) {
                const gradeText = data.cell.text[0];
                const grade = parseFloat(gradeText);
                if (grade >= 4.0) data.cell.styles.textColor = [30, 64, 175]; // blue-900 (stronger for print)
                else data.cell.styles.textColor = [190, 18, 60]; // rose-900
                data.cell.styles.fontStyle = 'bold';
            }
        }
    });

    // --- 5. Response Matrix (Heatmap) ---
    doc.addPage();
    doc.setFontSize(13);
    doc.setFont("helvetica", "bold");
    doc.text(t('session.report_matrix').toUpperCase(), 20, 20);

    const matrixHead = [t('session.table_student'), ...questions.map((_, i) => `P${i + 1}`)];
    const matrixBody = participants.sort((a, b) => a.nickname.localeCompare(b.nickname)).map(p => {
        const row = [p.nickname];
        questions.forEach(q => {
            const ans = answers.find(a => a.participant_id === p.id && a.question_id === q.id);
            if (!ans) row.push('-');
            else row.push(ans.is_correct ? '√' : 'X');
        });
        return row;
    });

    autoTable(doc, {
        startY: 30,
        head: [matrixHead],
        body: matrixBody,
        styles: { fontSize: 7, cellPadding: 1.5 },
        headStyles: { fillColor: [30, 41, 59] },
        didParseCell: (data) => {
            if (data.section === 'body' && data.column.index > 0) {
                if (data.cell.text[0] === '√') {
                    data.cell.styles.textColor = [16, 185, 129]; // emerald-500
                    data.cell.styles.fontStyle = 'bold';
                } else if (data.cell.text[0] === 'X') {
                    data.cell.styles.textColor = [244, 63, 94]; // rose-500
                    data.cell.styles.fontStyle = 'bold';
                }
            }
        }
    });

    // Question Legend
    yPos = docWithTable.lastAutoTable.finalY + 10;
    doc.setFontSize(10);
    doc.text(`${t('common.questions')} (ID):`, 20, yPos);

    questions.forEach((q, i) => {
        if (yPos > 270) { doc.addPage(); yPos = 20; }
        yPos += 6;
        doc.setFontSize(8);
        doc.setFont("helvetica", "normal");
        doc.text(`P${i + 1}: ${q.question_text}`, 25, yPos);
    });

    // --- 6. Distractor Highlights ---
    doc.addPage();
    doc.setFontSize(13);
    doc.setFont("helvetica", "bold");
    doc.text("🎯 HALLAZGOS PEDAGÓGICOS (DISTRACTORES)", 20, 20);
    
    const distractorBody = questions.map(q => {
        const qAnswers = answers.filter(a => a.question_id === q.id && !a.is_correct);
        if (qAnswers.length === 0) return null;

        const counts: Record<string, number> = {};
        qAnswers.forEach(a => {
            const val = a.answer_text || "Sin respuesta";
            counts[val] = (counts[val] || 0) + 1;
        });

        const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
        const top = sorted[0];

        return [
            q.question_text.substring(0, 50) + "...",
            top[0],
            `${Math.round((top[1] / participants.length) * 100)}%`
        ];
    }).filter(Boolean);

    autoTable(doc, {
        startY: 30,
        head: [["Pregunta", "Opción Confusa", "% Alumnos"]],
        body: distractorBody as (string | number)[][],
        styles: { fontSize: 8 },
        headStyles: { fillColor: [245, 158, 11] }, // amber-500
    });

    // Footer on all pages
    const internalDoc = doc.internal as unknown as { getNumberOfPages: () => number };
    const pageCount = internalDoc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(150);
        doc.text(`${t('common.page')} ${i} ${t('common.of')} ${pageCount}`, pageWidth / 2, 290, { align: 'center' });
    }

    doc.save(`Reporte_${session.quiz.title.replace(/\s+/g, '_')}_${new Date(session.finished_at).toISOString().split('T')[0]}.pdf`);
};

// Helper to convert HEX to RGB for jsPDF
function hexToRgb(hex: string): [number, number, number] {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return [r, g, b];
}
