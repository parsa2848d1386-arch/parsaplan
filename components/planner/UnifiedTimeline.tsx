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
} from 'lucide-react';

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

    const positionedSessions = useMemo(() => {
        const daySessions = sessions.filter(
            (s) => (s.logicalDate || getLogicalDateKey(s.startedAt, cutoffHour)) === logicalDate
        );
        const spans = daySessions.map((s) => {
            const d = new Date(s.startedAt);
            const wallStr = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
            const startOffset = getOffsetMinutesFromCutoff(wallStr, cutoffHour);
            const mins = Math.max(10, Math.round((s.durationSeconds || 0) / 60));
            return {
                id: s.id,
                startOffset,
                endOffset: Math.min(1440, startOffset + mins),
                data: s,
            };
        });
        return computeTimelineLanes(spans);
    }, [sessions, logicalDate, cutoffHour]);

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
            {/* Unscheduled Backlog Tray (Draggable + One-click Smart Slot Fit) */}
            {unscheduledTasks.length > 0 && (
                <div className="bg-amber-50/75 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/40 rounded-3xl p-4 space-y-2.5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                        <h3 className="text-xs font-black text-amber-800 dark:text-amber-300 flex items-center gap-1.5">
                            <Sparkles size={14} />
                            کارهای بدون ساعت امروز ({formatToPersianDigits(unscheduledTasks.length)}) — بکشید روی تایم‌لاین یا خودکار بچینید
                        </h3>
                        <button
                            type="button"
                            onClick={handleAutoScheduleAll}
                            className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-[11px] font-black shadow-sm transition flex items-center gap-1"
                        >
                            <Sparkles size={12} /> چیدمان خودکار همه در زمان‌های خالی
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
                                    className="flex items-center gap-2 bg-surface-container-lowest dark:bg-slate-800 px-3 py-2 rounded-2xl border border-amber-200/70 dark:border-slate-700 text-xs cursor-grab active:cursor-grabbing shadow-sm hover:border-primary transition"
                                >
                                    <GripVertical size={13} className="text-on-surface-variant/50 shrink-0" />
                                    <span>{st.icon}</span>
                                    <button
                                        type="button"
                                        onClick={() => onEditTask(t)}
                                        className="font-bold text-on-surface dark:text-white hover:underline truncate max-w-[120px]"
                                    >
                                        {t.topic}
                                    </button>
                                    <span className="text-[10px] text-on-surface-variant">({formatToPersianDigits(t.durationMinutes ?? 60)}&apos;)</span>
                                    <button
                                        type="button"
                                        onClick={() => handleAutoScheduleSingle(t)}
                                        className="text-[10px] px-2 py-0.5 rounded-lg bg-primary-container text-on-primary-container font-bold hover:opacity-90 transition"
                                        title="یافتن اولین وقت خالی"
                                    >
                                        وقت خالی
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => startFocusForTask(t)}
                                        className="p-1 rounded-lg bg-primary text-on-primary hover:bg-primary-container transition"
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

            {/* Timeline Controls & Status Bar */}
            <div className="bg-surface-container-lowest dark:bg-slate-900 rounded-2xl border border-outline-variant/30 p-3 flex flex-wrap items-center justify-between gap-3 shadow-sm">
                <div className="flex flex-wrap items-center gap-2">
                    {/* Zoom Switcher */}
                    <div className="flex items-center bg-surface-container-high dark:bg-slate-800 p-1 rounded-xl gap-1">
                        <ZoomIn size={13} className="text-on-surface-variant mx-1" />
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
                                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition ${
                                    zoom === z.id
                                        ? 'bg-surface-container-lowest dark:bg-slate-700 text-primary shadow-sm'
                                        : 'text-on-surface-variant'
                                }`}
                            >
                                {z.label}
                            </button>
                        ))}
                    </div>

                    <button
                        type="button"
                        onClick={() => setShowActualTrack(!showActualTrack)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-bold border transition ${
                            showActualTrack
                                ? 'bg-secondary-container/40 dark:bg-secondary-container/20 border-secondary/30 text-secondary'
                                : 'bg-surface-container dark:bg-slate-800 border-outline-variant/30 text-on-surface-variant'
                        }`}
                    >
                        <Eye size={13} /> تطبیق با زمان واقعی ({formatToPersianDigits(positionedSessions.length)})
                    </button>

                    {isToday && (
                        <button
                            type="button"
                            onClick={scrollToNow}
                            className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-error-container/40 text-error border border-error/30 text-[11px] font-black"
                        >
                            <Crosshair size={13} /> پرش به الان ({nowTimeStr})
                        </button>
                    )}
                </div>

                {/* Capacity & Conflict Pills */}
                <div className="flex items-center gap-2 text-[11px] font-bold">
                    {conflictCount > 0 && (
                        <span className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-error-container text-error border border-error/30">
                            <AlertTriangle size={12} /> تداخل زمانی
                        </span>
                    )}
                    <span
                        className={`px-2.5 py-1 rounded-xl border ${
                            isOverCapacity
                                ? 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30'
                                : 'bg-primary-container/40 text-primary border-primary/20'
                        }`}
                    >
                        مجموع برنامه: {formatToPersianDigits(Math.round((totalScheduledMins / 60) * 10) / 10)} /{' '}
                        {formatToPersianDigits(Math.round((dailyCapacity / 60) * 10) / 10)} ساعت
                    </span>
                </div>
            </div>

            {/* Proportional 24h Calendar Canvas */}
            <div className="bg-surface-container-lowest dark:bg-slate-900 rounded-3xl border border-outline-variant/30 shadow-sm overflow-hidden">
                {/* Column Header */}
                <div className="flex border-b border-outline-variant/20 bg-surface-container-low dark:bg-slate-800/60 text-[11px] font-black text-on-surface-variant">
                    <div className="w-16 shrink-0 py-2.5 text-center border-l border-outline-variant/20">ساعت</div>
                    <div className="flex-1 py-2.5 px-4 flex justify-between items-center">
                        <span>برنامه زمان‌بندی‌شده (با کشیدن بلوک جابه‌جا یا از لبه پایین تغییر مدت دهید)</span>
                        <span className="text-[10px] font-normal text-on-surface-variant/80">کلیک روی فضای خالی = افزودن سریع</span>
                    </div>
                    {showActualTrack && (
                        <div className="hidden md:flex w-52 shrink-0 py-2.5 px-3 border-r border-outline-variant/20 justify-center text-secondary font-bold">
                            عملکرد واقعی ثبت‌شده
                        </div>
                    )}
                </div>

                {/* Scrollable 24h Canvas */}
                <div className="max-h-[680px] overflow-y-auto custom-scrollbar">
                    <div className="flex relative" style={{ height: totalCanvasHeight }}>
                        {/* Hour Axis Gutter */}
                        <div className="w-16 shrink-0 border-l border-gray-100 dark:border-gray-700 relative bg-gray-50/30 dark:bg-gray-900/20 select-none">
                            {hoursOrder.map((h, idx) => (
                                <div
                                    key={h}
                                    style={{ top: idx * hourHeight, height: hourHeight }}
                                    className="absolute right-0 left-0 border-b border-gray-100 dark:border-gray-700/60 flex items-start justify-center pt-1"
                                >
                                    <span className="text-[11px] font-mono font-bold text-gray-400">
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
                                    <span className="opacity-0 group-hover:opacity-100 pointer-events-none text-[10px] font-bold text-indigo-400 absolute left-3 top-1">
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
                                    <span className="bg-indigo-600 text-white text-[10px] font-mono font-black px-2 py-0.5 rounded-l-lg shadow">
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
                                    <div className="w-2.5 h-2.5 rounded-full bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.8)] -mr-1" />
                                    <div className="flex-1 h-[2px] bg-gradient-to-l from-rose-500 to-rose-400/40" />
                                    <span className="bg-rose-500 text-white text-[9px] font-mono font-black px-1.5 py-0.5 rounded-r-md ml-2 shadow">
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
                                                    className="mt-0.5 shrink-0"
                                                >
                                                    {t.isCompleted ? (
                                                        <CheckCircle2 size={15} className="text-emerald-500" />
                                                    ) : (
                                                        <Circle size={15} className="text-gray-400 hover:text-indigo-500" />
                                                    )}
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => onEditTask(t)}
                                                    className="text-right min-w-0"
                                                >
                                                    <div className="text-xs font-black text-gray-800 dark:text-white flex items-center gap-1 truncate">
                                                        <span>{st.icon}</span>
                                                        <span className={t.isCompleted ? 'line-through truncate' : 'truncate'}>{t.topic}</span>
                                                        {t.isMIT && (
                                                            <span className="text-[8px] px-1 py-0.5 rounded bg-amber-400 text-amber-950 font-black shrink-0">
                                                                MIT
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div className="text-[10px] text-gray-500 dark:text-gray-400 flex items-center gap-1.5 truncate">
                                                        <span>{t.subject}</span>
                                                        <span>•</span>
                                                        <span className="font-mono">{t.startTime}</span>
                                                        <span>({formatToPersianDigits(dur)}&apos;)</span>
                                                    </div>
                                                </button>
                                            </div>

                                            {/* Quick inline controls */}
                                            <div className="flex items-center gap-1 shrink-0">
                                                <div className="hidden group-hover:flex items-center gap-0.5 bg-white/80 dark:bg-gray-800 rounded-lg p-0.5 border border-gray-200 dark:border-gray-700">
                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            updateTask({
                                                                ...t,
                                                                durationMinutes: Math.max(15, dur - 15),
                                                            })
                                                        }
                                                        className="px-1 text-[9px] font-black text-gray-600 dark:text-gray-300 hover:text-rose-500"
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
                                                        className="px-1 text-[9px] font-black text-gray-600 dark:text-gray-300 hover:text-indigo-500"
                                                        title="۱۵ دقیقه بیشتر"
                                                    >
                                                        +۱۵
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => updateTask({ ...t, startTime: undefined })}
                                                        className="p-0.5 text-gray-400 hover:text-rose-500"
                                                        title="حذف ساعت و بازگشت به لیست بدون زمان"
                                                    >
                                                        <X size={11} />
                                                    </button>
                                                </div>
                                                {!t.isCompleted && (
                                                    <button
                                                        type="button"
                                                        onClick={() => startFocusForTask(t)}
                                                        className="p-1.5 rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm"
                                                        title="شروع تمرکز"
                                                    >
                                                        <Play size={11} fill="currentColor" />
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
                            <div className="hidden md:block w-52 shrink-0 border-r border-gray-100 dark:border-gray-700 relative bg-emerald-50/15 dark:bg-emerald-950/10">
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
                                            key={s.id}
                                            style={{
                                                top,
                                                height,
                                                right: `calc(${rightPct}% + 4px)`,
                                                width: `calc(${widthPct}% - 8px)`,
                                            }}
                                            title={`${s.subjectName}${s.taskTitle ? `: ${s.taskTitle}` : ''} (${Math.round(s.durationSeconds / 60)} دقیقه)`}
                                            className="absolute rounded-xl bg-emerald-500/90 text-white px-2 py-1 shadow-sm overflow-hidden text-[10px] font-bold flex flex-col justify-center"
                                        >
                                            <span className="truncate">{s.subjectName}</span>
                                            <span className="text-[9px] text-emerald-100 truncate">
                                                ⏱️ {formatToPersianDigits(Math.max(1, Math.round(s.durationSeconds / 60)))} دقیقه
                                            </span>
                                        </div>
                                    );
                                })}

                                {positionedSessions.length === 0 && (
                                    <div className="p-4 text-center text-[10px] text-gray-400 leading-relaxed mt-8">
                                        جلسات تمرکز ثبت‌شده در این روز کنار برنامه شما اینجا نمایش داده می‌شوند.
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
