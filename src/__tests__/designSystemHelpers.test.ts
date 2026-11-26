import { describe, it, expect } from 'vitest';
import {
    normalizePersianDigitsInput,
    toPersianNum,
    getTimeOfDayGreeting,
    resolveBioPhase,
    resolveThemeDarkMode,
    addRecentSearch,
    removeRecentSearch,
    computeConcentricRadius,
} from '../../utils/designSystemHelpers';

describe('designSystemHelpers (Phase 0 & 1 pure logic)', () => {
    it('normalizes Persian and Arabic-Indic numerals to ASCII digits', () => {
        expect(normalizePersianDigitsInput('۰۹۱۲۳۴۵۶۷۸۹')).toBe('09123456789');
        expect(normalizePersianDigitsInput('٠١٢٣٤٥٦٧٨٩')).toBe('0123456789');
        expect(normalizePersianDigitsInput('۱۴۰۵/۰۸/۲۹ ساعت ۱۴:۳۰')).toBe('1405/08/29 ساعت 14:30');
        expect(normalizePersianDigitsInput('')).toBe('');
    });

    it('formats numbers and strings into Persian digits', () => {
        expect(toPersianNum(2026)).toBe('۲۰۲۶');
        expect(toPersianNum('14:05')).toBe('۱۴:۰۵');
        expect(toPersianNum(null)).toBe('');
        expect(toPersianNum(undefined)).toBe('');
    });

    it('returns natural Persian greetings across all 24 hours including wrap-around', () => {
        expect(getTimeOfDayGreeting(5)).toBe('صبح بخیر');
        expect(getTimeOfDayGreeting(11)).toBe('صبح بخیر');
        expect(getTimeOfDayGreeting(12)).toBe('ظهر بخیر');
        expect(getTimeOfDayGreeting(15)).toBe('ظهر بخیر');
        expect(getTimeOfDayGreeting(16)).toBe('عصر بخیر');
        expect(getTimeOfDayGreeting(19)).toBe('عصر بخیر');
        expect(getTimeOfDayGreeting(20)).toBe('شب بخیر');
        expect(getTimeOfDayGreeting(2)).toBe('شب بخیر');
        expect(getTimeOfDayGreeting(-2)).toBe('شب بخیر');
        expect(getTimeOfDayGreeting(29)).toBe('صبح بخیر');
    });

    it('resolves circadian bio phases cleanly without body filters', () => {
        expect(resolveBioPhase(6)).toEqual({ phase: 'morning', isDarkTarget: false });
        expect(resolveBioPhase(13)).toEqual({ phase: 'day', isDarkTarget: false });
        expect(resolveBioPhase(18)).toEqual({ phase: 'evening', isDarkTarget: true });
        expect(resolveBioPhase(23)).toEqual({ phase: 'night', isDarkTarget: true });
        expect(resolveBioPhase(3)).toEqual({ phase: 'night', isDarkTarget: true });
    });

    it('resolves effective dark mode from ThemePreference and OS preference', () => {
        expect(resolveThemeDarkMode('dark', false)).toBe(true);
        expect(resolveThemeDarkMode('light', true)).toBe(false);
        expect(resolveThemeDarkMode('system', true)).toBe(true);
        expect(resolveThemeDarkMode('system', false)).toBe(false);
    });

    it('manages WWDC26 recent searches with deduplication, trimming, cap, and removal', () => {
        let list: string[] = [];
        list = addRecentSearch(list, ' ');
        expect(list).toEqual([]);
        list = addRecentSearch(list, 'ر');
        expect(list).toEqual([]);

        list = addRecentSearch(list, 'ریاضی');
        list = addRecentSearch(list, 'فیزیک');
        list = addRecentSearch(list, '  ریاضی  ');
        expect(list).toEqual(['ریاضی', 'فیزیک']);

        list = addRecentSearch(['a1', 'a2', 'a3', 'a4', 'a5', 'a6'], 'a7', 6);
        expect(list).toHaveLength(6);
        expect(list[0]).toBe('a7');

        expect(removeRecentSearch(list, 'a3')).not.toContain('a3');
    });

    it('computes Apple concentric inner border radius with non-negative floor', () => {
        expect(computeConcentricRadius(24, 8)).toBe(16);
        expect(computeConcentricRadius(16, 12)).toBe(4);
        expect(computeConcentricRadius(8, 12)).toBe(0);
    });
});
