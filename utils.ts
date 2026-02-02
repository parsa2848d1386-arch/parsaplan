
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
