import { describe, it, expect } from 'vitest';
import {
    getOffsetMinutesFromCutoff,
    formatMinutesAtCutoffOffset,
    computeTimelineLanes,
    findNextFreeSlot,
} from '../../utils/timelineLayout';
import { SubjectTask } from '../../types';

describe('timelineLayout utilities (24h proportional canvas & auto-scheduler)', () => {
    it('maps wall-clock times and cutoff-relative offsets cleanly across midnight', () => {
        expect(getOffsetMinutesFromCutoff('05:00', 5)).toBe(0);
        expect(getOffsetMinutesFromCutoff('09:30', 5)).toBe(270);
        expect(getOffsetMinutesFromCutoff('01:15', 5)).toBe(1215);

        expect(formatMinutesAtCutoffOffset(272, 5, 15)).toBe('09:30');
        expect(formatMinutesAtCutoffOffset(1215, 5, 15)).toBe('01:15');
    });

    it('assigns non-overlapping side-by-side lanes to concurrent timeline tasks', () => {
        const lanes = computeTimelineLanes([
            { id: 'a', startOffset: 240, endOffset: 300, data: 'A' }, // 09:00 - 10:00
            { id: 'b', startOffset: 270, endOffset: 330, data: 'B' }, // 09:30 - 10:30 (overlaps A)
            { id: 'c', startOffset: 360, endOffset: 420, data: 'C' }, // 11:00 - 12:00 (separate)
        ]);

        const a = lanes.find((x) => x.id === 'a')!;
        const b = lanes.find((x) => x.id === 'b')!;
        const c = lanes.find((x) => x.id === 'c')!;

        expect(a.laneCount).toBe(2);
        expect(b.laneCount).toBe(2);
        expect(a.laneIndex).not.toBe(b.laneIndex);
        expect(a.hasConflict).toBe(true);

        expect(c.laneCount).toBe(1);
        expect(c.laneIndex).toBe(0);
        expect(c.hasConflict).toBe(false);
    });

    it('finds the earliest open snapped slot avoiding scheduled tasks', () => {
        const tasks: SubjectTask[] = [
            {
                id: 't1',
                dayId: 1,
                date: '2026-05-10',
                subject: 'کار و پروژه',
                topic: 'اسپرینت صبح',
                details: 'کار عمیق',
                isCompleted: false,
                startTime: '09:00',
                durationMinutes: 90, // occupies 09:00 -> 10:30
            },
            {
                id: 't2',
                dayId: 1,
                date: '2026-05-10',
                subject: 'ورزش و سلامت',
                topic: 'تمرین',
                details: 'تندرستی',
                isCompleted: false,
                startTime: '11:30',
                durationMinutes: 60, // occupies 11:30 -> 12:30
            },
        ];

        // 45-min block fits cleanly in 10:30 -> 11:15 gap
        const fit45 = findNextFreeSlot(tasks, '2026-05-10', 45, 240, 5);
        expect(fit45).toBe('10:30');

        // 90-min block skips 10:30-11:30 gap (only 60m) and schedules at 12:30
        const fit90 = findNextFreeSlot(tasks, '2026-05-10', 90, 240, 5);
        expect(fit90).toBe('12:30');
    });
});
