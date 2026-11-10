import React, { useMemo } from 'react';
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
    onSelectSlotTime?: (startTime: string) => void;
    onSelectTask?: (task: SubjectTask) => void;
}

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
    onSelectSlotTime,
    onSelectTask,
}) => {
    const { status, selectedSubject } = useFocus();
    const todayLogical = getLogicalDateKey(new Date(), cutoffHour);
    const isToday = logicalDate === todayLogical;

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
        const dayTasks = tasks.filter((t) => t.date === logicalDate && t.startTime);

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
    }, [tasks, logicalDate, cutoffHour]);

    // Project actual focus sessions onto 144 10-minute slots
    const actualGrid = useMemo(
        () => projectSessionsTo144Slots(sessions, logicalDate, subjectColorMap, cutoffHour),
        [sessions, logicalDate, subjectColorMap, cutoffHour]
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

    const hoursOrder = useMemo(() => Array.from({ length: 24 }, (_, i) => (cutoffHour + i) % 24), [cutoffHour]);

    const getHex = (subjectName: string) => {
        if (subjectColorMap[subjectName]) return subjectColorMap[subjectName];
        const st = getSubjectStyle(subjectName);
        return COLOR_HEX_MAP[st.color] || '#6366f1';
    };

    return (
        <div className="bg-white dark:bg-gray-800 rounded-3xl border border-gray-100 dark:border-gray-700 p-4 md:p-6 shadow-sm space-y-4">
            {/* Summary strip */}
            <div className="grid grid-cols-3 gap-3">
                <div className="bg-indigo-50/70 dark:bg-indigo-950/30 rounded-2xl p-3 border border-indigo-100 dark:border-indigo-900/40">
                    <div className="flex items-center gap-1.5 text-[11px] font-bold text-indigo-600 dark:text-indigo-300">
                        <Clock size={14} /> زمان‌بندی شده
                    </div>
                    <div className="text-lg font-black text-indigo-800 dark:text-white mt-0.5">
                        {formatToPersianDigits(summary.plannedMinutes)} دقیقه
                    </div>
                </div>

                <div className="bg-emerald-50/70 dark:bg-emerald-950/30 rounded-2xl p-3 border border-emerald-100 dark:border-emerald-900/40">
                    <div className="flex items-center gap-1.5 text-[11px] font-bold text-emerald-600 dark:text-emerald-300">
                        <Flame size={14} /> مطالعه واقعی ثبت‌شده
                    </div>
                    <div className="text-lg font-black text-emerald-800 dark:text-white mt-0.5">
                        {formatToPersianDigits(summary.actualMinutes)} دقیقه
                    </div>
                </div>

                <div className="bg-purple-50/70 dark:bg-purple-950/30 rounded-2xl p-3 border border-purple-100 dark:border-purple-900/40">
                    <div className="flex items-center gap-1.5 text-[11px] font-bold text-purple-600 dark:text-purple-300">
                        <Target size={14} /> انطباق با برنامه
                    </div>
                    <div className="text-lg font-black text-purple-800 dark:text-white mt-0.5">
                        {formatToPersianDigits(summary.adherencePercent)}٪
                    </div>
                </div>
            </div>

            {/* Column headers */}
            <div className="grid grid-cols-[56px_1fr_1fr] gap-2 text-[11px] font-black text-gray-500 dark:text-gray-400 px-1">
                <span>ساعت</span>
                <span className="text-center">برنامه پیشنهادی (ستون برنامه)</span>
                <span className="text-center">عملکرد واقعی (ستون تمرکز ۱۰ دقیقه‌ای)</span>
            </div>

            {/* 24h x 6 slots */}
            <div className="space-y-1.5 max-h-[600px] overflow-y-auto custom-scrollbar pl-1">
                {hoursOrder.map((hour, hIdx) => {
                    const hourLabel = `${String(hour).padStart(2, '0')}:00`;
                    return (
                        <div key={hour} className="grid grid-cols-[56px_1fr_1fr] gap-2 items-center">
                            <div className="text-[11px] font-mono font-bold text-gray-500 dark:text-gray-400 text-center bg-gray-50 dark:bg-gray-900 py-1.5 rounded-lg">
                                {hourLabel}
                            </div>

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
                                            title={
                                                task
                                                    ? `${timeStr} | برنامه: ${task.subject} - ${task.topic}`
                                                    : `${timeStr} | کلیک برای زمان‌بندی تسک`
                                            }
                                            className={`h-7 rounded-md border transition-all ${
                                                task
                                                    ? 'border-transparent shadow-sm hover:brightness-110'
                                                    : 'bg-gray-100/70 dark:bg-gray-900/50 border-gray-200/60 dark:border-gray-700/60 hover:border-indigo-400'
                                            }`}
                                            style={
                                                task
                                                    ? { backgroundColor: getHex(task.subject), opacity: task.isCompleted ? 0.95 : 0.72 }
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
                                            className={`h-7 rounded-md border transition-all ${
                                                isLiveSlot
                                                    ? 'animate-pulse ring-2 ring-indigo-500 border-white'
                                                    : slot
                                                      ? 'border-transparent shadow-sm'
                                                      : 'bg-gray-50 dark:bg-gray-900/30 border-gray-200/40 dark:border-gray-800'
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
                    );
                })}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-gray-100 dark:border-gray-700 text-[11px] text-gray-500 dark:text-gray-400">
                <span>هر خانه = ۱۰ دقیقه (۱۴۴ بلوک از ساعت {String(cutoffHour).padStart(2, '0')}:۰۰ تا ۰۵:۰۰ بامداد)</span>
                <span>روی خانه‌های ستون برنامه کلیک کنید تا تسک زمان‌بندی یا ویرایش شود.</span>
            </div>
        </div>
    );
};
