import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { calculateChileanGrade } from './grading';

export interface ReportAnswer {
    is_correct: boolean;
    points_awarded: number;
    question_id: string;
    participant_id: string;
}

export interface ReportQuestion {
    id: string;
    question_text: string;
    points: number;
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
            class?: { name: string } | null;
        };
    };
    answers: ReportAnswer[];
    questions: ReportQuestion[];
    participants: ReportParticipant[];
    exigency?: number;
}

export const generateExcelReport = (data: ReportData, t: (key: string) => string) => {
    const { session, answers, questions, participants, exigency } = data;

    // --- Helper for professional sheet creation ---
    const createSheet = (rows: (string | number | boolean | null | undefined)[][], colWidths: XLSX.ColInfo[]) => {
        const ws = XLSX.utils.aoa_to_sheet(rows);
        ws['!cols'] = colWidths;

        // Merged Title Header - Dinámico según el ancho de la tabla
        const maxCol = colWidths.length - 1;
        const merge = { s: { r: 0, c: 1 }, e: { r: 0, c: Math.max(2, maxCol) } };
        if (!ws['!merges']) ws['!merges'] = [];
        ws['!merges'].push(merge);

        return ws;
    };

    const BRANDING = ["", "QUIZZLIVE - REPORTE PEDAGÓGICO"];
    const DATE_STR = new Date(session.finished_at).toLocaleString();

    // --- 1. Sheet: Summary ---
    const summaryRows: (string | number | boolean | null | undefined)[][] = [
        BRANDING,
        ["", "ESTADÍSTICAS GENERALES DE LA SESIÓN"],
        [],
        ["", t('session.title'), session.quiz.title],
        ["", t('sidebar.classes'), session.quiz.class?.name || 'N/A'],
        ["", t('dashboard.table_date'), DATE_STR],
        ["", t('dashboard.table_pin'), session.pin],
        [],
        ["", "INDICADORES CLAVE (KPIs)"],
        ["", t('analytics.participation'), `${participants.length} Alumnos`],
        ["", t('analytics.avg_success'), `${Math.round((answers.filter(a => a.is_correct).length / Math.max(1, answers.length)) * 100)}%`],
        [],
        ["", "GENERADO AUTOMÁTICAMENTE POR QUIZZLIVE PLATFORM"]
    ];
    const summarySheet = createSheet(summaryRows, [
        { wch: 2 }, // A (Margin)
        { wch: 25 }, // B (Label)
        { wch: 50 }, // C (Value)
    ]);

    // --- 2. Sheet: Grades ---
    const exig = exigency || 0.6;
    const maxTotalScore = questions.reduce((sum, q) => sum + q.points, 0);

    const calculateGrade = (score: number) => calculateChileanGrade(score, maxTotalScore, { exigency: exig });

    const studentGrades = participants.map(p => {
        const studentAnswers = answers.filter(a => a.participant_id === p.id);
        const correct = studentAnswers.filter(a => a.is_correct).length;
        const total = studentAnswers.length;
        const score = studentAnswers.reduce((sum, a) => sum + a.points_awarded, 0);
        const accuracy = total > 0 ? Math.round((correct / total) * 100) : 0;
        const grade = calculateGrade(score);

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
        BRANDING,
        ["", t('analytics.grading').toUpperCase()],
        ["", t('analytics.exigency') + ":", `${exig * 100}%`],
        ["", t('dashboard.table_date') + ":", DATE_STR],
        [],
        ["", t('session.table_rank'), t('session.table_student'), t('analytics.grade'), t('session.table_score'), t('session.table_correct'), t('session.table_accuracy')]
    ];

    studentGrades.forEach((g, idx) => {
        gradesRows.push(["", idx + 1, g.name, g.grade.toFixed(1), g.score, `${g.correct}/${g.total}`, g.accuracy]);
    });

    const gradesSheet = createSheet(gradesRows, [
        { wch: 2 }, // A
        { wch: 8 }, // Rank
        { wch: 30 }, // Student
        { wch: 10 }, // Grade
        { wch: 12 }, // Score
        { wch: 15 }, // Corrects
        { wch: 12 }, // Accuracy
    ]);

    // --- 3. Sheet: Response Matrix (Heatmap) ---
    const matrixHeader = ["", t('session.table_student'), ...questions.map((_, i) => `Q${i + 1}`)];
    const matrixRows: (string | number | boolean | null | undefined)[][] = [
        BRANDING,
        ["", "MATRIZ DETALLADA DE RESPUESTAS (MAPA DE CALOR)"],
        ["", "Indicación:", "CORRECT = Acierto, INCORRECT = Fallo, - = No respondió"],
        [],
        matrixHeader
    ];

    participants.sort((a, b) => a.nickname.localeCompare(b.nickname)).forEach(p => {
        const row = ["", p.nickname];
        questions.forEach(q => {
            const answer = answers.find(a => a.participant_id === p.id && a.question_id === q.id);
            if (!answer) row.push('-');
            else row.push(answer.is_correct ? 'CORRECT' : 'INCORRECT');
        });
        matrixRows.push(row);
    });

    // Add Legend at the bottom
    matrixRows.push([]);
    matrixRows.push(["", "LEYENDA DE PREGUNTAS"]);
    questions.forEach((q, i) => {
        matrixRows.push(["", `Q${i + 1}`, q.question_text]);
    });

    const matrixSheet = createSheet(matrixRows, [
        { wch: 2 }, // A
        { wch: 30 }, // Student
        ...questions.map(() => ({ wch: 10 }))
    ]);

    // --- Create Workbook and Download ---
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, summarySheet, t('session.report_summary'));
    XLSX.utils.book_append_sheet(wb, gradesSheet, t('session.report_grades'));
    XLSX.utils.book_append_sheet(wb, matrixSheet, t('session.report_matrix'));

    // Trigger Download
    const fileName = `Reporte_${session.quiz.title.replace(/\s+/g, '_')}_${new Date(session.finished_at).toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(wb, fileName);
};

export const generatePDFReport = (data: ReportData, t: (key: string) => string) => {
    const { session, answers, questions, participants, exigency } = data;
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;
    const dateStr = new Date(session.finished_at).toLocaleString();

    // --- 1. Header & Branding ---
    doc.setFillColor(15, 23, 42); // slate-900
    doc.rect(0, 0, pageWidth, 40, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22);
    doc.setFont("helvetica", "bold");
    doc.text("QUIZZLIVE", 20, 20);

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text("REPORTE PEDAGÓGICO PROFESIONAL", 20, 28);

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
    doc.text(`${t('sidebar.classes')}: ${session.quiz.class?.name || 'N/A'}`, 20, yPos);

    // --- 3. KPIs Recap ---
    yPos += 20;
    const correctCount = answers.filter(a => a.is_correct).length;
    const totalAnswers = Math.max(1, answers.length);
    const avgSuccess = Math.round((correctCount / totalAnswers) * 100);

    const exig = exigency || 0.6;
    const maxTotalScore = questions.reduce((sum, q) => sum + q.points, 0);

    const calculateGrade = (score: number) => calculateChileanGrade(score, maxTotalScore, { exigency: exig });

    autoTable(doc, {
        startY: yPos,
        head: [[t('analytics.participation'), t('analytics.avg_success'), 'Exigencia', 'Puntaje Máximo']],
        body: [[`${participants.length} Alumnos`, `${avgSuccess}%`, `${exig * 100}%`, maxTotalScore.toLocaleString()]],
        theme: 'grid',
        headStyles: { fillColor: [59, 130, 246], fontStyle: 'bold' }, // blue-500
    });

    // --- 4. Rankings Table ---
    const docWithTable = doc as jsPDF & { lastAutoTable: { finalY: number } };
    yPos = docWithTable.lastAutoTable.finalY + 15;
    doc.setFontSize(13);
    doc.setFont("helvetica", "bold");
    doc.text("TABLA DE CALIFICACIONES (ESCALA 1.0 - 7.0)", 20, yPos);

    const studentGrades = participants.map(p => {
        const pAnswers = answers.filter(a => a.participant_id === p.id);
        const score = pAnswers.reduce((s, a) => s + a.points_awarded, 0);
        return {
            name: p.nickname,
            score: score,
            grade: calculateGrade(score),
            correct: pAnswers.filter(a => a.is_correct).length,
            total: pAnswers.length,
            accuracy: pAnswers.length > 0 ? `${Math.round((pAnswers.filter(a => a.is_correct).length / pAnswers.length) * 100)}%` : '0%'
        };
    }).sort((a, b) => b.score - a.score);

    autoTable(doc, {
        startY: yPos + 5,
        head: [[t('session.table_rank'), t('session.table_student'), 'Nota', t('session.table_score'), t('session.table_correct'), t('session.table_accuracy')]],
        body: studentGrades.map((g, i) => [i + 1, g.name, g.grade.toFixed(1), g.score, `${g.correct}/${g.total}`, g.accuracy]),
        styles: { fontSize: 9 },
        headStyles: { fillColor: [30, 41, 59] }, // slate-800
        didParseCell: (data) => {
            if (data.section === 'body' && data.column.index === 2) {
                const grade = parseFloat(data.cell.text[0]);
                if (grade >= 4.0) data.cell.styles.textColor = [59, 130, 246]; // blue-500
                else data.cell.styles.textColor = [244, 63, 94]; // rose-500
            }
        }
    });

    // --- 5. Response Matrix (Heatmap) ---
    doc.addPage();
    doc.setFontSize(13);
    doc.setFont("helvetica", "bold");
    doc.text("MATRIZ DE RESPUESTAS POR PREGUNTA", 20, 20);

    const matrixHead = [t('session.table_student'), ...questions.map((_, i) => `P${i + 1}`)];
    const matrixBody = participants.sort((a, b) => a.nickname.localeCompare(b.nickname)).map(p => {
        const row = [p.nickname];
        questions.forEach(q => {
            const ans = answers.find(a => a.participant_id === p.id && a.question_id === q.id);
            if (!ans) row.push('-');
            else row.push(ans.is_correct ? 'CORR' : 'INC');
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
                if (data.cell.text[0] === 'CORR') {
                    data.cell.styles.textColor = [16, 185, 129]; // emerald-500
                    data.cell.styles.fontStyle = 'bold';
                } else if (data.cell.text[0] === 'INC') {
                    data.cell.styles.textColor = [244, 63, 94]; // rose-500
                    data.cell.styles.fontStyle = 'bold';
                }
            }
        }
    });

    // Question Legend
    yPos = docWithTable.lastAutoTable.finalY + 10;
    doc.setFontSize(10);
    doc.text("Leyenda de Preguntas:", 20, yPos);

    questions.forEach((q, i) => {
        if (yPos > 270) { doc.addPage(); yPos = 20; }
        yPos += 6;
        doc.setFontSize(8);
        doc.setFont("helvetica", "normal");
        doc.text(`P${i + 1}: ${q.question_text}`, 25, yPos);
    });

    // Footer on all pages
    const internalDoc = doc.internal as unknown as { getNumberOfPages: () => number };
    const pageCount = internalDoc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(150);
        doc.text(`Página ${i} de ${pageCount} - Generado por QuizzLive`, pageWidth / 2, 290, { align: 'center' });
    }

    doc.save(`Reporte_${session.quiz.title.replace(/\s+/g, '_')}_${new Date(session.finished_at).toISOString().split('T')[0]}.pdf`);
};
