import React, { useCallback, useEffect, useRef, useState } from 'react';
import { motion, useMotionValue, useTransform, useReducedMotion, PanInfo, AnimatePresence } from 'framer-motion';
import { SubjectTask, getSubjectStyle } from '../types';
import { formatToPersianDigits, getShamsiDate } from '../utils';
import {
    CheckCircle2,
    Circle,
    Trash2,
    Pencil,
    Calendar,
    ArrowDownToLine,
    Target,
    Play,
    Clock,
    Star,
    FileText,
    Check,
    X,
    MoreHorizontal,
    ListChecks,
} from 'lucide-react';
import { ExamTaskCard } from './ExamTaskCard';
import { useFocus } from '../context/FocusContext';
import { haptics } from '../utils/haptics';
import {
    SPRING_SNAPPY,
    SPRING_SWIPE,
    SQUASH_STRETCH_KEYFRAMES,
    SWIPE_COMMIT_THRESHOLD,
    TRANSITION_FAST,
    TRANSITION_SQUASH,
    resolveRtlTaskSwipe,
} from '../utils/motionPresets';
import { triggerArcFlight } from './ui/MotionPrimitives';
import { SlideToComplete } from './ui/SlideToComplete';

interface TaskCardProps {
    task: SubjectTask;
    isOverdue?: boolean;
    viewMode?: 'compact' | 'normal';
    onToggle: (id: string) => void;
    onEdit: (e: React.MouseEvent, task: SubjectTask) => void;
    onDelete: (e: React.MouseEvent, id: string) => void;
    onMoveToToday?: (id: string) => void;
}

const SUBJECT_TEXT_COLOR_CLASSES: Record<string, string> = {
    rose: 'text-rose-800 dark:text-rose-300',
    lime: 'text-lime-800 dark:text-lime-300',
    green: 'text-green-800 dark:text-green-300',
    red: 'text-red-800 dark:text-red-300',
    emerald: 'text-emerald-800 dark:text-emerald-300',
    orange: 'text-orange-800 dark:text-orange-300',
    stone: 'text-stone-800 dark:text-stone-300',
    sky: 'text-sky-800 dark:text-sky-300',
    cyan: 'text-cyan-800 dark:text-cyan-300',
    violet: 'text-violet-800 dark:text-violet-300',
    blue: 'text-blue-800 dark:text-blue-300',
    amber: 'text-amber-800 dark:text-amber-300',
    teal: 'text-teal-800 dark:text-teal-300',
    purple: 'text-purple-800 dark:text-purple-300',
    pink: 'text-pink-800 dark:text-pink-300',
    indigo: 'text-indigo-800 dark:text-indigo-300',
    slate: 'text-slate-800 dark:text-slate-300',
    zinc: 'text-zinc-800 dark:text-zinc-300',
    yellow: 'text-yellow-800 dark:text-yellow-300',
    fuchsia: 'text-fuchsia-800 dark:text-fuchsia-300',
    gray: 'text-gray-700 dark:text-gray-300',
};

export const TaskCard: React.FC<TaskCardProps> = React.memo(({
    task,
    isOverdue = false,
    viewMode = 'normal',
    onToggle,
    onEdit,
    onDelete,
    onMoveToToday,
}) => {
    const { startFocusForTask } = useFocus();
    const prefersReducedMotion = useReducedMotion();
    const checkBtnRef = useRef<HTMLButtonElement>(null);
    const menuRef = useRef<HTMLDivElement>(null);
    const [menuOpen, setMenuOpen] = useState(false);
    const x = useMotionValue(0);

    useEffect(() => {
        if (!menuOpen) return;
        const onDocClick = (e: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
                setMenuOpen(false);
            }
        };
        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') setMenuOpen(false);
        };
        document.addEventListener('mousedown', onDocClick);
        document.addEventListener('keydown', onKeyDown);
        return () => {
            document.removeEventListener('mousedown', onDocClick);
            document.removeEventListener('keydown', onKeyDown);
        };
    }, [menuOpen]);

    // Physical RTL edge alignment:
    // - Dragging LEFT (x < 0) exposes RIGHT edge -> Complete (emerald)
    // - Dragging RIGHT (x > 0) exposes LEFT edge -> Delete (rose)
    const completeBgOpacity = useTransform(x, [0, -SWIPE_COMMIT_THRESHOLD], [0, 1]);
    const deleteBgOpacity = useTransform(x, [0, SWIPE_COMMIT_THRESHOLD], [0, 1]);

    const handleDragEnd = useCallback(
        (_e: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
            const action = resolveRtlTaskSwipe(info.offset.x, info.velocity.x);
            if (action === 'complete') {
                haptics.success();
                if (!task.isCompleted) {
                    triggerArcFlight({
                        fromEl: checkBtnRef.current,
                        targetSelector: '[data-arc-target="xp-badge"]',
                        label: '+XP',
                    });
                }
                onToggle(task.id!);
            } else if (action === 'delete') {
                haptics.warning();
                onDelete(
                    { stopPropagation: () => {}, preventDefault: () => {} } as unknown as React.MouseEvent,
                    task.id!
                );
            }
        },
        [onToggle, onDelete, task.id, task.isCompleted]
    );

    const handleToggleClick = useCallback(() => {
        if (!task.isCompleted) {
            haptics.success();
            triggerArcFlight({
                fromEl: checkBtnRef.current,
                targetSelector: '[data-arc-target="xp-badge"]',
                label: '+XP',
            });
        } else {
            haptics.light();
        }
        onToggle(task.id!);
    }, [onToggle, task.id, task.isCompleted]);

    const handleSlideComplete = useCallback(
        (triggerEl?: HTMLElement | null) => {
            if (!task.isCompleted) {
                triggerArcFlight({
                    fromEl: triggerEl || checkBtnRef.current,
                    targetSelector: '[data-arc-target="xp-badge"]',
                    label: '+XP',
                });
            }
            onToggle(task.id!);
        },
        [onToggle, task.id, task.isCompleted]
    );

    // 1. Exam/Analysis Card Delegation
    if (task.studyType === 'exam' || task.studyType === 'analysis') {
        return (
            <ExamTaskCard
                task={task}
                onEdit={(e, t) => onEdit(e, t)}
                onDelete={(e, id) => onDelete(e, id)}
                onToggleComplete={(t) => onToggle(t.id!)}
            />
        );
    }

    // 2. Standard Task Display
    const isDone = task.isCompleted;
    const taskDateShamsi = getShamsiDate(task.date);

    let subColor = 'bg-surface-container text-[var(--text-secondary)]';
    if (task.isCustom) {
        subColor = 'bg-slate-800 text-white dark:bg-slate-700';
    } else {
        const style = getSubjectStyle(task.subject);
        const textCls = SUBJECT_TEXT_COLOR_CLASSES[style.color] || SUBJECT_TEXT_COLOR_CLASSES.gray;
        subColor = `${style.bgColor} ${textCls}`;
    }

    const hasTestStats = Boolean(task.testStats && task.testStats.total > 0);
    const accuracy = hasTestStats
        ? Math.round(((task.testStats!.correct * 3 - task.testStats!.wrong) / (task.testStats!.total * 3)) * 100)
        : 0;

    if (viewMode === 'compact') {
        return (
            <div className="relative w-full overflow-hidden squircle-md mb-2">
                {/* Right Edge (Exposed on Left-Swipe): Complete */}
                <motion.div
                    style={{ opacity: completeBgOpacity }}
                    aria-hidden="true"
                    className="absolute inset-y-0 right-0 flex items-center gap-1.5 px-4 bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-bold text-xs"
                >
                    <CheckCircle2 size={17} />
                    <span>{isDone ? 'بازگشت' : 'انجام'}</span>
                </motion.div>

                {/* Left Edge (Exposed on Right-Swipe): Delete */}
                <motion.div
                    style={{ opacity: deleteBgOpacity }}
                    aria-hidden="true"
                    className="absolute inset-y-0 left-0 flex items-center gap-1.5 px-4 bg-rose-500/15 text-rose-600 dark:text-rose-400 font-bold text-xs"
                >
                    <span>حذف</span>
                    <Trash2 size={17} />
                </motion.div>

                <motion.div
                    style={{ x }}
                    drag="x"
                    dragConstraints={{ left: -104, right: 104 }}
                    dragElastic={0.14}
                    dragDirectionLock
                    dragSnapToOrigin
                    dragTransition={SPRING_SWIPE}
                    onDragEnd={handleDragEnd}
                    className="relative z-10 w-full touch-pan-y"
                >
                    <div
                        className={`group relative z-10 bg-[var(--surface-elevated)] px-3 py-2.5 squircle-md shadow-xs border flex items-center gap-2.5 transition-colors ${
                            isDone ? 'opacity-75' : ''
                        } ${
                            isOverdue
                                ? 'border-amber-300/80 dark:border-amber-800/70'
                                : 'border-[var(--border-subtle)]'
                        }`}
                    >
                        <motion.button
                            ref={checkBtnRef}
                            type="button"
                            onClick={handleToggleClick}
                            whileTap={prefersReducedMotion ? undefined : { scale: 0.85 }}
                            animate={
                                prefersReducedMotion
                                    ? undefined
                                    : isDone
                                      ? SQUASH_STRETCH_KEYFRAMES
                                      : { scaleX: 1, scaleY: 1 }
                            }
                            transition={TRANSITION_SQUASH}
                            aria-label={isDone ? `لغو انجام ${task.topic}` : `تکمیل ${task.topic}`}
                            className={`w-11 h-11 sm:w-9 sm:h-9 flex items-center justify-center rounded-xl shrink-0 cursor-pointer transition-colors ${
                                isDone ? 'text-emerald-500' : 'text-[var(--text-tertiary)] hover:text-primary'
                            }`}
                        >
                            {isDone ? <CheckCircle2 size={20} /> : <Circle size={20} strokeWidth={2} />}
                        </motion.button>

                        <button
                            type="button"
                            onClick={handleToggleClick}
                            className="flex-1 min-w-0 flex items-center justify-between gap-2 text-start cursor-pointer"
                        >
                            <div className={`truncate ${isDone ? 'line-through text-[var(--text-secondary)]' : ''}`}>
                                <span className="font-bold text-sm text-on-surface">{task.subject}</span>
                                <span className="mx-1.5 text-xs text-[var(--text-tertiary)]">·</span>
                                <span className="text-xs text-[var(--text-secondary)] truncate">{task.topic}</span>
                            </div>
                            <div className="flex gap-1 items-center shrink-0">
                                {hasTestStats && (
                                    <div className="hidden sm:flex items-center gap-1 bg-surface-container px-1.5 py-0.5 rounded-md text-[11px] font-bold tabular-nums">
                                        <span className="inline-flex items-center gap-0.5 text-emerald-600 dark:text-emerald-400">
                                            <Check size={10} />
                                            {formatToPersianDigits(task.testStats?.correct ?? 0)}
                                        </span>
                                        <span className="inline-flex items-center gap-0.5 text-rose-500">
                                            <X size={10} />
                                            {formatToPersianDigits(task.testStats?.wrong ?? 0)}
                                        </span>
                                        <span className="text-[var(--text-tertiary)]">|</span>
                                        <span className={accuracy >= 50 ? 'text-emerald-600' : 'text-amber-500'}>
                                            {formatToPersianDigits(accuracy)}٪
                                        </span>
                                    </div>
                                )}
                                {task.tags && task.tags.length > 0 && (
                                    <span className="hidden xs:inline text-[11px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-md font-bold">
                                        #{task.tags[0]}
                                    </span>
                                )}
                                <span className={`text-[11px] px-2 py-0.5 rounded-md font-bold whitespace-nowrap ${subColor}`}>
                                    {task.details}
                                </span>
                            </div>
                        </button>

                        <div className="flex gap-1 items-center shrink-0" onPointerDownCapture={(e) => e.stopPropagation()}>
                            <button
                                type="button"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    haptics.light();
                                    startFocusForTask(task);
                                }}
                                className="w-11 h-11 sm:w-9 sm:h-9 flex items-center justify-center rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 transition cursor-pointer"
                                aria-label="شروع تمرکز"
                                title="شروع تمرکز"
                            >
                                <Play size={13} fill="currentColor" />
                            </button>
                            <button
                                type="button"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onEdit(e, task);
                                }}
                                className="w-11 h-11 sm:w-9 sm:h-9 flex items-center justify-center rounded-xl text-[var(--text-secondary)] hover:text-primary hover:bg-surface-container transition cursor-pointer"
                                aria-label="ویرایش"
                            >
                                <Pencil size={14} />
                            </button>
                            <button
                                type="button"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    haptics.warning();
                                    onDelete(e, task.id!);
                                }}
                                className="w-11 h-11 sm:w-9 sm:h-9 flex items-center justify-center rounded-xl text-[var(--text-secondary)] hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition cursor-pointer"
                                aria-label="حذف"
                            >
                                <Trash2 size={14} />
                            </button>
                        </div>
                    </div>
                </motion.div>
            </div>
        );
    }

    return (
        <div className="relative w-full overflow-hidden squircle-card mb-3">
            {/* Right Edge (Exposed on Left-Swipe): Complete */}
            <motion.div
                style={{ opacity: completeBgOpacity }}
                aria-hidden="true"
                className="absolute inset-y-0 right-0 flex items-center gap-2 px-5 bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-extrabold text-xs"
            >
                <CheckCircle2 size={20} />
                <span>{isDone ? 'بازگشت به لیست' : 'انجام شد'}</span>
            </motion.div>

            {/* Left Edge (Exposed on Right-Swipe): Delete */}
            <motion.div
                style={{ opacity: deleteBgOpacity }}
                aria-hidden="true"
                className="absolute inset-y-0 left-0 flex items-center gap-2 px-5 bg-rose-500/15 text-rose-600 dark:text-rose-400 font-extrabold text-xs"
            >
                <span>حذف</span>
                <Trash2 size={20} />
            </motion.div>

            <motion.div
                style={{ x }}
                drag="x"
                dragConstraints={{ left: -112, right: 112 }}
                dragElastic={0.14}
                dragDirectionLock
                dragSnapToOrigin
                dragTransition={SPRING_SWIPE}
                onDragEnd={handleDragEnd}
                className={`group relative z-10 bg-[var(--surface-elevated)] p-3.5 sm:p-4 squircle-card shadow-xs border flex flex-col gap-3 touch-pan-y transition-colors ${
                    isDone
                        ? 'border-emerald-500/25 bg-emerald-500/[0.03]'
                        : isOverdue
                          ? 'border-amber-300/80 dark:border-amber-800/60 bg-amber-50/25 dark:bg-amber-950/15'
                          : 'border-[var(--border-subtle)] hover:border-[var(--border-strong)]'
                }`}
            >
                {/* Top Header Row: Check Icon + Subject/Date + Quick Focus & Overflow Menu */}
                <div className="flex items-start gap-2.5 w-full">
                    <motion.button
                        ref={checkBtnRef}
                        type="button"
                        onClick={handleToggleClick}
                        whileTap={prefersReducedMotion ? undefined : { scale: 0.85 }}
                        animate={
                            prefersReducedMotion
                                ? undefined
                                : isDone
                                  ? SQUASH_STRETCH_KEYFRAMES
                                  : { scaleX: 1, scaleY: 1 }
                        }
                        transition={TRANSITION_SQUASH}
                        aria-label={isDone ? `لغو انجام ${task.topic}` : `تکمیل ${task.topic}`}
                        className={`w-10 h-10 -mt-1 -me-1 flex items-center justify-center rounded-xl shrink-0 cursor-pointer transition-colors ${
                            isDone
                                ? 'text-emerald-500'
                                : 'text-[var(--text-tertiary)] hover:text-primary'
                        }`}
                    >
                        {isDone ? <CheckCircle2 size={23} /> : <Circle size={23} strokeWidth={2} />}
                    </motion.button>

                    <button
                        type="button"
                        onClick={handleToggleClick}
                        className={`flex-1 min-w-0 text-start cursor-pointer transition-opacity duration-200 ${
                            isDone ? 'opacity-65' : ''
                        }`}
                    >
                        <div className="flex flex-wrap items-center gap-1.5">
                            <h3
                                className={`font-extrabold text-sm sm:text-base text-on-surface ${
                                    isDone ? 'line-through text-[var(--text-secondary)]' : ''
                                }`}
                            >
                                {task.subject}
                            </h3>
                            <span className={`text-[10px] sm:text-[11px] px-2 py-0.5 rounded-lg font-bold ${subColor}`}>
                                {task.details}
                            </span>
                            <span className="inline-flex items-center gap-1 text-[11px] text-[var(--text-tertiary)] font-semibold">
                                <Calendar size={11} />
                                {taskDateShamsi}
                            </span>
                        </div>

                        <p className={`text-xs sm:text-sm mt-1.5 leading-relaxed font-semibold text-on-surface/90 ${isDone ? 'line-through text-[var(--text-secondary)]' : ''}`}>
                            {task.topic}
                        </p>

                        <div className="flex flex-wrap items-center gap-1.5 mt-2">
                            {task.isMIT && (
                                <span className="inline-flex items-center gap-1 text-[11px] bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200/80 dark:border-amber-800/50 px-2 py-0.5 rounded-md font-bold">
                                    <Star size={10} fill="currentColor" />
                                    <bdi>MIT</bdi>
                                </span>
                            )}
                            {task.startTime && (
                                <span
                                    dir="ltr"
                                    className="inline-flex items-center gap-1 text-[11px] bg-sky-50 dark:bg-sky-950/35 text-sky-700 dark:text-sky-300 px-2 py-0.5 rounded-md font-mono font-bold tabular-nums"
                                >
                                    <Clock size={11} />
                                    {task.startTime}
                                    {task.durationMinutes ? ` · ${task.durationMinutes}′` : ''}
                                </span>
                            )}
                            {task.testRange && (
                                <span className="inline-flex items-center gap-1 text-[11px] bg-violet-50 dark:bg-violet-950/35 text-violet-700 dark:text-violet-300 px-2 py-0.5 rounded-md font-bold tabular-nums">
                                    <ListChecks size={11} />
                                    تست {task.testRange}
                                </span>
                            )}
                            {(task.actualDuration ?? 0) > 0 && (
                                <span className="inline-flex items-center gap-1 text-[11px] bg-emerald-50 dark:bg-emerald-950/35 text-emerald-700 dark:text-emerald-300 px-2 py-0.5 rounded-md font-bold tabular-nums">
                                    <Clock size={11} />
                                    {formatToPersianDigits(task.actualDuration ?? 0)} دقیقه مطالعه
                                </span>
                            )}
                            {task.blocks && task.blocks.length > 0 && (
                                <span className="inline-flex items-center gap-1 text-[11px] bg-primary/10 text-primary px-2 py-0.5 rounded-md font-bold tabular-nums">
                                    <FileText size={11} />
                                    {formatToPersianDigits(task.blocks.length)} بلوک
                                </span>
                            )}
                            {hasTestStats && (
                                <div className="inline-flex items-center gap-1.5 bg-surface-container border border-[var(--border-subtle)] rounded-lg px-2 py-0.5 text-[11px] font-bold tabular-nums">
                                    <span className="inline-flex items-center gap-0.5 text-emerald-600 dark:text-emerald-400" title="تعداد درست">
                                        <Target size={11} />
                                        {formatToPersianDigits(task.testStats?.correct ?? 0)}
                                    </span>
                                    <span className="text-[var(--text-tertiary)]">|</span>
                                    <span className="text-rose-500 dark:text-rose-400" title="تعداد غلط">
                                        {formatToPersianDigits(task.testStats?.wrong ?? 0)} غلط
                                    </span>
                                    <span className="text-[var(--text-tertiary)]">|</span>
                                    <span className={accuracy >= 50 ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}>
                                        {formatToPersianDigits(accuracy)}٪
                                    </span>
                                </div>
                            )}

                            {task.tags && task.tags.length > 0 && (
                                <div className="flex flex-wrap gap-1">
                                    {task.tags.map((t) => (
                                        <span
                                            key={t}
                                            className="text-[11px] bg-primary/8 text-primary px-1.5 py-0.5 rounded-md border border-primary/15 font-bold"
                                        >
                                            #{t}
                                        </span>
                                    ))}
                                </div>
                            )}
                        </div>
                    </button>

                    {/* Top-Corner Quick Focus Play & Overflow Menu */}
                    <div
                        className="flex items-center gap-1 shrink-0 relative"
                        ref={menuRef}
                        onPointerDownCapture={(e) => e.stopPropagation()}
                    >
                        <button
                            type="button"
                            onClick={(e) => {
                                e.stopPropagation();
                                haptics.medium();
                                startFocusForTask(task);
                            }}
                            title="شروع تمرکز"
                            aria-label="شروع تمرکز"
                            className="w-10 h-10 rounded-xl bg-emerald-500/12 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
                        >
                            <Play size={16} fill="currentColor" />
                        </button>

                        <button
                            type="button"
                            onClick={(e) => {
                                e.stopPropagation();
                                setMenuOpen((prev) => !prev);
                            }}
                            aria-expanded={menuOpen}
                            aria-label="گزینه‌های تسک"
                            title="گزینه‌ها"
                            className="w-10 h-10 rounded-xl bg-surface-container-low text-[var(--text-secondary)] hover:text-on-surface hover:bg-surface-container flex items-center justify-center transition-colors cursor-pointer"
                        >
                            <MoreHorizontal size={17} />
                        </button>

                        <AnimatePresence>
                            {menuOpen && (
                                <motion.div
                                    initial={prefersReducedMotion ? false : { opacity: 0, y: -4, scale: 0.96 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    exit={{ opacity: 0, y: -4, scale: 0.96 }}
                                    transition={TRANSITION_FAST}
                                    className="absolute top-11 end-0 z-30 min-w-[152px] bg-[var(--surface-elevated)] border border-[var(--border-subtle)] rounded-2xl shadow-lg p-1.5 flex flex-col gap-1"
                                >
                                    <button
                                        type="button"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setMenuOpen(false);
                                            onEdit(e, task);
                                        }}
                                        aria-label="ویرایش تسک"
                                        className="min-h-[40px] w-full flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold text-primary hover:bg-surface-container transition-colors cursor-pointer"
                                    >
                                        <Pencil size={14} />
                                        <span>ویرایش</span>
                                    </button>
                                    {isOverdue && onMoveToToday && (
                                        <button
                                            type="button"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setMenuOpen(false);
                                                haptics.light();
                                                onMoveToToday(task.id!);
                                            }}
                                            aria-label="انتقال به امروز"
                                            className="min-h-[40px] w-full flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold text-amber-700 dark:text-amber-300 hover:bg-amber-500/10 transition-colors cursor-pointer"
                                        >
                                            <ArrowDownToLine size={14} />
                                            <span>انتقال به امروز</span>
                                        </button>
                                    )}
                                    <button
                                        type="button"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setMenuOpen(false);
                                            haptics.warning();
                                            onDelete(e, task.id!);
                                        }}
                                        aria-label="حذف تسک"
                                        className="min-h-[40px] w-full flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                                    >
                                        <Trash2 size={14} />
                                        <span>حذف</span>
                                    </button>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>

                {/* Tactile Slide-to-Complete Action Bar */}
                <SlideToComplete
                    isCompleted={Boolean(isDone)}
                    onComplete={handleSlideComplete}
                />
            </motion.div>
        </div>
    );
});
TaskCard.displayName = 'TaskCard';
