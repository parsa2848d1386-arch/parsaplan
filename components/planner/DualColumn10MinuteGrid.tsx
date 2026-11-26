import React, { useMemo, useState } from 'react';
import { SubjectTask, StudySession, CustomSubject, getSubjectStyle } from '../../types';
import { projectSessionsTo144Slots, getSlotIndexFromTime, getLogicalDateKey } from '../../utils/streakEngine';
import { timeToMinutes, formatToPersianDigits } from '../../utils';
import { useFocus } from '../../context/FocusContext';
import { Clock, Target, Flame } from 'lucide-react';

interface DualColumn10MinuteGridProps {
    logicalDate: string;
    tasks: SubjectTask[];
    sessions: StudySession[];
    subjects: CustomSubject[];
    cutoffHour?: number;
    selectedCategory?: string | null;
    onSelectSlotTime?: (startTime: string) => void;
    onSelectTask?: (task: SubjectTask) => void;
}

type DayPeriod = 'all' | 'morning' | 'afternoon' | 'night';

const PERIOD_OPTIONS: { id: DayPeriod; label: string; range: [number, number] }[] = [
    { id: 'all', label: 'همه ۲۴ ساعت', range: [0, 24] },
    { id: 'morning', label: 'صبح', range: [0, 8] },
    { id: 'afternoon', label: 'بعدازظهر', range: [8, 16] },
    { id: 'night', label: 'شب', range: [16, 24] },
];

const COLOR_HEX_MAP: Record<string, string> = {
    blue: '#3b82f6',
    emerald: '#10b981',
    green: '#22c55e',
    rose: '#f43f5e',
    red: '#ef4444',
    amber: '#f59e0b',
    orange: '#f97316',
    purple: '#a855f7',
    violet: '#8b5cf6',
    indigo: '#6366f1',
    cyan: '#06b6d4',
    teal: '#14b8a6',
    pink: '#ec4899',
    sky: '#0ea5e9',
    gray: '#64748b',
};

export const DualColumn10MinuteGrid: React.FC<DualColumn10MinuteGridProps> = ({
    logicalDate,
    tasks,
    sessions,
    subjects,
    cutoffHour = 5,
    selectedCategory = null,
    onSelectSlotTime,
    onSelectTask,
}) => {
    const { status, selectedSubject } = useFocus();
    const [period, setPeriod] = useState<DayPeriod>('all');
    const todayLogical = getLogicalDateKey(new Date(), cutoffHour);
    const isToday = logicalDate === todayLogical;

    const matchCategory = (task: SubjectTask): boolean => {
        if (!selectedCategory) return true;
        const normalized = `${task.subject} ${task.topic} ${task.details || ''}`.toLowerCase();
        if (selectedCategory === 'deep') {
            return task.studyType === 'study' || task.studyType === 'task' || task.priority === 'high' || !!task.isMIT;
        }
        if (selectedCategory === 'test') {
            return (
                task.studyType === 'exam' ||
                task.studyType === 'test_educational' ||
                task.studyType === 'test_speed' ||
                !!task.testRange ||
                normalized.includes('تست')
            );
        }
        if (selectedCategory === 'fitness') {
            return normalized.includes('ورزش') || normalized.includes('بدن') || normalized.includes('سلامت') || normalized.includes('fitness');
        }
        if (selectedCategory === 'rest') {
            return task.studyType === 'review' || normalized.includes('استراحت') || normalized.includes('خواب') || normalized.includes('تفریح');
        }
        return true;
    };

    const subjectColorMap = useMemo(() => {
        const map: Record<string, string> = {};
        subjects.forEach((s) => {
            map[s.name] = COLOR_HEX_MAP[s.color] || '#6366f1';
        });
        return map;
    }, [subjects]);

    // Project planned tasks onto 144 10-minute slots
    const plannedGrid = useMemo(() => {
        const grid: (SubjectTask | null)[] = new Array(144).fill(null);
        const dayTasks = tasks.filter((t) => t.date === logicalDate && t.startTime && matchCategory(t));

        dayTasks.forEach((task) => {
            const startMins = timeToMinutes(task.startTime || '08:00');
            const h = Math.floor(startMins / 60);
            const m = startMins % 60;
            const startSlot = getSlotIndexFromTime(h, m, cutoffHour);
            const slotsNeeded = Math.max(1, Math.ceil((task.durationMinutes ?? 60) / 10));
            for (let i = 0; i < slotsNeeded && startSlot + i < 144; i++) {
                grid[startSlot + i] = task;
            }
        });
        return grid;
    }, [tasks, logicalDate, cutoffHour, selectedCategory]);

    const matchSessionCategory = (session: StudySession): boolean => {
        if (!selectedCategory) return true;
        const linkedTask = session.taskId ? tasks.find((t) => t.id === session.taskId) : undefined;
        if (linkedTask) return matchCategory(linkedTask);
        const normalized = `${session.subjectName} ${session.taskTitle || ''}`.toLowerCase();
        if (selectedCategory === 'deep') {
            return (
                !normalized.includes('ورزش') &&
                !normalized.includes('استراحت') &&
                !normalized.includes('خواب')
            );
        }
        if (selectedCategory === 'test') {
            return normalized.includes('تست') || normalized.includes('آزمون');
        }
        if (selectedCategory === 'fitness') {
            return normalized.includes('ورزش') || normalized.includes('بدن') || normalized.includes('سلامت') || normalized.includes('fitness');
        }
        if (selectedCategory === 'rest') {
            return normalized.includes('استراحت') || normalized.includes('خواب') || normalized.includes('تفریح') || normalized.includes('مرور');
        }
        return true;
    };

    const filteredSessions = useMemo(
        () => sessions.filter(matchSessionCategory),
        [sessions, tasks, selectedCategory]
    );

    // Project actual focus sessions onto 144 10-minute slots
    const actualGrid = useMemo(
        () => projectSessionsTo144Slots(filteredSessions, logicalDate, subjectColorMap, cutoffHour),
        [filteredSessions, logicalDate, subjectColorMap, cutoffHour]
    );

    const nowSlot = useMemo(() => {
        if (!isToday) return -1;
        const now = new Date();
        return getSlotIndexFromTime(now.getHours(), now.getMinutes(), cutoffHour);
    }, [isToday, cutoffHour]);

    const summary = useMemo(() => {
        const plannedSlots = plannedGrid.filter(Boolean).length;
        const actualSlots = actualGrid.filter(Boolean).length;
        let overlapSlots = 0;
        for (let i = 0; i < 144; i++) {
            if (plannedGrid[i] && actualGrid[i]) overlapSlots++;
        }
        return {
            plannedMinutes: plannedSlots * 10,
            actualMinutes: actualSlots * 10,
            adherencePercent: plannedSlots > 0 ? Math.round((overlapSlots / plannedSlots) * 100) : 0,
        };
    }, [plannedGrid, actualGrid]);

    const hoursOrder = useMemo(() => Array.from({ length: 24 }, (_, i) => ({ hour: (cutoffHour + i) % 24, hIdx: i })), [cutoffHour]);

    const visibleHours = useMemo(() => {
        const selected = PERIOD_OPTIONS.find((p) => p.id === period) || PERIOD_OPTIONS[0];
        return hoursOrder.slice(selected.range[0], selected.range[1]);
    }, [hoursOrder, period]);

    const getHex = (subjectName: string) => {
        if (subjectColorMap[subjectName]) return subjectColorMap[subjectName];
        const st = getSubjectStyle(subjectName);
        return COLOR_HEX_MAP[st.color] || '#6366f1';
    };

    return (
        <div className="bg-[var(--surface-elevated)] rounded-3xl border border-[var(--border-subtle)] p-4 md:p-6 shadow-xs space-y-4">
            {/* Summary strip */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="bg-primary-fixed/40 rounded-2xl p-3 border border-primary/20">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-primary">
                        <Clock size={14} aria-hidden="true" /> زمان‌بندی شده
                    </div>
                    <div className="text-lg font-extrabold text-on-surface mt-0.5 tabular-nums">
                        {formatToPersianDigits(summary.plannedMinutes)} دقیقه
                    </div>
                </div>

                <div className="bg-secondary-container/40 rounded-2xl p-3 border border-secondary/20">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-secondary">
                        <Flame size={14} aria-hidden="true" /> مطالعه واقعی ثبت‌شده
                    </div>
                    <div className="text-lg font-extrabold text-on-surface mt-0.5 tabular-nums">
                        {formatToPersianDigits(summary.actualMinutes)} دقیقه
                    </div>
                </div>

                <div className="bg-tertiary-fixed/30 rounded-2xl p-3 border border-tertiary/20">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-tertiary">
                        <Target size={14} aria-hidden="true" /> انطباق با برنامه
                    </div>
                    <div className="text-lg font-extrabold text-on-surface mt-0.5 tabular-nums">
                        {formatToPersianDigits(summary.adherencePercent)}٪
                    </div>
                </div>
            </div>

            {/* Day Period Segmented Filter (Zero Horizontal Scroll on Mobile) */}
            <div className="flex items-center justify-between flex-wrap gap-2">
                <div
                    role="tablist"
                    aria-label="فیلتر بازه شبانه‌روز"
                    className="flex items-center gap-1 bg-surface-container-low p-1 rounded-xl border border-[var(--border-subtle)] w-full sm:w-auto"
                >
                    {PERIOD_OPTIONS.map((opt) => (
                        <button
                            key={opt.id}
                            type="button"
                            role="tab"
                            aria-selected={period === opt.id}
                            onClick={() => setPeriod(opt.id)}
                            className={`flex-1 sm:flex-none min-h-[38px] px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer whitespace-nowrap ${
                                period === opt.id
                                    ? 'bg-[var(--surface-elevated)] text-primary shadow-xs'
                                    : 'text-[var(--text-secondary)] hover:text-on-surface'
                            }`}
                        >
                            {opt.label}
                        </button>
                    ))}
                </div>
                <div className="flex items-center gap-3 text-xs text-[var(--text-secondary)] sm:hidden">
                    <span className="inline-flex items-center gap-1">
                        <span className="w-2.5 h-2.5 rounded-sm bg-primary/70 inline-block" aria-hidden="true" />
                        ردیف بالا: برنامه
                    </span>
                    <span className="inline-flex items-center gap-1">
                        <span className="w-2.5 h-2.5 rounded-sm bg-secondary inline-block" aria-hidden="true" />
                        ردیف پایین: واقعی
                    </span>
                </div>
            </div>

            {/* Responsive Grid: Stacked zero-overflow rows on mobile (<640px), classic dual-column on sm+ */}
            <div className="space-y-2">
                {/* Column headers (Desktop/Tablet) */}
                <div className="hidden sm:grid grid-cols-[56px_1fr_1fr] gap-2 text-xs font-bold text-[var(--text-secondary)] px-1">
                    <span className="text-center">ساعت</span>
                    <span className="text-center">برنامه پیشنهادی (ستون برنامه)</span>
                    <span className="text-center">عملکرد واقعی (ستون تمرکز ۱۰ دقیقه‌ای)</span>
                </div>

                {/* 24h x 6 slots */}
                <div className="space-y-2 sm:space-y-1.5 max-h-[600px] overflow-y-auto custom-scrollbar pe-1">
                    {visibleHours.map(({ hour, hIdx }) => {
                        const hourLabel = `${String(hour).padStart(2, '0')}:00`;
                        return (
                            <div
                                key={hour}
                                className="grid grid-cols-[52px_1fr] sm:grid-cols-[56px_1fr_1fr] gap-2 items-center p-1.5 sm:p-0 rounded-xl sm:rounded-none bg-surface-container-low/50 sm:bg-transparent"
                            >
                                <div
                                    className="text-xs font-bold text-[var(--text-secondary)] text-center bg-surface-container-low py-2 sm:py-1.5 rounded-lg tabular-nums"
                                    dir="ltr"
                                >
                                    {formatToPersianDigits(hourLabel)}
                                </div>

                                {/* Mobile wrapper stacks planned + actual; on sm+ contents flattens into the 2 grid tracks */}
                                <div className="flex flex-col gap-1.5 sm:contents">
                                    {/* Planned 6 slots */}
                                    <div className="grid grid-cols-6 gap-1">
                                        {[0, 1, 2, 3, 4, 5].map((sIdx) => {
                                            const idx = hIdx * 6 + sIdx;
                                            const task = plannedGrid[idx];
                                            const timeStr = `${String(hour).padStart(2, '0')}:${String(sIdx * 10).padStart(2, '0')}`;
                                            return (
                                                <button
                                                    key={idx}
                                                    type="button"
                                                    onClick={() => {
                                                        if (task && onSelectTask) onSelectTask(task);
                                                        else if (onSelectSlotTime) onSelectSlotTime(timeStr);
                                                    }}
                                                    aria-label={
                                                        task
                                                            ? `ساعت ${timeStr} برنامه ${task.subject} ${task.topic}`
                                                            : `زمان‌بندی تسک در ساعت ${timeStr}`
                                                    }
                                                    title={
                                                        task
                                                            ? `${timeStr} | برنامه: ${task.subject} - ${task.topic}`
                                                            : `${timeStr} | کلیک برای زمان‌بندی تسک`
                                                    }
                                                    className={`h-8 sm:h-7 rounded-md border transition-all cursor-pointer ${
                                                        task
                                                            ? 'border-transparent shadow-xs hover:brightness-110'
                                                            : 'bg-[var(--surface-elevated)] border-[var(--border-subtle)] hover:border-primary'
                                                    }`}
                                                    style={
                                                        task
                                                            ? { backgroundColor: getHex(task.subject), opacity: task.isCompleted ? 0.95 : 0.78 }
                                                            : undefined
                                                    }
                                                />
                                            );
                                        })}
                                    </div>

                                    {/* Actual 6 slots */}
                                    <div className="grid grid-cols-6 gap-1">
                                        {[0, 1, 2, 3, 4, 5].map((sIdx) => {
                                            const idx = hIdx * 6 + sIdx;
                                            const slot = actualGrid[idx];
                                            const isLiveSlot = idx === nowSlot && status === 'running';
                                            const timeStr = `${String(hour).padStart(2, '0')}:${String(sIdx * 10).padStart(2, '0')}`;
                                            return (
                                                <div
                                                    key={idx}
                                                    title={
                                                        isLiveSlot
                                                            ? `${timeStr} | در حال تمرکز روی ${selectedSubject}`
                                                            : slot
                                                              ? `${timeStr} | مطالعه واقعی: ${slot.subjectName}${slot.taskTitle ? ` (${slot.taskTitle})` : ''}`
                                                              : `${timeStr} | بدون جلسه ثبت‌شده`
                                                    }
                                                    className={`h-5 sm:h-7 rounded-md border transition-all ${
                                                        isLiveSlot
                                                            ? 'ring-2 ring-primary border-white'
                                                            : slot
                                                              ? 'border-transparent shadow-xs'
                                                              : 'bg-surface-container-low/70 border-[var(--border-subtle)]'
                                                    }`}
                                                    style={
                                                        isLiveSlot
                                                            ? { backgroundColor: getHex(selectedSubject) }
                                                            : slot
                                                              ? { backgroundColor: slot.color || '#10b981' }
                                                              : undefined
                                                    }
                                                />
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-[var(--border-subtle)] text-xs text-[var(--text-secondary)]">
                <span>
                    هر خانه = ۱۰ دقیقه (۱۴۴ بلوک از ساعت {formatToPersianDigits(String(cutoffHour).padStart(2, '0'))}:۰۰)
                </span>
                <span>روی خانه‌های برنامه بزنید تا تسک زمان‌بندی یا ویرایش شود.</span>
            </div>
        </div>
    );
};
