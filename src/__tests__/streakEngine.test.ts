import { describe, it, expect } from 'vitest';
import {
    getLogicalDateKey,
    computeHeatmapIntensity,
    buildStudyMinutesByDate,
    calculateStreak,
    generateHeatmapSeries,
    getSlotIndexFromTime,
    projectSessionsTo144Slots,
} from '../../utils/streakEngine';
import { StudySession } from '../../types';

describe('streakEngine (05:00 AM YPT logical day cycle)', () => {
    it('assigns 04:59 AM to previous day and 05:00 AM to current day', () => {
        const beforeCutoff = new Date(2026, 4, 10, 4, 59, 0);
        const atCutoff = new Date(2026, 4, 10, 5, 0, 0);

        expect(getLogicalDateKey(beforeCutoff, 5)).toBe('2026-05-09');
        expect(getLogicalDateKey(atCutoff, 5)).toBe('2026-05-10');
    });

    it('calculates active streak with yesterday grace period and historical longest run', () => {
        const now = new Date(2026, 4, 10, 14, 0, 0); // logical today = 2026-05-10
        const dates = [
            '2026-05-01',
            '2026-05-02',
            '2026-05-03',
            '2026-05-04',
            // gap on May 5
            '2026-05-08',
            '2026-05-09', // studied yesterday, not yet today
        ];

        const res = calculateStreak(dates, now, 5);
        expect(res.currentStreak).toBe(2);
        expect(res.longestStreak).toBe(4);
        expect(res.lastStudyDate).toBe('2026-05-09');
    });

    it('breaks currentStreak if last study was 2 days ago', () => {
        const now = new Date(2026, 4, 10, 14, 0, 0);
        const res = calculateStreak(['2026-05-07', '2026-05-08'], now, 5);
        expect(res.currentStreak).toBe(0);
        expect(res.longestStreak).toBe(2);
    });

    it('projects midnight-crossing sessions onto 144 10-minute slots accurately', () => {
        // Logical day 2026-05-10 spans 2026-05-10 05:00 -> 2026-05-11 05:00
        const start = new Date(2026, 4, 10, 23, 40, 0);
        const end = new Date(2026, 4, 11, 1, 20, 0); // +100 mins = 10 slots

        const sessions: StudySession[] = [
            {
                id: 's1',
                subjectId: 'bio',
                subjectName: 'زیست‌شناسی',
                durationSeconds: 6000,
                startedAt: start.toISOString(),
                endedAt: end.toISOString(),
                logicalDate: '2026-05-10',
                mode: 'stopwatch',
            },
        ];

        const grid = projectSessionsTo144Slots(sessions, '2026-05-10', { 'زیست‌شناسی': '#10b981' }, 5);
        const slot2340 = getSlotIndexFromTime(23, 40, 5);
        const slot0110 = getSlotIndexFromTime(1, 10, 5);
        const slot0120 = getSlotIndexFromTime(1, 20, 5);

        expect(grid[slot2340]?.subjectName).toBe('زیست‌شناسی');
        expect(grid[slot2340]?.color).toBe('#10b981');
        expect(grid[slot0110]?.subjectName).toBe('زیست‌شناسی');
        expect(grid[slot0120]).toBeNull();
    });

    it('computes heatmap intensity levels and 364-day series', () => {
        expect(computeHeatmapIntensity(0)).toBe(0);
        expect(computeHeatmapIntensity(15)).toBe(1);
        expect(computeHeatmapIntensity(45)).toBe(2);
        expect(computeHeatmapIntensity(90)).toBe(3);
        expect(computeHeatmapIntensity(150)).toBe(4);

        const mins = buildStudyMinutesByDate(
            [
                {
                    id: 's1',
                    subjectId: 'math',
                    subjectName: 'ریاضیات',
                    durationSeconds: 3600,
                    startedAt: new Date(2026, 4, 10, 10, 0).toISOString(),
                    endedAt: new Date(2026, 4, 10, 11, 0).toISOString(),
                    logicalDate: '2026-05-10',
                    mode: 'pomodoro',
                },
            ],
            { '2026-05-09': 2.5 },
            [],
            5
        );
        expect(mins['2026-05-10']).toBe(60);
        expect(mins['2026-05-09']).toBe(150);

        const series = generateHeatmapSeries(mins, 30, new Date(2026, 4, 10, 14, 0), 5);
        expect(series).toHaveLength(30);
        expect(series[series.length - 1]).toEqual({
            date: '2026-05-10',
            totalMinutes: 60,
            intensityLevel: 3,
        });
    });
});
