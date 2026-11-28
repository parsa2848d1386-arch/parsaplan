import React, { useState, useMemo, useTransition, useRef, useEffect } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../context/StoreContext';
import { useUI } from '../context/UIContext';
import { SubjectTask } from '../types';
import { getLogicalDateKey } from '../utils/streakEngine';
import { addDays, toIsoString, getDiffDays, formatToPersianDigits, getShamsiDate } from '../utils';
import { DualColumn10MinuteGrid } from '../components/planner/DualColumn10MinuteGrid';
import { UnifiedTimeline } from '../components/planner/UnifiedTimeline';
import { CompactPageHero, HeroSegmentedTabs } from '../components/layout/CompactPageHero';
import TaskModal from '../components/TaskModal';
import {
    CalendarClock,
    Grid3X3,
    Sunrise,
    MoonStar,
    Plus,
    Users,
    SlidersHorizontal,
    ChevronDown,
} from 'lucide-react';
import { SPRING_SNAPPY } from '../utils/motionPresets';
import { haptics } from '../utils/haptics';

const PERSIAN_WEEKDAYS = ['شنبه', 'یکشنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنج‌شنبه', 'جمعه'] as const;
const PERSIAN_SHORT_WEEKDAYS = ['ش', '۱ش', '۲ش', '۳ش', '۴ش', '۵ش', 'ج'] as const;

type CategoryFilterKey = 'deep' | 'test' | 'fitness' | 'rest';

function getStreamCategoryChips(isAcademicStream: boolean): Array<{ key: CategoryFilterKey; label: string }> {
    if (isAcademicStream) {
        return [
            { key: 'deep', label: 'مطالعه عمیق' },
            { key: 'test', label: 'تست و آزمون' },
            { key: 'fitness', label: 'ورزش و ریکاوری' },
            { key: 'rest', label: 'استراحت پویا' },
        ];
    }
    return [
        { key: 'deep', label: 'کار عمیق' },
        { key: 'test', label: 'پروژه و جلسه' },
        { key: 'fitness', label: 'ورزش و سلامت' },
        { key: 'rest', label: 'استراحت و مرور' },
    ];
}

export const VisualPlanner: React.FC = () => {
    const prefersReducedMotion = useReducedMotion();
    const navigate = useNavigate();
    const {
        tasks,
        sessions,
        subjects,
        settings,
        startDate,
        currentDay,
        addTask,
        updateTask,
        studyMinutesByDate,
        isDemoActive,
        dismissDemoMode,
    } = useStore();
    const { setMorningModalOpen, setEveningModalOpen } = useUI();

    const cutoffHour = settings.dayCutoffHour ?? 5;
    const todayLogical = useMemo(() => getLogicalDateKey(new Date(), cutoffHour), [cutoffHour]);
    const currentStream = settings?.stream || 'life';
    const isAcademicStream = currentStream === 'riazi' || currentStream === 'tajrobi' || currentStream === 'ensani';

    const [selectedDate, setSelectedDate] = useState<string>(todayLogical);
    const [pendingDate, setPendingDate] = useState<string>(todayLogical);
    const [viewMode, setViewMode] = useState<'timeline' | 'grid'>('timeline');
    const [pendingViewMode, setPendingViewMode] = useState<'timeline' | 'grid'>('timeline');
    const [selectedCategory, setSelectedCategory] = useState<CategoryFilterKey | null>(null);
    const [isToolsMenuOpen, setIsToolsMenuOpen] = useState(false);
    const toolsMenuRef = useRef<HTMLDivElement>(null);
    const [, startTransition] = useTransition();

    useEffect(() => {
        if (!isToolsMenuOpen) return;
        const onOutside = (e: MouseEvent) => {
            if (toolsMenuRef.current && !toolsMenuRef.current.contains(e.target as Node)) {
                setIsToolsMenuOpen(false);
            }
        };
        document.addEventListener('mousedown', onOutside);
        return () => document.removeEventListener('mousedown', onOutside);
    }, [isToolsMenuOpen]);

    const handleSelectDate = (iso: string) => {
        haptics.selection();
        setPendingDate(iso);
        startTransition(() => setSelectedDate(iso));
    };

    const handleSelectViewMode = (mode: 'timeline' | 'grid') => {
        setPendingViewMode(mode);
        startTransition(() => setViewMode(mode));
    };

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingTask, setEditingTask] = useState<SubjectTask | null>(null);
    const [slotTimeDefault, setSlotTimeDefault] = useState<string>('09:00');

    const weekStrip = useMemo(() => {
        const baseDate = new Date(selectedDate + 'T12:00:00');
        const daysSinceSaturday = (baseDate.getDay() + 1) % 7;
        const weekSaturday = addDays(baseDate, -daysSinceSaturday);

        return Array.from({ length: 7 }, (_, i) => {
            const dObj = addDays(weekSaturday, i);
            const iso = toIsoString(dObj);
            const shamsiStr = getShamsiDate(iso);
            const dayNum = shamsiStr.split(' ')[0] || '';

            return {
                iso,
                weekday: PERSIAN_WEEKDAYS[i],
                shortWeekday: PERSIAN_SHORT_WEEKDAYS[i],
                dayNum: formatToPersianDigits(dayNum),
                isToday: iso === todayLogical,
                isSelected: iso === pendingDate,
            };
        });
    }, [selectedDate, pendingDate, todayLogical]);

    const handleOpenNewAtTime = (startTime: string) => {
        setEditingTask(null);
        setSlotTimeDefault(startTime);
        setIsModalOpen(true);
    };

    const handleEditTask = (task: SubjectTask) => {
        setEditingTask(task);
        setIsModalOpen(true);
    };

    const handleSaveTask = (taskData: Partial<SubjectTask>) => {
        if (editingTask) {
            updateTask({ ...editingTask, ...taskData } as SubjectTask);
        } else {
            const targetDate = taskData.date || selectedDate;
            const computedDayId = Math.max(1, getDiffDays(startDate, targetDate) + 1);
            const newTask: SubjectTask = {
                id: `task_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
                dayId: taskData.dayId || computedDayId,
                date: targetDate,
                subject: taskData.subject || subjects[0]?.name || 'شخصی',
                topic: taskData.topic || 'فعالیت زمان‌بندی‌شده',
                details: taskData.details || 'برنامه‌ریزی شده',
                isCompleted: !!taskData.isCompleted,
                status: taskData.status || 'todo',
                studyType: taskData.studyType || 'task',
                priority: taskData.priority || 'medium',
                startTime: taskData.startTime || slotTimeDefault,
                durationMinutes: taskData.durationMinutes ?? 60,
                isMIT: taskData.isMIT,
                blocks: taskData.blocks,
                testRange: taskData.testRange,
                isCustom: true,
            };
            addTask(newTask);
        }
    };

    const categoryMinutes = useMemo(() => {
        const dayTasks = tasks.filter((t) => t.date === selectedDate);
        const counts = { deep: 0, test: 0, fitness: 0, rest: 0 };
        dayTasks.forEach((t) => {
            const mins = t.durationMinutes || 60;
            const text = `${t.subject || ''} ${t.topic || ''} ${t.details || ''}`.toLowerCase();
            if (text.includes('ورزش') || text.includes('ریکاوری') || text.includes('باشگاه') || text.includes('پیاده‌روی')) {
                counts.fitness += mins;
            } else if (text.includes('استراحت') || text.includes('خواب') || text.includes('ناهار') || text.includes('شام') || text.includes('بین تایم')) {
                counts.rest += mins;
            } else if (t.studyType === 'exam' || t.studyType === 'project' || t.studyType === 'meeting' || text.includes('تست') || text.includes('آزمون')) {
                counts.test += mins;
            } else {
                counts.deep += mins;
            }
        });
        return counts;
    }, [tasks, selectedDate]);

    const formatChipHours = (mins: number) => {
        if (mins <= 0) return '';
        const hrs = Math.round((mins / 60) * 10) / 10;
        return mins >= 60 ? ` (${formatToPersianDigits(hrs)} س)` : ` (${formatToPersianDigits(mins)} د)`;
    };

    const selectedDaySessions = useMemo(
        () => sessions.filter((s) => (s.logicalDate || s.startedAt?.split('T')[0]) === selectedDate),
        [sessions, selectedDate]
    );

    const studyMinsToday = useMemo(() => {
        const fromStore = studyMinutesByDate?.[selectedDate];
        if (typeof fromStore === 'number' && fromStore > 0) return fromStore;
        const dayTasks = tasks.filter((t) => t.date === selectedDate && t.isCompleted);
        const taskMins = dayTasks.reduce((sum, t) => sum + (t.actualDuration || 0), 0);
        const sessionMins = selectedDaySessions.reduce((sum, s) => sum + Math.round((s.durationSeconds || 0) / 60), 0);
        return Math.max(taskMins, sessionMins);
    }, [studyMinutesByDate, selectedDate, tasks, selectedDaySessions]);

    const totalGoalMins = settings.dailyCapacityMinutes || 360;
    const progressPct = Math.min(100, Math.round((studyMinsToday / Math.max(1, totalGoalMins)) * 100));
    const categoryChips = useMemo(() => getStreamCategoryChips(isAcademicStream), [isAcademicStream]);

    return (
        <div className="flex flex-col w-full">
            <TaskModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSave={handleSaveTask}
                initialData={
                    editingTask ||
                    ({
                        startTime: slotTimeDefault,
                        durationMinutes: 60,
                        date: selectedDate,
                    } as SubjectTask)
                }
                currentDayId={currentDay || 1}
                defaultDateStr={selectedDate}
            />

            {/* ===== Adaptive Compact Gradient Hero (Matched with Dashboard & Top Capsules) ===== */}
            <CompactPageHero
                title="تایم‌لاین ۲۴ ساعته"
                subtitleBadge={
                    <span className="text-[11px] sm:text-xs bg-white/18 text-white px-2.5 py-0.5 rounded-full font-bold border border-white/20 tabular-nums">
                        {getShamsiDate(selectedDate)} · {formatToPersianDigits(progressPct)}٪ هدف
                    </span>
                }
                actionSlot={
                    <motion.button
                        type="button"
                        onClick={() => handleOpenNewAtTime('09:00')}
                        whileTap={prefersReducedMotion ? undefined : { scale: 0.94 }}
                        transition={SPRING_SNAPPY}
                        className="touch-target flex items-center justify-center gap-1.5 bg-white text-[var(--color-indigo-700)] dark:bg-white/95 dark:text-slate-900 px-3.5 py-2 rounded-full hover:brightness-95 transition shadow-md font-extrabold text-xs cursor-pointer min-h-[40px] whitespace-nowrap"
                    >
                        <Plus size={15} strokeWidth={2.6} aria-hidden="true" />
                        <span>ثبت بلوک جدید</span>
                    </motion.button>
                }
                bottomSlot={
                    <div className="flex flex-col gap-2.5">
                        {/* 7-Day Persian Strip inside Hero */}
                        <div className="grid grid-cols-7 gap-1 sm:gap-1.5">
                            {weekStrip.map((d) => (
                                <button
                                    key={d.iso}
                                    type="button"
                                    onClick={() => handleSelectDate(d.iso)}
                                    className={`min-h-[46px] py-1.5 px-1 rounded-xl transition-all flex flex-col items-center justify-center cursor-pointer ${
                                        d.isSelected
                                            ? 'bg-white text-[var(--color-indigo-700)] dark:text-slate-900 shadow-sm font-black'
                                            : d.isToday
                                              ? 'bg-white/25 text-white border border-white/30 font-bold'
                                              : 'bg-white/10 text-white/85 hover:bg-white/20 font-medium'
                                    }`}
                                >
                                    <span className="text-[11px] opacity-90 sm:hidden">
                                        {d.isToday ? 'امروز' : d.shortWeekday}
                                    </span>
                                    <span className="hidden sm:inline text-[11px] opacity-90">
                                        {d.isToday ? 'امروز' : d.weekday}
                                    </span>
                                    <span className="text-xs sm:text-sm font-extrabold tabular-nums">{d.dayNum}</span>
                                </button>
                            ))}
                        </div>

                        {/* View Switcher Segmented Control */}
                        <HeroSegmentedTabs
                            layoutId="planner-view-tabs"
                            ariaLabel="نمای برنامه‌ریز"
                            value={pendingViewMode}
                            onChange={handleSelectViewMode}
                            items={[
                                { id: 'timeline', label: 'تایم‌لاین تعاملی', icon: CalendarClock },
                                { id: 'grid', label: 'گرید ۱۰ دقیقه‌ای YPT', icon: Grid3X3 },
                            ]}
                        />
                    </div>
                }
            />

            {/* ===== Main Full-Width Body ===== */}
            <div className="p-3 xs:p-4 sm:p-5 md:p-6 lg:p-8 flex flex-col gap-3.5 sm:gap-5 w-full max-app-container mx-auto">
                {isDemoActive && (
                    <div className="flex flex-wrap items-center justify-between gap-3 squircle-card px-4 py-2.5 bg-[var(--surface-elevated)] border border-[var(--border-subtle)] text-xs text-[var(--text-secondary)]">
                        <div className="flex items-center gap-2.5 min-w-0">
                            <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" aria-hidden="true" />
                            <span className="font-bold text-on-surface shrink-0">پیش‌نمایش نمونه</span>
                            <span aria-hidden="true" className="text-[var(--text-muted)]">·</span>
                            <span className="font-medium truncate sm:whitespace-normal">
                                روی هر ساعت کلیک کنید تا اولین بلوک زمانی واقعی خود را ثبت کنید.
                            </span>
                        </div>
                        {dismissDemoMode && (
                            <button
                                type="button"
                                onClick={dismissDemoMode}
                                className="px-3 min-h-[34px] rounded-xl bg-surface-container-low hover:bg-surface-container text-on-surface font-bold transition-colors cursor-pointer shrink-0"
                            >
                                بستن پیش‌نمایش
                            </button>
                        )}
                    </div>
                )}

                {/* Unified Single Filter & Tools Row */}
                <div className="flex items-center justify-between gap-2">
                    <div
                        className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5 text-xs flex-1 min-w-0"
                        role="group"
                        aria-label="فیلتر دسته‌بندی فعالیت‌ها"
                    >
                        <button
                            type="button"
                            aria-pressed={selectedCategory === null}
                            onClick={() => {
                                haptics.selection();
                                setSelectedCategory(null);
                            }}
                            className={`min-h-[38px] px-3 py-1.5 rounded-full font-bold shrink-0 transition-colors cursor-pointer whitespace-nowrap ${
                                selectedCategory === null
                                    ? 'bg-primary text-on-primary shadow-xs'
                                    : 'bg-[var(--surface-elevated)] text-[var(--text-secondary)] border border-[var(--border-subtle)] hover:text-on-surface'
                            }`}
                        >
                            همه
                        </button>
                        {categoryChips.map((chip) => {
                            const active = selectedCategory === chip.key;
                            return (
                                <button
                                    key={chip.key}
                                    type="button"
                                    aria-pressed={active}
                                    onClick={() => {
                                        haptics.selection();
                                        setSelectedCategory(active ? null : chip.key);
                                    }}
                                    className={`min-h-[38px] px-3 py-1.5 rounded-full font-bold shrink-0 transition-colors cursor-pointer whitespace-nowrap ${
                                        active
                                            ? 'bg-primary text-on-primary shadow-xs'
                                            : 'bg-[var(--surface-elevated)] text-[var(--text-secondary)] border border-[var(--border-subtle)] hover:text-on-surface'
                                    }`}
                                >
                                    {chip.label}
                                    {formatChipHours(categoryMinutes[chip.key])}
                                </button>
                            );
                        })}
                    </div>

                    {/* Consolidated Rituals & Room Quick Menu (Declutters Top Bars) */}
                    <div className="relative shrink-0" ref={toolsMenuRef}>
                        <button
                            type="button"
                            onClick={() => {
                                haptics.selection();
                                setIsToolsMenuOpen((v) => !v);
                            }}
                            aria-expanded={isToolsMenuOpen}
                            className="min-h-[38px] px-3 py-1.5 rounded-full bg-[var(--surface-elevated)] border border-[var(--border-subtle)] text-xs font-bold text-on-surface flex items-center gap-1.5 hover:bg-surface-container-low transition cursor-pointer whitespace-nowrap"
                        >
                            <SlidersHorizontal size={14} className="text-primary" aria-hidden="true" />
                            <span>آیین و ابزار</span>
                            <ChevronDown size={13} className={`transition-transform ${isToolsMenuOpen ? 'rotate-180' : ''}`} />
                        </button>

                        <AnimatePresence>
                            {isToolsMenuOpen && (
                                <motion.div
                                    initial={prefersReducedMotion ? false : { opacity: 0, y: -6, scale: 0.96 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    exit={{ opacity: 0, y: -4, scale: 0.96 }}
                                    transition={{ duration: 0.14 }}
                                    className="absolute left-0 mt-2 w-56 squircle-md bg-[var(--surface-elevated)] border border-[var(--border-subtle)] shadow-xl p-1.5 z-30 flex flex-col gap-1"
                                >
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setIsToolsMenuOpen(false);
                                            setMorningModalOpen(true);
                                        }}
                                        className="w-full min-h-[40px] px-3 rounded-xl text-xs font-bold text-on-surface hover:bg-surface-container-low flex items-center gap-2 cursor-pointer"
                                    >
                                        <Sunrise size={15} className="text-sky-500" aria-hidden="true" />
                                        <span>شروع صبح و هدف‌گذاری</span>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setIsToolsMenuOpen(false);
                                            setEveningModalOpen(true);
                                        }}
                                        className="w-full min-h-[40px] px-3 rounded-xl text-xs font-bold text-on-surface hover:bg-surface-container-low flex items-center gap-2 cursor-pointer"
                                    >
                                        <MoonStar size={15} className="text-primary" aria-hidden="true" />
                                        <span>جمع‌بندی شبانه</span>
                                    </button>
                                    <div className="h-px bg-[var(--border-subtle)] my-0.5" />
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setIsToolsMenuOpen(false);
                                            navigate('/leaderboard');
                                        }}
                                        className="w-full min-h-[40px] px-3 rounded-xl text-xs font-bold text-primary hover:bg-primary/10 flex items-center gap-2 cursor-pointer"
                                    >
                                        <Users size={15} aria-hidden="true" />
                                        <span>اتاق‌های هم‌مطالعه زنده</span>
                                    </button>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>

                {/* Full-Width Timeline Canvas or 10-Min Grid */}
                {viewMode === 'timeline' ? (
                    <UnifiedTimeline
                        logicalDate={selectedDate}
                        tasks={tasks}
                        sessions={sessions}
                        cutoffHour={cutoffHour}
                        selectedCategory={selectedCategory}
                        onAddAtHour={handleOpenNewAtTime}
                        onEditTask={handleEditTask}
                    />
                ) : (
                    <DualColumn10MinuteGrid
                        logicalDate={selectedDate}
                        tasks={tasks}
                        sessions={sessions}
                        subjects={subjects}
                        cutoffHour={cutoffHour}
                        selectedCategory={selectedCategory}
                        onSelectSlotTime={handleOpenNewAtTime}
                        onSelectTask={handleEditTask}
                    />
                )}
            </div>
        </div>
    );
};

export default VisualPlanner;
