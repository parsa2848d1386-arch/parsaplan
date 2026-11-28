import React, { useMemo, useState, useRef, useEffect } from 'react';
import { SubjectTask, StudySession, getSubjectStyle } from '../../types';
import { useStore } from '../../context/StoreContext';
import { useFocus } from '../../context/FocusContext';
import { useUI } from '../../context/UIContext';
import { getLogicalDateKey } from '../../utils/streakEngine';
import {
    getOffsetMinutesFromCutoff,
    formatMinutesAtCutoffOffset,
    computeTimelineLanes,
    findNextFreeSlot,
} from '../../utils/timelineLayout';
import { formatToPersianDigits } from '../../utils';
import {
    Play,
    CheckCircle2,
    Circle,
    Clock,
    GripVertical,
    Sparkles,
    AlertTriangle,
    ZoomIn,
    Eye,
    Crosshair,
    X,
    MoreHorizontal,
    Pencil,
    Plus,
    Minus,
    CalendarOff,
} from 'lucide-react';
import { createPortal } from 'react-dom';
import { useOverlayHistory } from '../../hooks/useOverlayHistory';
import { useFocusTrap } from '../../hooks/useFocusTrap';

interface UnifiedTimelineProps {
    logicalDate: string;
    tasks: SubjectTask[];
    sessions: StudySession[];
    cutoffHour?: number;
    selectedCategory?: string | null;
    onAddAtHour: (startTime: string) => void;
    onEditTask: (task: SubjectTask) => void;
}

type ZoomLevel = 'compact' | 'normal' | 'expanded';
const ZOOM_PX_PER_HOUR: Record<ZoomLevel, number> = {
    compact: 52,
    normal: 76,
    expanded: 108,
};

const SUBJECT_COLOR_CLASSES: Record<string, { bg: string; border: string; text: string; dot: string }> = {
    indigo: {
        bg: 'bg-indigo-50/95 dark:bg-indigo-950/70',
        border: 'border-indigo-300 dark:border-indigo-800/80',
        text: 'text-indigo-900 dark:text-indigo-100',
        dot: 'bg-indigo-500',
    },
    emerald: {
        bg: 'bg-emerald-50/95 dark:bg-emerald-950/70',
        border: 'border-emerald-300 dark:border-emerald-800/80',
        text: 'text-emerald-900 dark:text-emerald-100',
        dot: 'bg-emerald-500',
    },
    green: {
        bg: 'bg-emerald-50/95 dark:bg-emerald-950/70',
        border: 'border-emerald-300 dark:border-emerald-800/80',
        text: 'text-emerald-900 dark:text-emerald-100',
        dot: 'bg-emerald-500',
    },
    amber: {
        bg: 'bg-amber-50/95 dark:bg-amber-950/70',
        border: 'border-amber-300 dark:border-amber-800/80',
        text: 'text-amber-900 dark:text-amber-100',
        dot: 'bg-amber-500',
    },
    rose: {
        bg: 'bg-rose-50/95 dark:bg-rose-950/70',
        border: 'border-rose-300 dark:border-rose-800/80',
        text: 'text-rose-900 dark:text-rose-100',
        dot: 'bg-rose-500',
    },
    red: {
        bg: 'bg-rose-50/95 dark:bg-rose-950/70',
        border: 'border-rose-300 dark:border-rose-800/80',
        text: 'text-rose-900 dark:text-rose-100',
        dot: 'bg-rose-500',
    },
    sky: {
        bg: 'bg-sky-50/95 dark:bg-sky-950/70',
        border: 'border-sky-300 dark:border-sky-800/80',
        text: 'text-sky-900 dark:text-sky-100',
        dot: 'bg-sky-500',
    },
    purple: {
        bg: 'bg-purple-50/95 dark:bg-purple-950/70',
        border: 'border-purple-300 dark:border-purple-800/80',
        text: 'text-purple-900 dark:text-purple-100',
        dot: 'bg-purple-500',
    },
    violet: {
        bg: 'bg-purple-50/95 dark:bg-purple-950/70',
        border: 'border-purple-300 dark:border-purple-800/80',
        text: 'text-purple-900 dark:text-purple-100',
        dot: 'bg-purple-500',
    },
    teal: {
        bg: 'bg-teal-50/95 dark:bg-teal-950/70',
        border: 'border-teal-300 dark:border-teal-800/80',
        text: 'text-teal-900 dark:text-teal-100',
        dot: 'bg-teal-500',
    },
    blue: {
        bg: 'bg-blue-50/95 dark:bg-blue-950/70',
        border: 'border-blue-300 dark:border-blue-800/80',
        text: 'text-blue-900 dark:text-blue-100',
        dot: 'bg-blue-500',
    },
    orange: {
        bg: 'bg-orange-50/95 dark:bg-orange-950/70',
        border: 'border-orange-300 dark:border-orange-800/80',
        text: 'text-orange-900 dark:text-orange-100',
        dot: 'bg-orange-500',
    },
    slate: {
        bg: 'bg-slate-50/95 dark:bg-slate-900/80',
        border: 'border-slate-300 dark:border-slate-700',
        text: 'text-slate-900 dark:text-slate-100',
        dot: 'bg-slate-500',
    },
    gray: {
        bg: 'bg-gray-50/95 dark:bg-gray-900/80',
        border: 'border-gray-300 dark:border-gray-700',
        text: 'text-gray-900 dark:text-gray-100',
        dot: 'bg-gray-500',
    },
};

const getStaticSubjectClasses = (colorName?: string) => {
    if (!colorName) return SUBJECT_COLOR_CLASSES.indigo;
    return SUBJECT_COLOR_CLASSES[colorName] || SUBJECT_COLOR_CLASSES.indigo;
};

export const UnifiedTimeline: React.FC<UnifiedTimelineProps> = ({
    logicalDate,
    tasks,
    sessions,
    cutoffHour = 5,
    selectedCategory = null,
    onAddAtHour,
    onEditTask,
}) => {
    const { toggleTask, updateTask, settings } = useStore();
    const { startFocusForTask } = useFocus();
    const { showToast } = useUI();

    const [zoom, setZoom] = useState<ZoomLevel>('normal');
    const [showActualTrack, setShowActualTrack] = useState<boolean>(true);
    const [dragHoverTime, setDragHoverTime] = useState<string | null>(null);
    const [dragHoverTopPx, setDragHoverTopPx] = useState<number>(0);
    const [resizingState, setResizingState] = useState<{ taskId: string; previewDuration: number } | null>(null);
    const [nowTick, setNowTick] = useState<Date>(() => new Date());
    const [actionSheetTaskId, setActionSheetTaskId] = useState<string | null>(null);

    const actionSheetTask = useMemo(
        () => (actionSheetTaskId ? tasks.find((t) => t.id === actionSheetTaskId) || null : null),
        [actionSheetTaskId, tasks]
    );

    const actionSheetRef = useRef<HTMLDivElement>(null);

    useOverlayHistory(Boolean(actionSheetTask), () => setActionSheetTaskId(null), 'timeline-block-sheet');
    useFocusTrap(actionSheetRef, {
        isActive: Boolean(actionSheetTask),
        onEscape: () => setActionSheetTaskId(null),
    });

    const shiftTaskStartTime = (task: SubjectTask, deltaMins: number) => {
        const currentOffset = getOffsetMinutesFromCutoff(task.startTime || '09:00', cutoffHour);
        const nextOffset = Math.max(0, Math.min(1425, currentOffset + deltaMins));
        const nextTime = formatMinutesAtCutoffOffset(nextOffset, cutoffHour, 15);
        updateTask({ ...task, startTime: nextTime });
    };

    const canvasRef = useRef<HTMLDivElement | null>(null);
    const nowLineRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        const timer = setInterval(() => setNowTick(new Date()), 30000);
        return () => clearInterval(timer);
    }, []);

    const hourHeight = ZOOM_PX_PER_HOUR[zoom];
    const pxPerMin = hourHeight / 60;
    const totalCanvasHeight = 24 * hourHeight;

    const isToday = logicalDate === getLogicalDateKey(nowTick, cutoffHour);
    const nowTimeStr = `${String(nowTick.getHours()).padStart(2, '0')}:${String(nowTick.getMinutes()).padStart(2, '0')}`;
    const nowOffsetMins = getOffsetMinutesFromCutoff(nowTimeStr, cutoffHour);
    const nowTopPx = nowOffsetMins * pxPerMin;

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

    const { scheduledTasks, unscheduledTasks } = useMemo(() => {
        const dayTasks = tasks.filter((t) => t.date === logicalDate && matchCategory(t));
        const scheduled: SubjectTask[] = [];
        const free: SubjectTask[] = [];
        dayTasks.forEach((t) => {
            if (t.startTime) scheduled.push(t);
            else free.push(t);
        });
        return { scheduledTasks: scheduled, unscheduledTasks: free };
    }, [tasks, logicalDate, selectedCategory]);

    const positionedTasks = useMemo(() => {
        const spans = scheduledTasks.map((t) => {
            const startOffset = getOffsetMinutesFromCutoff(t.startTime || '08:00', cutoffHour);
            const effectiveDuration =
                resizingState?.taskId === t.id ? resizingState.previewDuration : Math.max(15, t.durationMinutes ?? 60);
            return {
                id: t.id,
                startOffset,
                endOffset: Math.min(1440, startOffset + effectiveDuration),
                data: t,
            };
        });
        return computeTimelineLanes(spans);
    }, [scheduledTasks, cutoffHour, resizingState]);

    const matchSessionCategory = (session: StudySession): boolean => {
        if (!selectedCategory) return true;
        const linkedTask = session.taskId ? tasks.find((t) => t.id === session.taskId) : undefined;
        if (linkedTask) return matchCategory(linkedTask);
        const normalized = `${session.subjectName} ${session.taskTitle || ''}`.toLowerCase();
        if (selectedCategory === 'deep') {
            return !normalized.includes('ورزش') && !normalized.includes('استراحت') && !normalized.includes('خواب');
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

    const positionedSessions = useMemo(() => {
        const daySessions = sessions.filter(
            (s) =>
                (s.logicalDate || getLogicalDateKey(s.startedAt, cutoffHour)) === logicalDate &&
                matchSessionCategory(s)
        );
        const spans: Array<{ id: string; startOffset: number; endOffset: number; data: StudySession & { spanMinutes: number } }> = [];
        daySessions.forEach((s) => {
            if (s.activeSegments && s.activeSegments.length > 0) {
                s.activeSegments.forEach((seg, idx) => {
                    const startMs = typeof seg.startedAt === 'number' ? seg.startedAt : new Date(seg.startedAt).getTime();
                    const endMs = typeof seg.endedAt === 'number' ? seg.endedAt : new Date(seg.endedAt).getTime();
                    const segDur = Math.max(0, (Number.isFinite(endMs) ? endMs : 0) - (Number.isFinite(startMs) ? startMs : 0));
                    if (segDur <= 0) return;
                    const d = new Date(startMs);
                    const wallStr = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
                    const startOffset = getOffsetMinutesFromCutoff(wallStr, cutoffHour);
                    const mins = Math.max(10, Math.round(segDur / 60000));
                    spans.push({
                        id: `${s.id}__seg_${idx}`,
                        startOffset,
                        endOffset: Math.min(1440, startOffset + mins),
                        data: { ...s, spanMinutes: Math.max(1, Math.round(segDur / 60000)) },
                    });
                });
            } else {
                const d = new Date(s.startedAt);
                const wallStr = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
                const startOffset = getOffsetMinutesFromCutoff(wallStr, cutoffHour);
                const mins = Math.max(10, Math.round((s.durationSeconds || 0) / 60));
                spans.push({
                    id: s.id,
                    startOffset,
                    endOffset: Math.min(1440, startOffset + mins),
                    data: { ...s, spanMinutes: Math.max(1, Math.round((s.durationSeconds || 0) / 60)) },
                });
            }
        });
        return computeTimelineLanes(spans);
    }, [sessions, tasks, logicalDate, cutoffHour, selectedCategory]);

    const conflictCount = useMemo(
        () => positionedTasks.filter((p) => p.hasConflict).length,
        [positionedTasks]
    );

    const totalScheduledMins = useMemo(
        () => scheduledTasks.reduce((sum, t) => sum + (t.durationMinutes ?? 60), 0),
        [scheduledTasks]
    );

    const dailyCapacity = settings?.dailyCapacityMinutes ?? 360;
    const isOverCapacity = totalScheduledMins > dailyCapacity;

    const hoursOrder = useMemo(() => Array.from({ length: 24 }, (_, i) => (cutoffHour + i) % 24), [cutoffHour]);

    const pointerYToSnappedTime = (clientY: number): { timeStr: string; topPx: number } => {
        const el = canvasRef.current;
        if (!el) return { timeStr: '09:00', topPx: 0 };
        const rect = el.getBoundingClientRect();
        const relY = Math.max(0, Math.min(totalCanvasHeight - 10, clientY - rect.top));
        const rawOffsetMins = relY / pxPerMin;
        const snappedOffset = Math.max(0, Math.min(1425, Math.round(rawOffsetMins / 15) * 15));
        return {
            timeStr: formatMinutesAtCutoffOffset(snappedOffset, cutoffHour, 15),
            topPx: snappedOffset * pxPerMin,
        };
    };

    const handleCanvasDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        const { timeStr, topPx } = pointerYToSnappedTime(e.clientY);
        setDragHoverTime(timeStr);
        setDragHoverTopPx(topPx);
    };

    const handleCanvasDrop = (e: React.DragEvent) => {
        e.preventDefault();
        const taskId = e.dataTransfer.getData('text/plain');
        const { timeStr } = pointerYToSnappedTime(e.clientY);
        setDragHoverTime(null);
        if (!taskId) return;
        const target = tasks.find((t) => t.id === taskId);
        if (!target) return;
        updateTask({ ...target, startTime: timeStr });
    };

    const startResizeBlock = (e: React.PointerEvent, task: SubjectTask) => {
        e.stopPropagation();
        e.preventDefault();
        const startY = e.clientY;
        const initialDur = Math.max(15, task.durationMinutes ?? 60);
        setResizingState({ taskId: task.id, previewDuration: initialDur });

        const onMove = (ev: PointerEvent) => {
            const deltaY = ev.clientY - startY;
            const deltaMins = Math.round((deltaY / pxPerMin) / 15) * 15;
            const nextDur = Math.max(15, Math.min(480, initialDur + deltaMins));
            setResizingState({ taskId: task.id, previewDuration: nextDur });
        };

        const onUp = (ev: PointerEvent) => {
            window.removeEventListener('pointermove', onMove);
            window.removeEventListener('pointerup', onUp);
            const deltaY = ev.clientY - startY;
            const deltaMins = Math.round((deltaY / pxPerMin) / 15) * 15;
            const finalDur = Math.max(15, Math.min(480, initialDur + deltaMins));
            setResizingState(null);
            if (finalDur !== initialDur) {
                updateTask({ ...task, durationMinutes: finalDur });
            }
        };

        window.addEventListener('pointermove', onMove);
        window.addEventListener('pointerup', onUp);
    };

    const handleAutoScheduleSingle = (task: SubjectTask) => {
        const minOffset = isToday ? nowOffsetMins : getOffsetMinutesFromCutoff('08:00', cutoffHour);
        const slot = findNextFreeSlot(tasks, logicalDate, task.durationMinutes ?? 60, minOffset, cutoffHour);
        updateTask({ ...task, startTime: slot });
        showToast(`«${task.topic}» در ساعت ${slot} قرار گرفت.`, 'success');
    };

    const handleAutoScheduleAll = () => {
        if (unscheduledTasks.length === 0) return;
        const working = [...tasks];
        let minOffset = isToday ? nowOffsetMins : getOffsetMinutesFromCutoff('08:00', cutoffHour);
        let count = 0;

        unscheduledTasks.forEach((task) => {
            const slot = findNextFreeSlot(working, logicalDate, task.durationMinutes ?? 60, minOffset, cutoffHour);
            const updated: SubjectTask = { ...task, startTime: slot };
            const idx = working.findIndex((x) => x.id === task.id);
            if (idx !== -1) working[idx] = updated;
            updateTask(updated);
            minOffset = getOffsetMinutesFromCutoff(slot, cutoffHour) + (task.durationMinutes ?? 60);
            count++;
        });

        showToast(`${formatToPersianDigits(count)} کار به صورت خودکار در فضاهای خالی زمان‌بندی شد!`, 'success');
    };

    const scrollToNow = () => {
        nowLineRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    };

    return (
        <div className="space-y-4">
            {/* Unscheduled Backlog Tray (Compact Semantic Surface + One-click Smart Slot Fit) */}
            {unscheduledTasks.length > 0 && (
                <div className="bg-[var(--surface-elevated)] border border-amber-500/30 squircle-md p-3.5 space-y-2.5 shadow-xs">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                        <h3 className="text-xs font-extrabold text-amber-700 dark:text-amber-300 flex items-center gap-1.5">
                            <Sparkles size={14} aria-hidden="true" />
                            کارهای بدون ساعت امروز ({formatToPersianDigits(unscheduledTasks.length)})
                        </h3>
                        <button
                            type="button"
                            onClick={handleAutoScheduleAll}
                            className="min-h-[36px] px-3 py-1 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold shadow-xs transition flex items-center gap-1 cursor-pointer"
                        >
                            <Sparkles size={12} aria-hidden="true" /> چیدمان خودکار همه
                        </button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {unscheduledTasks.map((t) => {
                            const st = getSubjectStyle(t.subject);
                            return (
                                <div
                                    key={t.id}
                                    draggable
                                    onDragStart={(e) => {
                                        e.dataTransfer.setData('text/plain', t.id);
                                        e.dataTransfer.effectAllowed = 'move';
                                    }}
                                    className="flex items-center gap-2 bg-surface-container-low px-3 py-1.5 rounded-2xl border border-[var(--border-subtle)] text-xs cursor-grab active:cursor-grabbing hover:border-primary transition"
                                >
                                    <GripVertical size={13} className="text-[var(--text-tertiary)] shrink-0" />
                                    <button
                                        type="button"
                                        onClick={() => onEditTask(t)}
                                        className="font-bold text-on-surface hover:underline truncate max-w-[130px] cursor-pointer"
                                    >
                                        {t.topic}
                                    </button>
                                    <span className="text-[11px] text-[var(--text-secondary)] tabular-nums">({formatToPersianDigits(t.durationMinutes ?? 60)}&apos;)</span>
                                    <button
                                        type="button"
                                        onClick={() => handleAutoScheduleSingle(t)}
                                        className="text-[11px] px-2.5 py-1 rounded-lg bg-primary-fixed text-on-primary-fixed font-bold hover:brightness-95 transition cursor-pointer"
                                        title="یافتن اولین وقت خالی"
                                    >
                                        وقت خالی
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => startFocusForTask(t)}
                                        className="p-1.5 rounded-lg bg-primary text-on-primary hover:brightness-110 transition cursor-pointer"
                                        title="شروع تمرکز"
                                    >
                                        <Play size={11} fill="currentColor" />
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Slim Single-Line Timeline Controls & Capacity Status Bar */}
            <div className="bg-[var(--surface-elevated)] squircle-md border border-[var(--border-subtle)] px-3 py-2.5 flex flex-wrap items-center justify-between gap-2 shadow-xs">
                <div className="flex flex-wrap items-center gap-1.5">
                    {/* Zoom Switcher */}
                    <div className="flex items-center bg-surface-container-low p-0.5 rounded-xl border border-[var(--border-subtle)] gap-0.5">
                        <ZoomIn size={13} className="text-[var(--text-secondary)] mx-1.5" aria-hidden="true" />
                        {(
                            [
                                { id: 'compact', label: 'فشرده' },
                                { id: 'normal', label: 'متعادل' },
                                { id: 'expanded', label: 'بزرگ' },
                            ] as { id: ZoomLevel; label: string }[]
                        ).map((z) => (
                            <button
                                key={z.id}
                                type="button"
                                onClick={() => setZoom(z.id)}
                                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer ${
                                    zoom === z.id
                                        ? 'bg-[var(--surface-elevated)] text-primary shadow-xs'
                                        : 'text-[var(--text-secondary)] hover:text-on-surface'
                                }`}
                            >
                                {z.label}
                            </button>
                        ))}
                    </div>

                    <button
                        type="button"
                        onClick={() => setShowActualTrack(!showActualTrack)}
                        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-[11px] font-bold border transition cursor-pointer ${
                            showActualTrack
                                ? 'bg-secondary-container/45 border-secondary/30 text-secondary'
                                : 'bg-surface-container-low border-[var(--border-subtle)] text-[var(--text-secondary)]'
                        }`}
                    >
                        <Eye size={13} aria-hidden="true" /> ستون واقعی ({formatToPersianDigits(positionedSessions.length)})
                    </button>

                    {isToday && (
                        <button
                            type="button"
                            onClick={scrollToNow}
                            className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-error-container/50 text-error border border-error/25 text-[11px] font-extrabold cursor-pointer"
                        >
                            <Crosshair size={13} aria-hidden="true" /> الان <span dir="ltr" className="tabular-nums">{formatToPersianDigits(nowTimeStr)}</span>
                        </button>
                    )}
                </div>

                {/* Capacity & Conflict Pills */}
                <div className="flex items-center gap-2 text-[11px] font-bold tabular-nums">
                    {conflictCount > 0 && (
                        <span className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-error-container text-error border border-error/30">
                            <AlertTriangle size={12} aria-hidden="true" /> تداخل زمانی
                        </span>
                    )}
                    <span
                        className={`px-2.5 py-1 rounded-xl border ${
                            isOverCapacity
                                ? 'bg-amber-500/12 text-amber-700 dark:text-amber-300 border-amber-500/30'
                                : 'bg-surface-container-low text-on-surface border-[var(--border-subtle)]'
                        }`}
                    >
                        ظرفیت: {formatToPersianDigits(Math.round((totalScheduledMins / 60) * 10) / 10)} از{' '}
                        {formatToPersianDigits(Math.round((dailyCapacity / 60) * 10) / 10)} ساعت
                    </span>
                </div>
            </div>

            {/* Empty Guidance Banner when day has no tasks */}
            {scheduledTasks.length === 0 && unscheduledTasks.length === 0 && (
                <div className="bg-[var(--surface-elevated)] rounded-2xl border border-dashed border-[var(--border-strong)] p-5 flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-start">
                    <div>
                        <p className="text-sm font-bold text-on-surface">هنوز بلوک زمانی برای این روز چیده نشده است</p>
                        <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                            روی هر ساعت از تایم‌لاین بزنید یا دکمه ثبت سریع را انتخاب کنید.
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={() => onAddAtHour('09:00')}
                        className="min-h-[44px] px-4 py-2 rounded-xl bg-primary text-on-primary text-xs font-bold flex items-center gap-1.5 hover:brightness-110 transition cursor-pointer shrink-0"
                    >
                        <Plus size={16} aria-hidden="true" />
                        افزودن اولین بلوک
                    </button>
                </div>
            )}

            {/* Proportional 24h Calendar Canvas */}
            <div className="bg-[var(--surface-elevated)] rounded-3xl border border-[var(--border-subtle)] shadow-xs overflow-hidden">
                {/* Column Header */}
                <div className="flex border-b border-[var(--border-subtle)] bg-surface-container-low text-xs font-bold text-[var(--text-secondary)]">
                    <div className="w-16 shrink-0 py-2.5 text-center border-e border-[var(--border-subtle)]">ساعت</div>
                    <div className="flex-1 py-2.5 px-3 sm:px-4 flex justify-between items-center gap-2 min-w-0">
                        <span className="whitespace-nowrap">برنامه زمان‌بندی‌شده</span>
                        <span className="text-xs font-medium text-[var(--text-secondary)] hidden lg:inline truncate">
                            لمس بلوک = تنظیم زمان • لمس فضای خالی = افزودن
                        </span>
                    </div>
                    {showActualTrack && (
                        <div className="hidden md:flex w-52 shrink-0 py-2.5 px-3 border-s border-[var(--border-subtle)] justify-center text-secondary font-bold">
                            عملکرد واقعی ثبت‌شده
                        </div>
                    )}
                </div>

                {/* Scrollable 24h Canvas */}
                <div className="max-h-[680px] overflow-y-auto custom-scrollbar">
                    <div className="flex relative" style={{ height: totalCanvasHeight }}>
                        {/* Hour Axis Gutter */}
                        <div className="w-16 shrink-0 border-s border-[var(--border-subtle)] relative bg-surface-container-low/40 select-none">
                            {hoursOrder.map((h, idx) => (
                                <div
                                    key={h}
                                    style={{ top: idx * hourHeight, height: hourHeight }}
                                    className="absolute right-0 left-0 border-b border-[var(--border-subtle)] flex items-start justify-center pt-1"
                                >
                                    <span className="text-xs font-mono font-bold text-[var(--text-secondary)]">
                                        {String(h).padStart(2, '0')}:00
                                    </span>
                                </div>
                            ))}
                        </div>

                        {/* Interactive Main Planned Canvas */}
                        <div
                            ref={canvasRef}
                            onDragOver={handleCanvasDragOver}
                            onDragLeave={() => setDragHoverTime(null)}
                            onDrop={handleCanvasDrop}
                            onClick={(e) => {
                                if (e.target !== canvasRef.current && !(e.target as HTMLElement).dataset.bgSlot) return;
                                const { timeStr } = pointerYToSnappedTime(e.clientY);
                                onAddAtHour(timeStr);
                            }}
                            className="flex-1 relative cursor-crosshair select-none"
                        >
                            {/* Hour & 30-min grid lines */}
                            {hoursOrder.map((h, idx) => (
                                <div
                                    key={h}
                                    data-bg-slot="true"
                                    style={{ top: idx * hourHeight, height: hourHeight }}
                                    className="group absolute right-0 left-0 border-b border-gray-100 dark:border-gray-700/60 hover:bg-indigo-50/20 dark:hover:bg-indigo-950/10 transition-colors"
                                >
                                    {/* 30m midpoint dashed rule */}
                                    <div
                                        data-bg-slot="true"
                                        className="absolute right-0 left-0 top-1/2 border-t border-dashed border-gray-100/70 dark:border-gray-700/30 pointer-events-none"
                                    />
                                    <span className="opacity-0 group-hover:opacity-100 pointer-events-none text-[11px] font-bold text-indigo-400 absolute left-3 top-1">
                                        + افزودن در {String(h).padStart(2, '0')}:00
                                    </span>
                                </div>
                            ))}

                            {/* Drag Hover Guide */}
                            {dragHoverTime && (
                                <div
                                    style={{ top: dragHoverTopPx }}
                                    className="pointer-events-none absolute right-0 left-0 border-t-2 border-dashed border-indigo-500 z-30 flex items-center"
                                >
                                    <span className="bg-indigo-600 text-white text-[11px] font-mono font-black px-2 py-0.5 rounded-s-lg shadow">
                                        {dragHoverTime}
                                    </span>
                                </div>
                            )}

                            {/* Live Current-Time Laser Line */}
                            {isToday && (
                                <div
                                    ref={nowLineRef}
                                    style={{ top: nowTopPx }}
                                    className="pointer-events-none absolute right-0 left-0 z-20 flex items-center"
                                >
                                    <div className="w-2.5 h-2.5 rounded-full bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.8)] -me-1" />
                                    <div className="flex-1 h-[2px] bg-gradient-to-l from-rose-500 to-rose-400/40" />
                                    <span className="bg-rose-500 text-white text-[11px] font-mono font-black px-1.5 py-0.5 rounded-e-md ms-2 shadow">
                                        الان {nowTimeStr}
                                    </span>
                                </div>
                            )}

                            {/* Scheduled Task Blocks (Side-by-side Overlap Lanes + Resize Handle) */}
                            {positionedTasks.map((item) => {
                                const t = item.data;
                                const st = getSubjectStyle(t.subject);
                                const colorStyle = getStaticSubjectClasses(st.color);
                                const top = item.startOffset * pxPerMin;
                                const dur = item.endOffset - item.startOffset;
                                const height = Math.max(38, dur * pxPerMin - 2);
                                const widthPct = 100 / item.laneCount;
                                const rightPct = item.laneIndex * widthPct;

                                return (
                                    <div
                                        key={t.id}
                                        draggable={resizingState?.taskId !== t.id}
                                        onDragStart={(e) => {
                                            e.dataTransfer.setData('text/plain', t.id);
                                            e.dataTransfer.effectAllowed = 'move';
                                        }}
                                        onClick={(e) => e.stopPropagation()}
                                        style={{
                                            top,
                                            height,
                                            right: `calc(${rightPct}% + 6px)`,
                                            width: `calc(${widthPct}% - 12px)`,
                                        }}
                                        className={`group absolute rounded-2xl border shadow-sm transition-shadow hover:shadow-md z-10 flex flex-col justify-between overflow-hidden ${
                                            t.isCompleted
                                                ? 'bg-emerald-50/90 dark:bg-emerald-950/60 border-emerald-300 dark:border-emerald-700 opacity-85 text-emerald-950 dark:text-emerald-100'
                                                : item.hasConflict
                                                  ? `${colorStyle.bg} border-rose-400 ring-1 ring-rose-400/50 ${colorStyle.text}`
                                                  : `${colorStyle.bg} ${colorStyle.border} ${colorStyle.text}`
                                        }`}
                                    >
                                        <div className="p-2 flex items-start justify-between gap-2 min-h-0">
                                            <div className="flex items-start gap-1.5 min-w-0">
                                                <button
                                                    type="button"
                                                    onClick={() => toggleTask(t.id)}
                                                    aria-label={t.isCompleted ? `لغو تکمیل ${t.topic}` : `تکمیل ${t.topic}`}
                                                    className="p-1 -m-1 shrink-0 min-w-[28px] min-h-[28px] flex items-center justify-center cursor-pointer"
                                                >
                                                    {t.isCompleted ? (
                                                        <CheckCircle2 size={16} className="text-emerald-500" />
                                                    ) : (
                                                        <Circle size={16} className="text-[var(--text-secondary)] hover:text-primary" />
                                                    )}
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => setActionSheetTaskId(t.id)}
                                                    className="text-start min-w-0 cursor-pointer"
                                                >
                                                    <div className="text-xs font-extrabold text-on-surface flex items-center gap-1 truncate">
                                                        <span>{st.icon}</span>
                                                        <span className={t.isCompleted ? 'line-through truncate' : 'truncate'}>{t.topic}</span>
                                                        {t.isMIT && (
                                                            <span className="text-[11px] px-1.5 py-0.5 rounded bg-amber-400 text-amber-950 font-extrabold shrink-0">
                                                                <bdi>MIT</bdi>
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div className="text-[11px] text-[var(--text-secondary)] flex items-center gap-1.5 truncate tabular-nums">
                                                        <span>{t.subject}</span>
                                                        <span aria-hidden="true">·</span>
                                                        <span dir="ltr">{formatToPersianDigits(t.startTime || '')}</span>
                                                        <span>({formatToPersianDigits(dur)} دقیقه)</span>
                                                    </div>
                                                </button>
                                            </div>

                                            {/* Quick inline controls (Touch-accessible + Desktop hover shortcuts) */}
                                            <div className="flex items-center gap-1 shrink-0">
                                                <div className="hidden md:group-hover:flex items-center gap-0.5 bg-[var(--surface-elevated)] rounded-lg p-0.5 border border-[var(--border-subtle)]">
                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            updateTask({
                                                                ...t,
                                                                durationMinutes: Math.max(15, dur - 15),
                                                            })
                                                        }
                                                        aria-label="۱۵ دقیقه کمتر"
                                                        className="px-1.5 py-0.5 text-[11px] font-bold text-[var(--text-secondary)] hover:text-rose-500 cursor-pointer"
                                                        title="۱۵ دقیقه کمتر"
                                                    >
                                                        -۱۵
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            updateTask({
                                                                ...t,
                                                                durationMinutes: Math.min(480, dur + 15),
                                                            })
                                                        }
                                                        aria-label="۱۵ دقیقه بیشتر"
                                                        className="px-1.5 py-0.5 text-[11px] font-bold text-[var(--text-secondary)] hover:text-primary cursor-pointer"
                                                        title="۱۵ دقیقه بیشتر"
                                                    >
                                                        +۱۵
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => updateTask({ ...t, startTime: undefined })}
                                                        aria-label="حذف ساعت و بازگشت به لیست بدون زمان"
                                                        className="p-1 text-[var(--text-secondary)] hover:text-rose-500 cursor-pointer"
                                                        title="حذف ساعت و بازگشت به لیست بدون زمان"
                                                    >
                                                        <X size={12} />
                                                    </button>
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => setActionSheetTaskId(t.id)}
                                                    aria-label={`تنظیمات و تغییر زمان ${t.topic}`}
                                                    className="min-w-[32px] min-h-[32px] flex items-center justify-center rounded-lg bg-surface-container-low/90 text-on-surface hover:bg-surface-container transition cursor-pointer"
                                                    title="تغییر زمان و عملیات"
                                                >
                                                    <MoreHorizontal size={15} />
                                                </button>
                                                {!t.isCompleted && (
                                                    <button
                                                        type="button"
                                                        onClick={() => startFocusForTask(t)}
                                                        aria-label={`شروع تمرکز روی ${t.topic}`}
                                                        className="min-w-[32px] min-h-[32px] flex items-center justify-center rounded-lg bg-primary text-on-primary hover:brightness-110 shadow-xs cursor-pointer"
                                                        title="شروع تمرکز"
                                                    >
                                                        <Play size={12} fill="currentColor" />
                                                    </button>
                                                )}
                                            </div>
                                        </div>

                                        {/* Bottom Drag-Resize Handle */}
                                        <div
                                            onPointerDown={(e) => startResizeBlock(e, t)}
                                            title="بکشید تا مدت زمان تغییر کند"
                                            className="h-2 w-full cursor-ns-resize flex items-center justify-center opacity-0 group-hover:opacity-100 bg-black/5 dark:bg-white/10 transition-opacity"
                                        >
                                            <span className="w-8 h-0.5 rounded-full bg-gray-400" />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Companion Track: Real Focus Sessions Side-by-Side */}
                        {showActualTrack && (
                            <div className="hidden md:block w-52 shrink-0 border-e border-gray-100 dark:border-gray-700 relative bg-emerald-50/15 dark:bg-emerald-950/10">
                                {hoursOrder.map((h, idx) => (
                                    <div
                                        key={`act_bg_${h}`}
                                        style={{ top: idx * hourHeight, height: hourHeight }}
                                        className="absolute right-0 left-0 border-b border-gray-100/70 dark:border-gray-700/40 pointer-events-none"
                                    />
                                ))}

                                {positionedSessions.map((item) => {
                                    const s = item.data;
                                    const top = item.startOffset * pxPerMin;
                                    const mins = item.endOffset - item.startOffset;
                                    const height = Math.max(26, mins * pxPerMin - 2);
                                    const widthPct = 100 / item.laneCount;
                                    const rightPct = item.laneIndex * widthPct;

                                    return (
                                        <div
                                            key={item.id}
                                            style={{
                                                top,
                                                height,
                                                right: `calc(${rightPct}% + 4px)`,
                                                width: `calc(${widthPct}% - 8px)`,
                                            }}
                                            title={`${s.subjectName}${s.taskTitle ? `: ${s.taskTitle}` : ''} (${s.spanMinutes} دقیقه)`}
                                            className="absolute rounded-xl bg-emerald-500/90 text-white px-2 py-1 shadow-sm overflow-hidden text-[11px] font-bold flex flex-col justify-center"
                                        >
                                            <span className="truncate">{s.subjectName}</span>
                                            <span className="text-[11px] text-emerald-100 truncate flex items-center gap-1">
                                                <Clock size={11} aria-hidden="true" />
                                                {formatToPersianDigits(s.spanMinutes)} دقیقه
                                            </span>
                                        </div>
                                    );
                                })}

                                {positionedSessions.length === 0 && (
                                    <div className="p-4 text-center text-xs text-[var(--text-secondary)] leading-relaxed mt-8">
                                        جلسات تمرکز ثبت‌شده در این روز کنار برنامه شما اینجا نمایش داده می‌شوند.
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Touch-First Bottom Action Sheet for Timeline Block (WCAG 2.5.7 compliant) */}
            {actionSheetTask &&
                typeof document !== 'undefined' &&
                createPortal(
                    <div
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="timeline-action-sheet-title"
                        className="fixed inset-0 z-[50] flex items-end sm:items-center justify-center p-0 sm:p-4"
                        dir="rtl"
                    >
                        <div
                            className="absolute inset-0 bg-black/45 backdrop-blur-[2px]"
                            onClick={() => setActionSheetTaskId(null)}
                        />
                        <div
                            ref={actionSheetRef}
                            tabIndex={-1}
                            className="relative w-full sm:max-w-md bg-[var(--surface-elevated)] rounded-t-[28px] sm:rounded-[28px] border border-[var(--border-subtle)] shadow-2xl p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom,0px))] space-y-4 outline-none"
                        >
                            <div className="w-10 h-1 rounded-full bg-outline-variant/60 mx-auto sm:hidden" aria-hidden="true" />
                            <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                    <p className="text-xs font-semibold text-[var(--text-secondary)]">
                                        {actionSheetTask.subject} · شروع{' '}
                                        <span className="tabular-nums" dir="ltr">
                                            {formatToPersianDigits(actionSheetTask.startTime || '09:00')}
                                        </span>{' '}
                                        ({formatToPersianDigits(actionSheetTask.durationMinutes ?? 60)} دقیقه)
                                    </p>
                                    <h3
                                        id="timeline-action-sheet-title"
                                        className="text-base font-extrabold text-on-surface mt-0.5 truncate"
                                    >
                                        {actionSheetTask.topic}
                                    </h3>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setActionSheetTaskId(null)}
                                    aria-label="بستن منوی بلوک"
                                    className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl hover:bg-surface-container text-[var(--text-secondary)] cursor-pointer shrink-0"
                                >
                                    <X size={18} />
                                </button>
                            </div>

                            {/* Duration & Start Time Controls (44px Touch Targets) */}
                            <div className="grid grid-cols-2 gap-2.5">
                                <div className="bg-surface-container-low rounded-2xl p-2.5 border border-[var(--border-subtle)] space-y-1.5">
                                    <span className="text-xs font-bold text-[var(--text-secondary)] block text-center">
                                        مدت زمان ({formatToPersianDigits(actionSheetTask.durationMinutes ?? 60)} دقیقه)
                                    </span>
                                    <div className="grid grid-cols-2 gap-1.5">
                                        <button
                                            type="button"
                                            onClick={() =>
                                                updateTask({
                                                    ...actionSheetTask,
                                                    durationMinutes: Math.max(15, (actionSheetTask.durationMinutes ?? 60) - 15),
                                                })
                                            }
                                            className="min-h-[44px] rounded-xl bg-[var(--surface-elevated)] border border-[var(--border-subtle)] text-xs font-bold text-on-surface flex items-center justify-center gap-1 hover:bg-surface-container cursor-pointer"
                                        >
                                            <Minus size={14} aria-hidden="true" />
                                            ۱۵ دقیقه
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() =>
                                                updateTask({
                                                    ...actionSheetTask,
                                                    durationMinutes: Math.min(480, (actionSheetTask.durationMinutes ?? 60) + 15),
                                                })
                                            }
                                            className="min-h-[44px] rounded-xl bg-[var(--surface-elevated)] border border-[var(--border-subtle)] text-xs font-bold text-primary flex items-center justify-center gap-1 hover:bg-surface-container cursor-pointer"
                                        >
                                            <Plus size={14} aria-hidden="true" />
                                            ۱۵ دقیقه
                                        </button>
                                    </div>
                                </div>

                                <div className="bg-surface-container-low rounded-2xl p-2.5 border border-[var(--border-subtle)] space-y-1.5">
                                    <span className="text-xs font-bold text-[var(--text-secondary)] block text-center">
                                        ساعت شروع (<span dir="ltr">{formatToPersianDigits(actionSheetTask.startTime || '09:00')}</span>)
                                    </span>
                                    <div className="grid grid-cols-2 gap-1.5">
                                        <button
                                            type="button"
                                            onClick={() => shiftTaskStartTime(actionSheetTask, -30)}
                                            className="min-h-[44px] rounded-xl bg-[var(--surface-elevated)] border border-[var(--border-subtle)] text-xs font-bold text-on-surface flex items-center justify-center gap-1 hover:bg-surface-container cursor-pointer"
                                        >
                                            −۳۰ دقیقه
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => shiftTaskStartTime(actionSheetTask, 30)}
                                            className="min-h-[44px] rounded-xl bg-[var(--surface-elevated)] border border-[var(--border-subtle)] text-xs font-bold text-primary flex items-center justify-center gap-1 hover:bg-surface-container cursor-pointer"
                                        >
                                            +۳۰ دقیقه
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Primary Action Grid */}
                            <div className="grid grid-cols-2 gap-2.5">
                                {!actionSheetTask.isCompleted && (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            startFocusForTask(actionSheetTask);
                                            setActionSheetTaskId(null);
                                        }}
                                        className="min-h-[44px] rounded-xl bg-primary text-on-primary text-xs font-bold flex items-center justify-center gap-1.5 hover:brightness-110 cursor-pointer"
                                    >
                                        <Play size={15} fill="currentColor" aria-hidden="true" />
                                        شروع تمرکز
                                    </button>
                                )}
                                <button
                                    type="button"
                                    onClick={() => {
                                        toggleTask(actionSheetTask.id);
                                        setActionSheetTaskId(null);
                                    }}
                                    className="min-h-[44px] rounded-xl bg-secondary-fixed/60 text-on-secondary-fixed text-xs font-bold flex items-center justify-center gap-1.5 hover:brightness-95 cursor-pointer"
                                >
                                    <CheckCircle2 size={15} aria-hidden="true" />
                                    {actionSheetTask.isCompleted ? 'برگرداندن به در صف' : 'تکمیل شد'}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        const target = actionSheetTask;
                                        setActionSheetTaskId(null);
                                        onEditTask(target);
                                    }}
                                    className="min-h-[44px] rounded-xl bg-surface-container-low border border-[var(--border-subtle)] text-on-surface text-xs font-bold flex items-center justify-center gap-1.5 hover:bg-surface-container cursor-pointer"
                                >
                                    <Pencil size={15} aria-hidden="true" />
                                    ویرایش کامل
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        updateTask({ ...actionSheetTask, startTime: undefined });
                                        setActionSheetTaskId(null);
                                    }}
                                    className="min-h-[44px] rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800/40 text-rose-600 dark:text-rose-400 text-xs font-bold flex items-center justify-center gap-1.5 hover:brightness-95 cursor-pointer"
                                >
                                    <CalendarOff size={15} aria-hidden="true" />
                                    حذف از تایم‌لاین
                                </button>
                            </div>
                        </div>
                    </div>,
                    document.body
                )}
        </div>
    );
};
