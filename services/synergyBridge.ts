import { StudySession, SubjectTask, TimerMode } from '../types';
import { getLogicalDateKey } from '../utils/streakEngine';
import { calculateSessionXp } from '../utils/xpSystem';

export interface CompleteSessionInput {
    subjectId: string;
    subjectName: string;
    taskId?: string;
    taskTitle?: string;
    durationSeconds: number;
    startedAt: number;
    endedAt: number;
    mode: TimerMode;
    laps?: number[];
    interruptionCount?: number;
    interruptionSeconds?: number;
    notes?: string;
    cutoffHour?: number;
    currentStreak?: number;
    markTaskCompleted?: boolean;
}

export interface SynergyCompletionResult {
    session: StudySession;
    addedMinutes: number;
    xpEarned: number;
    updatedTask?: SubjectTask;
}

/**
 * Pure domain bridge computing atomic updates across StudySession,
 * SubjectTask, studyHoursLog, and XP rewards when a focus session finishes.
 */
export function buildSynergyCompletion(
    input: CompleteSessionInput,
    existingTask?: SubjectTask
): SynergyCompletionResult {
    const cutoff = input.cutoffHour ?? 5;
    const startIso = new Date(input.startedAt).toISOString();
    const endIso = new Date(input.endedAt).toISOString();
    const logicalDate = getLogicalDateKey(new Date(input.startedAt), cutoff);
    const addedMinutes = Math.max(1, Math.round(input.durationSeconds / 60));

    const session: StudySession = {
        id: `sess_${input.startedAt}_${Math.random().toString(36).slice(2, 7)}`,
        subjectId: input.subjectId,
        subjectName: input.subjectName,
        taskId: input.taskId,
        taskTitle: input.taskTitle,
        durationSeconds: input.durationSeconds,
        startedAt: startIso,
        endedAt: endIso,
        logicalDate,
        mode: input.mode,
        laps: input.laps,
        interruptionCount: input.interruptionCount,
        interruptionSeconds: input.interruptionSeconds,
        notes: input.notes,
    };

    const xpEarned = calculateSessionXp(input.durationSeconds, input.currentStreak ?? 0);

    let updatedTask: SubjectTask | undefined;
    if (existingTask) {
        const shouldComplete = Boolean(input.markTaskCompleted);
        updatedTask = {
            ...existingTask,
            actualDuration: (existingTask.actualDuration || 0) + addedMinutes,
            sessionsCount: (existingTask.sessionsCount || 0) + 1,
            lastStudiedAt: endIso,
            isCompleted: shouldComplete ? true : existingTask.isCompleted,
            status: shouldComplete
                ? 'completed'
                : existingTask.status === 'todo'
                  ? 'in_progress'
                  : existingTask.status || 'in_progress',
        };
    }

    return {
        session,
        addedMinutes,
        xpEarned,
        updatedTask,
    };
}
