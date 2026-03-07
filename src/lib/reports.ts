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

    // --- 1. Sheet: Summary ---
    const summaryData = [
        [t('session.title'), session.quiz.title],
        [t('sidebar.classes'), session.quiz.class?.name || 'N/A'],
        [t('dashboard.table_date'), new Date(session.finished_at).toLocaleString()],
        [t('dashboard.table_pin'), session.pin],
        [],
        [t('analytics.participation'), participants.length],
        [t('analytics.avg_success'), `${Math.round((answers.filter(a => a.is_correct).length / Math.max(1, answers.length)) * 100)}%`]
    ];
    const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);

    // --- 2. Sheet: Grades ---
    // Calculate student scores
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
            accuracy: `${accuracy}%`,
            rawAccuracy: accuracy
        };
    }).sort((a, b) => b.score - a.score);

    const gradesHeaders = [
        t('session.table_rank'),
        t('session.table_student'),
        t('session.table_score'),
        t('session.table_correct'),
        t('session.table_accuracy')
    ];
    const gradesRows = studentGrades.map((g, idx) => [
        idx + 1,
        g.name,
        g.score,
        `${g.correct}/${g.total}`,
        g.accuracy
    ]);
    const gradesSheet = XLSX.utils.aoa_to_sheet([gradesHeaders, ...gradesRows]);

    // --- 3. Sheet: Response Matrix (Heatmap) ---
    const matrixHeader = [t('session.table_student'), ...questions.map((_, i) => `Q${i + 1}`)];
    const matrixRows = participants.sort((a, b) => a.nickname.localeCompare(b.nickname)).map(p => {
        const row = [p.nickname];
        questions.forEach(q => {
            const answer = answers.find(a => a.participant_id === p.id && a.question_id === q.id);
            if (!answer) row.push('-');
            else row.push(answer.is_correct ? 'CORRECT' : 'INCORRECT');
        });
        return row;
    });
    // Add Question Legend
    matrixRows.push([]);
    matrixRows.push(['LEGEND']);
    questions.forEach((q, i) => {
        matrixRows.push([`Q${i + 1}`, q.question_text]);
    });
    const matrixSheet = XLSX.utils.aoa_to_sheet([matrixHeader, ...matrixRows]);

    // --- Create Workbook and Download ---
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, summarySheet, t('session.report_summary'));
    XLSX.utils.book_append_sheet(wb, gradesSheet, t('session.report_grades'));
    XLSX.utils.book_append_sheet(wb, matrixSheet, t('session.report_matrix'));

    // Trigger Download
    const fileName = `Reporte_${session.quiz.title.replace(/\s+/g, '_')}_${new Date(session.finished_at).toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(wb, fileName);
};
