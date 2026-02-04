
// Parses "YYYY-MM-DD" into a local Date object set to 00:00:00
export const parseDate = (str: string): Date => {
    if (!str) return new Date();
    const [y, m, d] = str.split('-').map(Number);
    return new Date(y, m - 1, d);
};

// Returns YYYY-MM-DD string from a Date object using local time
export const toIsoString = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

// Calculates exact day difference between two YYYY-MM-DD strings
export const getDiffDays = (startStr: string, endStr: string): number => {
    const d1 = parseDate(startStr);
    const d2 = parseDate(endStr);

    // Normalize to UTC noon to avoid any DST shifts
    const utc1 = Date.UTC(d1.getFullYear(), d1.getMonth(), d1.getDate(), 12, 0, 0);
    const utc2 = Date.UTC(d2.getFullYear(), d2.getMonth(), d2.getDate(), 12, 0, 0);

    const _MS_PER_DAY = 1000 * 60 * 60 * 24;
    return Math.floor((utc2 - utc1) / _MS_PER_DAY);
};

export const getShamsiDate = (dateOrString: Date | string): string => {
    const date = typeof dateOrString === 'string' ? parseDate(dateOrString) : dateOrString;
    return new Intl.DateTimeFormat('fa-IR', { month: 'long', day: 'numeric' }).format(date);
};

export const getFullShamsiDate = (dateOrString: Date | string): string => {
    const date = typeof dateOrString === 'string' ? parseDate(dateOrString) : dateOrString;
    return new Intl.DateTimeFormat('fa-IR', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' }).format(date);
};

export const addDays = (dateOrString: Date | string, days: number): Date => {
    const date = typeof dateOrString === 'string' ? parseDate(dateOrString) : new Date(dateOrString);
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
};

// Helper to convert Persian numbers to English
const normalizeFarsiNums = (str: string): string => {
    return str.replace(/[۰-۹]/g, d => String.fromCharCode(d.charCodeAt(0) - 1728));
};

// Finds the Gregorian Date corresponding to "11 Bahman" closest to the given date (usually 'now')
export const findBahman11 = (now: Date = new Date()): string => {
    const currentYear = now.getFullYear();
    const candidates: Date[] = [];

    // Check Jan/Feb for Current Year, Previous Year, Next Year
    // 11 Bahman is usually Jan 30 or Jan 31
    for (let y = currentYear - 1; y <= currentYear + 1; y++) {
        candidates.push(new Date(y, 0, 30)); // Jan 30
        candidates.push(new Date(y, 0, 31)); // Jan 31
        candidates.push(new Date(y, 1, 1));  // Feb 1 (just in case)
    }

    // Filter which one is actually 11 Bahman in the local calendar
    const matches = candidates.filter(d => {
        const parts = new Intl.DateTimeFormat('fa-IR', { month: 'numeric', day: 'numeric' }).formatToParts(d);
        const m = parts.find(p => p.type === 'month')?.value;
        const day = parts.find(p => p.type === 'day')?.value;
        if (!m || !day) return false;
        return normalizeFarsiNums(m) === '11' && normalizeFarsiNums(day) === '11';
    });

    if (matches.length === 0) return '2025-01-30'; // Fallback

    // Find the one that makes 'now' fall within a reasonable range (e.g. 0 to 12 days into the plan)
    let best = matches[0];
    const idealMatch = matches.find(m => {
        const diff = (now.getTime() - m.getTime()) / (1000 * 3600 * 24);
        return diff >= -1 && diff <= 15;
    });

    if (idealMatch) return toIsoString(idealMatch);

    let minDist = Infinity;
    for (const m of matches) {
        const diff = Math.abs((now.getTime() - m.getTime()));
        if (diff < minDist) {
            minDist = diff;
            best = m;
        }
    }

    return toIsoString(best);
};

export const isHoliday = (dateIso: string): boolean => {
    const d = parseDate(dateIso);
    const dayOfWeek = d.getDay(); // 0=Sun, ... 5=Friday, 6=Saturday

    // Check for Friday
    if (dayOfWeek === 5) return true;

    // Check for 22 Bahman
    const parts = new Intl.DateTimeFormat('fa-IR', { month: 'numeric', day: 'numeric' }).formatToParts(d);
    const m = normalizeFarsiNums(parts.find(p => p.type === 'month')?.value || '');
    const day = normalizeFarsiNums(parts.find(p => p.type === 'day')?.value || '');

    if (m === '11' && day === '22') return true;

    return false;
};

// --- Jalali Converter Logic (Simple Implementation) ---

// Converts a Gregorian date to Jalaali { jy, jm, jd }
export const toJalaali = (gy: number, gm: number, gd: number) => {
    const g_d_m = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];
    let jy = (gy <= 1600) ? 0 : 979;
    gy -= (gy <= 1600) ? 621 : 1600;
    const gy2 = (gm > 2) ? (gy + 1) : gy;
    let days = (365 * gy) + Math.floor((gy2 + 3) / 4) - Math.floor((gy2 + 99) / 100) + Math.floor((gy2 + 399) / 400) - 80 + gd + g_d_m[gm - 1];
    jy += 33 * Math.floor(days / 12053);
    days %= 12053;
    jy += 4 * Math.floor(days / 1461);
    days %= 1461;

    jy += Math.floor((days - 1) / 365);
    if (days > 365) days = (days - 1) % 365;

    let jm = (days < 186) ? 1 + Math.floor(days / 31) : 7 + Math.floor((days - 186) / 30);
    let jd = 1 + ((days < 186) ? (days % 31) : ((days - 186) % 30));
    return { jy, jm, jd };
};

// Converts Jalaali date to Gregorian Date object
export const toGregorian = (jy: number, jm: number, jd: number): Date => {
    let gy = (jy <= 979) ? 621 : 1600;
    jy -= (jy <= 979) ? 0 : 979;
    let days = (365 * jy) + (Math.floor(jy / 33) * 8) + Math.floor((jy % 33 + 3) / 4) + 78 + jd + ((jm < 7) ? (jm - 1) * 31 : ((jm - 7) * 30) + 186);
    gy += 400 * Math.floor(days / 146097);
    days %= 146097;
    if (days > 36524) {
        gy += 100 * Math.floor(--days / 36524);
        days %= 36524;
        if (days >= 365) days++;
    }
    gy += 4 * Math.floor(days / 1461);
    days %= 1461;
    if (days > 365) {
        gy += Math.floor((days - 1) / 365);
        days = (days - 1) % 365;
    }
    let gd = days + 1;
    const sal_a = [0, 31, ((gy % 4 === 0 && gy % 100 !== 0) || (gy % 400 === 0)) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
    let gm = 0;
    for (gm = 0; gm < 13; gm++) {
        const v = sal_a[gm];
        if (gd <= v) break;
        gd -= v;
    }
    return new Date(gy, gm - 1, gd);
};
