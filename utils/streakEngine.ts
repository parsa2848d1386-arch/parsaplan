import { HeatmapDayEntry, StreakResult, StudySession, SubjectTask } from '../types';
import { addDays, parseDate, toIsoString } from '../utils';

/**
 * Normalizes a Date or ISO timestamp into the YPT logical study day (YYYY-MM-DD)
 * using the configurable day cutoff hour (default 05:00 AM).
 * Sessions between 00:00 and 04:59 belong to the previous calendar day.
 */
export const getLogicalDateKey = (dateInput: Date | string = new Date(), cutoffHour: number = 5): string => {
    const dt = typeof dateInput === 'string' ? new Date(dateInput) : new Date(dateInput.getTime());
    if (isNaN(dt.getTime())) return toIsoString(new Date());

    if (dt.getHours() < cutoffHour) {
        const prev = new Date(dt.getFullYear(), dt.getMonth(), dt.getDate() - 1);
        return toIsoString(prev);
    }
    return toIsoString(new Date(dt.getFullYear(), dt.getMonth(), dt.getDate()));
};

/**
 * Computes 4-tier heatmap intensity level based on total minutes studied:
 * 0 = none (0m), 1 = 1-29m, 2 = 30-59m, 3 = 60-119m, 4 = 120m+
 */
export const computeHeatmapIntensity = (minutes: number): 0 | 1 | 2 | 3 | 4 => {
    if (minutes <= 0) return 0;
    if (minutes < 30) return 1;
    if (minutes < 60) return 2;
    if (minutes < 120) return 3;
    return 4;
};

/**
 * Builds a daily minutes map by merging recorded StudySessions (preferred)
 * with legacy studyHoursLog entries and completed task estimates as fallback.
 */
export const buildStudyMinutesByDate = (
    sessions: StudySession[],
    studyHoursLog: Record<string, number> = {},
    tasks: SubjectTask[] = [],
    cutoffHour: number = 5
): Record<string, number> => {
    const sessionMinutes: Record<string, number> = {};

    for (const s of sessions) {
        if (!s.durationSeconds || s.durationSeconds <= 0) continue;
        const key = s.logicalDate || getLogicalDateKey(s.startedAt, cutoffHour);
        sessionMinutes[key] = (sessionMinutes[key] || 0) + Math.round(s.durationSeconds / 60);
    }

    const combined: Record<string, number> = { ...sessionMinutes };

    // Incorporate manual/legacy studyHoursLog where sessions aren't already covering it
    for (const [dateKey, hours] of Object.entries(studyHoursLog)) {
        if (hours > 0) {
            const loggedMins = Math.round(hours * 60);
            combined[dateKey] = Math.max(combined[dateKey] || 0, loggedMins);
        }
    }

    // Add task actualDuration if logged directly on tasks without session rows
    for (const t of tasks) {
        if (t.isCompleted && t.actualDuration && t.actualDuration > 0 && t.date) {
            if (!sessionMinutes[t.date]) {
                combined[t.date] = Math.max(combined[t.date] || 0, t.actualDuration);
            }
        }
    }

    return combined;
};

/**
 * Calculates active and longest study streaks using 05:00 AM logical day cutoff
 * and DST-safe calendar arithmetic.
 */
export const calculateStreak = (
    studyDatesOrTimestamps: string[],
    currentNow: Date = new Date(),
    cutoffHour: number = 5
): StreakResult => {
    if (studyDatesOrTimestamps.length === 0) {
        return { currentStreak: 0, longestStreak: 0 };
    }

    const daySet = new Set<string>();
    for (const item of studyDatesOrTimestamps) {
        if (!item) continue;
        // If already YYYY-MM-DD, keep as logical date directly; if ISO timestamp, apply cutoff
        if (/^\d{4}-\d{2}-\d{2}$/.test(item)) {
            daySet.add(item);
        } else {
            daySet.add(getLogicalDateKey(item, cutoffHour));
        }
    }

    if (daySet.size === 0) {
        return { currentStreak: 0, longestStreak: 0 };
    }

    const sortedDays = Array.from(daySet).sort();
    const todayKey = getLogicalDateKey(currentNow, cutoffHour);
    const yesterdayKey = toIsoString(addDays(todayKey, -1));

    let currentStreak = 0;
    let cursorKey: string | null = null;

    if (daySet.has(todayKey)) {
        cursorKey = todayKey;
    } else if (daySet.has(yesterdayKey)) {
        cursorKey = yesterdayKey;
    }

    while (cursorKey && daySet.has(cursorKey)) {
        currentStreak++;
        cursorKey = toIsoString(addDays(cursorKey, -1));
    }

    // Longest historical run
    let longestStreak = 0;
    let currentRun = 0;
    let prevDay: string | null = null;

    for (const day of sortedDays) {
        if (!prevDay) {
            currentRun = 1;
        } else {
            const expectedNext = toIsoString(addDays(prevDay, 1));
            currentRun = day === expectedNext ? currentRun + 1 : 1;
        }
        if (currentRun > longestStreak) longestStreak = currentRun;
        prevDay = day;
    }

    return {
        currentStreak,
        longestStreak,
        lastStudyDate: sortedDays[sortedDays.length - 1],
    };
};

export const generateHeatmapSeries = (
    minutesByDate: Record<string, number>,
    daysCount: number,
    endDate: Date = new Date(),
    cutoffHour: number = 5
): HeatmapDayEntry[] => {
    const endKey = getLogicalDateKey(endDate, cutoffHour);
    const entries: HeatmapDayEntry[] = [];
    for (let i = daysCount - 1; i >= 0; i--) {
        const dKey = toIsoString(addDays(endKey, -i));
        const totalMinutes = minutesByDate[dKey] || 0;
        entries.push({
            date: dKey,
            totalMinutes,
            intensityLevel: computeHeatmapIntensity(totalMinutes),
        });
    }
    return entries;
};

export interface GridSlotProjection {
    slotIndex: number; // 0..143 (05:00 -> 04:50)
    hour: number;
    minute: number;
    label: string;
    subjectName?: string;
    taskTitle?: string;
    color?: string;
    isLive?: boolean;
}

/**
 * Converts a local Date (or HH:mm) to its slot index (0..143) in a 05:00-05:00 study day.
 */
export const getSlotIndexFromTime = (hour: number, minute: number, cutoffHour: number = 5): number => {
    const shiftedHour = (hour - cutoffHour + 24) % 24;
    const slotInHour = Math.floor(minute / 10);
    return Math.max(0, Math.min(143, shiftedHour * 6 + slotInHour));
};

/**
 * Projects actual StudySessions onto 144 10-minute slots for a given logical date (05:00 AM -> 05:00 AM).
 * Properly handles sessions crossing midnight (e.g. 23:40 to 01:30).
 */
export const projectSessionsTo144Slots = (
    sessions: StudySession[],
    logicalDate: string,
    subjectColorMap: Record<string, string>,
    cutoffHour: number = 5
): (GridSlotProjection | null)[] => {
    const grid: (GridSlotProjection | null)[] = new Array(144).fill(null);

    const dayStart = parseDate(logicalDate);
    dayStart.setHours(cutoffHour, 0, 0, 0);
    const dayStartMs = dayStart.getTime();
    const dayEndMs = dayStartMs + 24 * 60 * 60 * 1000;

    for (const s of sessions) {
        const sStartMs = new Date(s.startedAt).getTime();
        const sEndMs = new Date(s.endedAt).getTime();
        if (isNaN(sStartMs) || isNaN(sEndMs)) continue;

        const overlapStart = Math.max(sStartMs, dayStartMs);
        const overlapEnd = Math.min(sEndMs, dayEndMs);
        if (overlapEnd <= overlapStart) continue;

        const startSlot = Math.floor((overlapStart - dayStartMs) / (10 * 60 * 1000));
        const endSlot = Math.min(143, Math.floor((overlapEnd - dayStartMs - 1) / (10 * 60 * 1000)));

        for (let idx = Math.max(0, startSlot); idx <= endSlot; idx++) {
            const h = (cutoffHour + Math.floor(idx / 6)) % 24;
            const m = (idx % 6) * 10;
            grid[idx] = {
                slotIndex: idx,
                hour: h,
                minute: m,
                label: `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`,
                subjectName: s.subjectName,
                taskTitle: s.taskTitle,
                color: subjectColorMap[s.subjectName] || '#6366f1',
            };
        }
    }

    return grid;
};
