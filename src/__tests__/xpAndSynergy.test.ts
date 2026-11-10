import { describe, it, expect } from 'vitest';
import { calculateLevelInfo, getXpReward, calculateSessionXp } from '../../utils/xpSystem';
import { buildSynergyCompletion } from '../../services/synergyBridge';
import { SubjectTask } from '../../types';

describe('XP System & SynergyBridge atomic completion', () => {
    it('caps task completion streak bonus at 10 days', () => {
        const day0 = getXpReward('COMPLETE_TASK', 0);
        const day10 = getXpReward('COMPLETE_TASK', 10);
        const day30 = getXpReward('COMPLETE_TASK', 30);

        expect(day0).toBe(100);
        expect(day10).toBe(300);
        expect(day30).toBe(300);
    });

    it('scales session XP by minutes focused and streak multiplier', () => {
        expect(calculateSessionXp(30, 0)).toBe(0); // under 1 min
        expect(calculateSessionXp(1500, 0)).toBe(50); // 25m * 2
        expect(calculateSessionXp(1500, 10)).toBe(75); // +50% capped streak boost
    });

    it('computes accurate level progress', () => {
        const info = calculateLevelInfo(400); // level 1 needs 350 -> level 2 with 50 xp
        expect(info.level).toBe(2);
        expect(info.currentLevelXp).toBe(50);
    });

    it('updates SubjectTask duration, session count, and status atomically', () => {
        const baseTask: SubjectTask = {
            id: 't1',
            dayId: 1,
            date: '2026-05-10',
            subject: 'فیزیک',
            topic: 'دینامیک',
            details: 'مطالعه',
            isCompleted: false,
            status: 'todo',
            actualDuration: 20,
            sessionsCount: 1,
        };

        const partial = buildSynergyCompletion(
            {
                subjectId: 'phys',
                subjectName: 'فیزیک',
                taskId: 't1',
                taskTitle: 'دینامیک',
                durationSeconds: 1800, // 30m
                startedAt: new Date(2026, 4, 10, 10, 0).getTime(),
                endedAt: new Date(2026, 4, 10, 10, 30).getTime(),
                mode: 'pomodoro',
                markTaskCompleted: false,
                currentStreak: 2,
            },
            baseTask
        );

        expect(partial.addedMinutes).toBe(30);
        expect(partial.updatedTask?.actualDuration).toBe(50);
        expect(partial.updatedTask?.sessionsCount).toBe(2);
        expect(partial.updatedTask?.status).toBe('in_progress');
        expect(partial.updatedTask?.isCompleted).toBe(false);

        const done = buildSynergyCompletion(
            {
                subjectId: 'phys',
                subjectName: 'فیزیک',
                taskId: 't1',
                durationSeconds: 900,
                startedAt: new Date(2026, 4, 10, 11, 0).getTime(),
                endedAt: new Date(2026, 4, 10, 11, 15).getTime(),
                mode: 'pomodoro',
                markTaskCompleted: true,
            },
            partial.updatedTask
        );
        expect(done.updatedTask?.status).toBe('completed');
        expect(done.updatedTask?.isCompleted).toBe(true);
    });
});
