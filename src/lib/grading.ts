/**
 * Centralized utility for the Chilean Grading Scale (1.0 - 7.0)
 */

export interface GradingOptions {
    exigency: number; // e.g., 0.6 for 60%, 0.5 for 50%
}

/**
 * Calculates a grade between 1.0 and 7.0 based on score and max score.
 * Formula used in Chilean institutions (Scale 1-7).
 */
export const calculateChileanGrade = (
    score: number,
    maxScore: number,
    options: GradingOptions = { exigency: 0.6 }
): number => {
    const { exigency } = options;
    
    if (!maxScore || maxScore <= 0) return 1.0;
    
    const scoreToPass = maxScore * exigency;
    let grade = 1.0;

    if (score < scoreToPass) {
        // Below exigency (1.0 to 4.0 range)
        grade = 1.0 + 3.0 * (score / scoreToPass);
    } else {
        // Above or equal exigency (4.0 to 7.0 range)
        if (maxScore === scoreToPass) {
            grade = 7.0;
        } else {
            grade = 4.0 + 3.0 * ((score - scoreToPass) / (maxScore - scoreToPass));
        }
    }

    // Round to 1 decimal place and clamp between 1.0 and 7.0
    return Math.min(7.0, Math.max(1.0, Math.round(grade * 10) / 10));
};
