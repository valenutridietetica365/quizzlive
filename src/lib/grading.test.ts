import { describe, test, expect } from 'vitest';
import { calculateChileanGrade } from './grading';

describe('calculateChileanGrade', () => {
    test('returns 1.0 if maxScore is 0', () => {
        expect(calculateChileanGrade(10, 0)).toBe(1.0);
    });

    test('returns 1.0 if score is 0', () => {
        expect(calculateChileanGrade(0, 100)).toBe(1.0);
    });

    test('returns 7.0 if score is max', () => {
        expect(calculateChileanGrade(100, 100)).toBe(7.0);
    });

    test('returns 4.0 if score is exactly at exigency (60%)', () => {
        // 60% of 100 is 60
        expect(calculateChileanGrade(60, 100, { exigency: 0.6 })).toBe(4.0);
    });

    test('returns 4.0 if score is exactly at exigency (50%)', () => {
        // 50% of 100 is 50
        expect(calculateChileanGrade(50, 100, { exigency: 0.5 })).toBe(4.0);
    });

    test('calculates correct grade below passing mark', () => {
        // Exigency 60% on 10 pts -> Pass at 6 pts
        // 3 pts is half of pass -> 1.0 + 3.0 * (3/6) = 2.5
        expect(calculateChileanGrade(3, 10, { exigency: 0.6 })).toBe(2.5);
    });

    test('calculates correct grade above passing mark', () => {
        // Exigency 60% on 10 pts -> Pass at 6 pts
        // 8 pts is half way between 6 and 10 -> 4.0 + 3.0 * (2/4) = 5.5
        expect(calculateChileanGrade(8, 10, { exigency: 0.6 })).toBe(5.5);
    });
});
