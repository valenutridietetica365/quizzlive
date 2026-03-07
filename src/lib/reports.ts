import * as XLSX from 'xlsx';

export interface ReportAnswer {
    is_correct: boolean;
    points_awarded: number;
    question_id: string;
    participant_id: string;
}

export interface ReportQuestion {
    id: string;
    question_text: string;
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
}

export const generateExcelReport = (data: ReportData, t: (key: string) => string) => {
    const { session, answers, questions, participants } = data;

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
    const studentGrades = participants.map(p => {
        const studentAnswers = answers.filter(a => a.participant_id === p.id);
        const correct = studentAnswers.filter(a => a.is_correct).length;
        const total = studentAnswers.length;
        const score = studentAnswers.reduce((sum, a) => sum + a.points_awarded, 0);
        const accuracy = total > 0 ? Math.round((correct / total) * 100) : 0;

        return {
            name: p.nickname,
            score,
            correct,
            total,
            accuracy: `${accuracy}%`
        };
    }).sort((a, b) => b.score - a.score);

    const gradesRows: (string | number | boolean | null | undefined)[][] = [
        BRANDING,
        ["", "TABLA DE NOTAS Y RENDIMIENTO"],
        ["", "Fecha:", DATE_STR],
        [],
        ["", t('session.table_rank'), t('session.table_student'), t('session.table_score'), t('session.table_correct'), t('session.table_accuracy')]
    ];

    studentGrades.forEach((g, idx) => {
        gradesRows.push(["", idx + 1, g.name, g.score, `${g.correct}/${g.total}`, g.accuracy]);
    });

    const gradesSheet = createSheet(gradesRows, [
        { wch: 2 }, // A
        { wch: 8 }, // Rank
        { wch: 30 }, // Student
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

