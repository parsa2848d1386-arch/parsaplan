/**
 * Pure design-system and UX helper functions (decoupled from React/DOM for deterministic testing).
 */

export type ThemePreference = 'system' | 'light' | 'dark';
export type BioPhase = 'morning' | 'day' | 'evening' | 'night';

const PERSIAN_DIGITS = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];

/**
 * Normalizes Persian (۰-۹) and Arabic-Indic (٠-٩) numerals to Western ASCII digits (0-9).
 */
export function normalizePersianDigitsInput(raw: string): string {
    if (!raw) return '';
    return raw
        .replace(/[۰-۹]/g, (d) => String.fromCharCode(d.charCodeAt(0) - 1728))
        .replace(/[٠-٩]/g, (d) => String.fromCharCode(d.charCodeAt(0) - 1584));
}

/**
 * Formats Western digits inside a string or number to Persian numerals.
 */
export function toPersianNum(value: number | string | null | undefined): string {
    if (value === null || value === undefined) return '';
    return String(value).replace(/\d/g, (d) => PERSIAN_DIGITS[Number(d)]);
}

/**
 * Returns a natural Persian time-of-day greeting for a given hour (0–23).
 */
export function getTimeOfDayGreeting(hour: number): string {
    const h = ((Math.floor(hour) % 24) + 24) % 24;
    if (h >= 5 && h < 12) return 'صبح بخیر';
    if (h >= 12 && h < 16) return 'ظهر بخیر';
    if (h >= 16 && h < 20) return 'عصر بخیر';
    return 'شب بخیر';
}

/**
 * Resolves circadian phase from local hour without applying GPU-breaking body filters.
 */
export function resolveBioPhase(hour: number): { phase: BioPhase; isDarkTarget: boolean } {
    const h = ((Math.floor(hour) % 24) + 24) % 24;
    if (h >= 5 && h < 9) return { phase: 'morning', isDarkTarget: false };
    if (h >= 9 && h < 17) return { phase: 'day', isDarkTarget: false };
    if (h >= 17 && h < 21) return { phase: 'evening', isDarkTarget: true };
    return { phase: 'night', isDarkTarget: true };
}

/**
 * Resolves effective dark mode boolean from user preference and system media query.
 */
export function resolveThemeDarkMode(preference: ThemePreference, systemPrefersDark: boolean): boolean {
    if (preference === 'dark') return true;
    if (preference === 'light') return false;
    return systemPrefersDark;
}

/**
 * Pure list manager for WWDC26 Search Recent Queries (deduplicated, capped, removable).
 */
export function addRecentSearch(list: string[], query: string, maxItems = 6): string[] {
    const trimmed = query.trim();
    if (trimmed.length < 2) return list;
    const deduped = list.filter((item) => item.toLowerCase() !== trimmed.toLowerCase());
    return [trimmed, ...deduped].slice(0, maxItems);
}

export function removeRecentSearch(list: string[], query: string): string[] {
    return list.filter((item) => item !== query);
}

/**
 * Computes concentric inner border radius from outer radius and padding gap.
 * Apple HIG concentric geometry: R_inner = max(0, R_outer - Gap)
 */
export function computeConcentricRadius(outerRadiusPx: number, gapPx: number): number {
    return Math.max(0, Math.round(outerRadiusPx - gapPx));
}
