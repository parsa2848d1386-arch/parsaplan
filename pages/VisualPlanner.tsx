import React, { useState, useMemo, useTransition } from 'react';
import { motion, LayoutGroup, useReducedMotion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../context/StoreContext';
import { useUI } from '../context/UIContext';
import { SubjectTask } from '../types';
import { getLogicalDateKey } from '../utils/streakEngine';
import { addDays, toIsoString, getFullShamsiDate, getDiffDays, formatToPersianDigits, getShamsiDate } from '../utils';
import { DualColumn10MinuteGrid } from '../components/planner/DualColumn10MinuteGrid';
import { UnifiedTimeline } from '../components/planner/UnifiedTimeline';
import TaskModal from '../components/TaskModal';
import {
    CalendarClock, ChevronRight, ChevronLeft, Grid3X3, ListFilter,
    Sunrise, MoonStar, Sparkles, Plus, Clock, Users, Flame,
    Brain, CheckCircle2, TrendingUp, ZoomIn, Eye, Activity,
    ShieldAlert, Play, Check
} from 'lucide-react';
import { SPRING_SNAPPY } from '../utils/motionPresets';
import { haptics } from '../utils/haptics';

const PERSIAN_WEEKDAYS = ['شنبه', 'یکشنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنج‌شنبه', 'جمعه'] as const;

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
        moods,
        userName,
        isDemoActive,
        dismissDemoMode,
    } = useStore();
    const { setMorningModalOpen, setEveningModalOpen } = useUI();

    const cutoffHour = settings.dayCutoffHour ?? 5;
    const todayLogical = useMemo(() => getLogicalDateKey(new Date(), cutoffHour), [cutoffHour]);

    const [selectedDate, setSelectedDate] = useState<string>(todayLogical);
    const [pendingDate, setPendingDate] = useState<string>(todayLogical);
    const [viewMode, setViewMode] = useState<'timeline' | 'grid'>('timeline');
    const [pendingViewMode, setPendingViewMode] = useState<'timeline' | 'grid'>('timeline');
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
    const [, startTransition] = useTransition();

    const handleSelectDate = (iso: string) => {
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

    // 7-day Persian ribbon around selectedDate
    const weekStrip = useMemo(() => {
        const baseDate = new Date(selectedDate + 'T12:00:00');
        const daysSinceSaturday = (baseDate.getDay() + 1) % 7;
        const weekSaturday = addDays(baseDate, -daysSinceSaturday);

        return Array.from({ length: 7 }, (_, i) => {
            const dObj = addDays(weekSaturday, i);
            const iso = toIsoString(dObj);
            const dayTasks = tasks.filter((t) => t.date === iso);
            const totalMins = dayTasks.reduce((sum, t) => sum + (t.durationMinutes ?? 60), 0);
            const doneCount = dayTasks.filter((t) => t.isCompleted).length;
            const weekday = PERSIAN_WEEKDAYS[i];
            const shamsiStr = getShamsiDate(iso);
            const dayNum = shamsiStr.split(' ')[0] || '';

            return {
                iso,
                weekday,
                dayNum: formatToPersianDigits(dayNum),
                count: dayTasks.length,
                doneCount,
                hours: Math.round((totalMins / 60) * 10) / 10,
                isToday: iso === todayLogical,
                isSelected: iso === pendingDate,
            };
        });
    }, [selectedDate, pendingDate, todayLogical, tasks]);

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

    // Real category minute totals for selectedDate
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
            } else if (t.studyType === 'exam' || text.includes('تست') || text.includes('آزمون')) {
                counts.test += mins;
            } else {
                counts.deep += mins;
            }
        });
        return counts;
    }, [tasks, selectedDate]);

    const formatCategoryChipDuration = (mins: number) => {
        if (mins <= 0) return '';
        if (mins >= 60) {
            const hrs = Math.round((mins / 60) * 10) / 10;
            return ` (${formatToPersianDigits(hrs)} ساعت)`;
        }
        return ` (${formatToPersianDigits(mins)} دقیقه)`;
    };

    // Calculate daily logged study metrics dynamically (strict zero when no data)
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

    const studyHoursFormatted = useMemo(() => {
        const h = Math.floor(studyMinsToday / 60);
        const m = studyMinsToday % 60;
        return `${formatToPersianDigits(String(h).padStart(2, '0'))}:${formatToPersianDigits(String(m).padStart(2, '0'))}`;
    }, [studyMinsToday]);

    const goalHoursFormatted = useMemo(() => {
        const h = Math.floor(totalGoalMins / 60);
        const m = totalGoalMins % 60;
        return `${formatToPersianDigits(String(h).padStart(2, '0'))}:${formatToPersianDigits(String(m).padStart(2, '0'))}`;
    }, [totalGoalMins]);

    const remainingMins = Math.max(0, totalGoalMins - studyMinsToday);
    const remainingText = useMemo(() => {
        if (remainingMins === 0) return 'هدف امروز محقق شد!';
        const h = Math.floor(remainingMins / 60);
        const m = remainingMins % 60;
        if (h > 0 && m > 0) return `${formatToPersianDigits(h)} ساعت و ${formatToPersianDigits(m)} دقیقه`;
        if (h > 0) return `${formatToPersianDigits(h)} ساعت`;
        return `${formatToPersianDigits(m)} دقیقه`;
    }, [remainingMins]);

    // Real session stats (interruptions, pomodoro cycles, all-time record, monthly average)
    const interruptionTotal = useMemo(
        () => selectedDaySessions.reduce((sum, s) => sum + (s.interruptionCount || 0), 0),
        [selectedDaySessions]
    );
    const pomodoroCycles = useMemo(() => {
        const explicitPomos = selectedDaySessions.filter((s) => s.mode === 'pomodoro').length;
        if (explicitPomos > 0) return explicitPomos;
        const unit = Math.max(15, settings.pomodoroWorkMinutes || 25);
        return Math.floor(studyMinsToday / unit);
    }, [selectedDaySessions, studyMinsToday, settings.pomodoroWorkMinutes]);

    const { bestRecordHours, monthAvgHours } = useMemo(() => {
        const entries = Object.entries(studyMinutesByDate || {}) as [string, number][];
        const maxMins = entries.reduce((mx, [, val]) => Math.max(mx, val || 0), studyMinsToday);
        const monthPrefix = selectedDate.slice(0, 7);
        const monthEntries = entries.filter(([dt, val]) => dt.startsWith(monthPrefix) && (val || 0) > 0);
        const avgMins =
            monthEntries.length > 0
                ? monthEntries.reduce((sum, [, val]) => sum + val, 0) / monthEntries.length
                : studyMinsToday;
        return {
            bestRecordHours: Math.round((maxMins / 60) * 10) / 10,
            monthAvgHours: Math.round((avgMins / 60) * 10) / 10,
        };
    }, [studyMinutesByDate, selectedDate, studyMinsToday]);

    // Real Bio-Circadian advice driven by logged mood, chronotype, and today's study load
    const circadianAdvice = useMemo(() => {
        const mood = moods?.[selectedDate];
        const chrono = settings.chronotype || 'balanced';
        if (mood === 'exhausted' || mood === 'tired') {
            return 'بر اساس مود خستگی ثبت‌شده برای این روز، بهتر است بخش‌های سنگین را به بلوک‌های کوتاه ۲۵ دقیقه‌ای با استراحت ۱۰ دقیقه‌ای تقسیم کنید.';
        }
        if (studyMinsToday >= 240) {
            return `تا این لحظه ${studyHoursFormatted} مطالعه ثبت کرده‌اید؛ برای حفظ کارایی حافظه، بین بلوک‌های بعدی ۱۵ دقیقه استراحت بدون صفحه‌نمایش در نظر بگیرید.`;
        }
        if (chrono === 'early_bird') {
            return 'با توجه به الگوی سحرخیز شما، بهترین بازده برای دروس تحلیلی و تست‌های زمان‌دار در ساعات اولیه صبح است.';
        }
        if (chrono === 'night_owl') {
            return 'با توجه به الگوی شب‌زنده‌دار شما، بلوک‌های عصر و شب بیشترین عمق تمرکز را دارند؛ مرورهای سبک‌تر را در ساعات قبل از ظهر بگذارید.';
        }
        return 'برای تنظیم دقیق‌تر ریتم تمرکز، زمان شروع تسک‌های کلیدی را روی تایم‌لاین بچینید و مود روزانه خود را در داشبورد ثبت کنید.';
    }, [moods, selectedDate, settings.chronotype, studyMinsToday, studyHoursFormatted]);

    return (
        <div className="p-3 xs:p-4 sm:p-5 md:p-6 lg:p-8 flex flex-col gap-4 sm:gap-6 w-full max-app-container">
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

            {/* Task Modal */}
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

            {/* ===== Top Interactive Control Bar ===== */}
            <section className="bento-card-interactive w-full bg-surface-container-lowest dark:bg-slate-900 squircle-lg p-3 sm:p-4 shadow-sm border border-outline-variant/20 flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 sm:gap-4">
                {/* Weekday Ribbon */}
                <div className="grid grid-cols-7 gap-1 lg:flex lg:items-center lg:gap-1.5">
                    {weekStrip.map((d) => {
                        const shortWeekday =
                            d.weekday === 'شنبه'
                                ? 'ش'
                                : d.weekday === 'یکشنبه'
                                  ? '۱ش'
                                  : d.weekday === 'دوشنبه'
                                    ? '۲ش'
                                    : d.weekday === 'سه‌شنبه'
                                      ? '۳ش'
                                      : d.weekday === 'چهارشنبه'
                                        ? '۴ش'
                                        : d.weekday === 'پنج‌شنبه'
                                          ? '۵ش'
                                          : 'ج';
                        return (
                            <button
                                key={d.iso}
                                type="button"
                                onClick={() => handleSelectDate(d.iso)}
                                className={`touch-target px-1 sm:px-3 py-2 rounded-xl transition-colors duration-150 flex flex-col items-center justify-center min-w-0 lg:min-w-[4.2rem] cursor-pointer min-h-[48px] ${
                                    d.isSelected
                                        ? 'bg-primary text-on-primary shadow-sm font-bold'
                                        : d.isToday
                                          ? 'bg-primary-container text-on-primary-container font-semibold'
                                          : 'text-on-surface-variant dark:text-gray-400 hover:bg-surface-container dark:hover:bg-slate-800'
                                }`}
                            >
                                <span className="text-[10px] sm:text-[11px] opacity-90 sm:hidden">
                                    {d.isToday ? 'امروز' : shortWeekday}
                                </span>
                                <span className="hidden sm:inline text-[11px] opacity-90">
                                    {d.isToday ? 'امروز' : d.weekday}
                                </span>
                                <span className="text-xs sm:text-sm font-bold tabular-nums">{d.dayNum}</span>
                            </button>
                        );
                    })}
                </div>

                {/* Segment Switcher & View Pills */}
                <div className="flex items-center gap-2 flex-wrap">
                    <LayoutGroup id="planner-view-tabs">
                        <div
                            role="tablist"
                            aria-label="نمای برنامه‌ریز"
                            className="flex items-center bg-surface-container-high p-1 squircle-sm text-xs overflow-x-auto no-scrollbar"
                        >
                            {[
                                { id: 'timeline' as const, label: 'تایم‌لاین تعاملی', icon: CalendarClock },
                                { id: 'grid' as const, label: 'گرید ۱۰ دقیقه‌ای YPT', icon: Grid3X3 },
                            ].map((tab) => {
                                const TabIcon = tab.icon;
                                const isSelected = pendingViewMode === tab.id;
                                return (
                                    <button
                                        key={tab.id}
                                        type="button"
                                        role="tab"
                                        aria-selected={isSelected}
                                        onClick={() => {
                                            haptics.selection();
                                            handleSelectViewMode(tab.id);
                                        }}
                                        className={`relative touch-target px-3 py-1.5 rounded-xl font-semibold flex items-center gap-1.5 transition-colors duration-150 min-h-[40px] cursor-pointer whitespace-nowrap ${
                                            isSelected
                                                ? 'text-primary font-bold'
                                                : 'text-[var(--text-secondary)] hover:text-on-surface'
                                        }`}
                                    >
                                        {isSelected && (
                                            <motion.span
                                                layoutId="plannerViewActivePill"
                                                transition={prefersReducedMotion ? { duration: 0 } : SPRING_SNAPPY}
                                                aria-hidden="true"
                                                className="absolute inset-0 rounded-xl bg-[var(--surface-elevated)] shadow-xs"
                                            />
                                        )}
                                        <TabIcon size={16} className="relative z-10" aria-hidden="true" />
                                        <span className="relative z-10">{tab.label}</span>
                                    </button>
                                );
                            })}
                        </div>
                    </LayoutGroup>

                    <button
                        type="button"
                        onClick={() => handleOpenNewAtTime('09:00')}
                        className="touch-target px-4 rounded-xl bg-primary text-on-primary font-bold text-xs flex items-center gap-1.5 hover:brightness-110 transition-all shadow-xs active:scale-[0.98] cursor-pointer min-h-[44px] whitespace-nowrap"
                    >
                        <Plus size={18} aria-hidden="true" />
                        <span>ثبت بلوک جدید</span>
                    </button>
                </div>
            </section>

            {/* ===== Category Filter Chips Bar (Dynamic Durations) ===== */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar text-xs" role="group" aria-label="فیلتر دسته‌بندی فعالیت‌ها">
                <span className="text-[var(--text-secondary)] pe-1 whitespace-nowrap font-medium">
                    فیلتر فعالیت‌ها:
                </span>
                <button
                    type="button"
                    aria-pressed={selectedCategory === 'deep'}
                    onClick={() => setSelectedCategory(selectedCategory === 'deep' ? null : 'deep')}
                    className={`touch-target px-3.5 py-1.5 rounded-full font-bold flex items-center gap-1.5 transition-all shrink-0 min-h-[40px] cursor-pointer whitespace-nowrap ${
                        selectedCategory === 'deep'
                            ? 'bg-primary text-on-primary shadow-xs'
                            : 'bg-primary-fixed/50 text-on-primary-fixed hover:bg-primary-fixed'
                    }`}
                >
                    <span>مطالعه عمیق تخصصی{formatCategoryChipDuration(categoryMinutes.deep)}</span>
                </button>
                <button
                    type="button"
                    aria-pressed={selectedCategory === 'test'}
                    onClick={() => setSelectedCategory(selectedCategory === 'test' ? null : 'test')}
                    className={`touch-target px-3.5 py-1.5 rounded-full font-bold flex items-center gap-1.5 transition-all shrink-0 min-h-[40px] cursor-pointer whitespace-nowrap ${
                        selectedCategory === 'test'
                            ? 'bg-secondary text-on-secondary shadow-xs'
                            : 'bg-[var(--surface-elevated)] text-[var(--text-secondary)] hover:bg-surface-container border border-[var(--border-subtle)]'
                    }`}
                >
                    <span>تست‌زنی و تحلیل{formatCategoryChipDuration(categoryMinutes.test)}</span>
                </button>
                <button
                    type="button"
                    aria-pressed={selectedCategory === 'fitness'}
                    onClick={() => setSelectedCategory(selectedCategory === 'fitness' ? null : 'fitness')}
                    className={`touch-target px-3.5 py-1.5 rounded-full font-bold flex items-center gap-1.5 transition-all shrink-0 min-h-[40px] cursor-pointer whitespace-nowrap ${
                        selectedCategory === 'fitness'
                            ? 'bg-tertiary text-on-tertiary shadow-xs'
                            : 'bg-[var(--surface-elevated)] text-[var(--text-secondary)] hover:bg-surface-container border border-[var(--border-subtle)]'
                    }`}
                >
                    <span>ورزش و ریکاوری{formatCategoryChipDuration(categoryMinutes.fitness)}</span>
                </button>
                <button
                    type="button"
                    aria-pressed={selectedCategory === 'rest'}
                    onClick={() => setSelectedCategory(selectedCategory === 'rest' ? null : 'rest')}
                    className={`touch-target px-3.5 py-1.5 rounded-full font-bold flex items-center gap-1.5 transition-all shrink-0 min-h-[40px] cursor-pointer whitespace-nowrap ${
                        selectedCategory === 'rest'
                            ? 'bg-outline text-white shadow-xs'
                            : 'bg-[var(--surface-elevated)] text-[var(--text-secondary)] hover:bg-surface-container border border-[var(--border-subtle)]'
                    }`}
                >
                    <span>استراحت پویا{formatCategoryChipDuration(categoryMinutes.rest)}</span>
                </button>
            </div>

            {/* ===== Main Grid Section: 8 Cols Left / 4 Cols Right ===== */}
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-gutter-desktop items-start">
                {/* Left / Main Wide Panel: 24-Hour Visual Timeline (8 Cols on XL) */}
                <div className="xl:col-span-8 flex flex-col gap-space-md">
                    {/* Header meta bar */}
                    <div className="bg-[var(--surface-elevated)] squircle-card p-3.5 sm:p-4 shadow-xs border border-[var(--border-subtle)] flex items-center justify-between flex-wrap gap-2">
                        <div className="flex items-center gap-2">
                            <CalendarClock size={18} className="text-primary shrink-0" aria-hidden="true" />
                            <h2 className="text-sm sm:text-base font-bold text-on-surface">برنامه پیوسته شبانه‌روزی</h2>
                            <span className="text-xs text-[var(--text-secondary)] font-medium">
                                · ۲۴ ساعته هوشمند
                            </span>
                        </div>
                        <div className="flex items-center gap-1.5 text-xs">
                            <button
                                type="button"
                                onClick={() => setMorningModalOpen(true)}
                                className="min-h-[40px] px-3 py-1.5 rounded-xl bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300 hover:bg-sky-100 dark:hover:bg-sky-900/50 transition flex items-center gap-1.5 font-bold cursor-pointer"
                            >
                                <Sunrise size={14} aria-hidden="true" />
                                شروع صبح
                            </button>
                            <button
                                type="button"
                                onClick={() => setEveningModalOpen(true)}
                                className="min-h-[40px] px-3 py-1.5 rounded-xl bg-primary-fixed/50 text-on-primary-fixed hover:bg-primary-fixed transition flex items-center gap-1.5 font-bold cursor-pointer"
                            >
                                <MoonStar size={14} aria-hidden="true" />
                                جمع‌بندی شبانه
                            </button>
                        </div>
                    </div>

                    {/* Timeline View Canvas or Grid */}
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

                {/* Right Side Panel: Live Room Link & Real Daily Metrics Widgets (4 Cols on XL) */}
                <div className="xl:col-span-4 flex flex-col gap-4">
                    {/* Widget 1: Live Study Room Hub (Clean Opaque Surface) */}
                    <div className="w-full squircle-lg shadow-xs bg-[var(--surface-elevated)] p-5 flex flex-col gap-3.5 border border-[var(--border-subtle)]">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-primary">
                                اتاق‌های مطالعه <bdi>YPT</bdi>
                            </span>
                            <span className="text-xs text-[var(--text-secondary)] font-medium">همگام‌سازی زنده</span>
                        </div>

                        <div className="flex flex-col gap-1">
                            <h3 className="text-base font-bold text-on-surface">میز مطالعه مجازی و رقابت زنده</h3>
                            <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                                {userName ? `${userName}، ` : ''}به اتاق‌های مطالعه آنلاین بپیوندید تا ساعت مطالعه امروز ({studyHoursFormatted}) به‌صورت زنده با هم‌تیمی‌ها همگام شود.
                            </p>
                        </div>

                        <div className="flex items-center justify-between p-3 rounded-xl bg-surface-container-low text-on-surface text-xs">
                            <span className="font-semibold">ثبت امروز شما:</span>
                            <span className="font-bold text-secondary tabular-nums" dir="ltr">{studyHoursFormatted}</span>
                        </div>

                        <button
                            type="button"
                            onClick={() => navigate('/leaderboard')}
                            className="w-full min-h-[44px] py-2.5 px-4 rounded-xl bg-primary text-on-primary hover:brightness-110 font-bold text-xs flex items-center justify-center gap-2 shadow-xs transition-all active:scale-[0.99] cursor-pointer"
                        >
                            <Users size={16} aria-hidden="true" />
                            <span>ورود مستقیم به میز مطالعه مجازی</span>
                        </button>
                    </div>

                    {/* Widget 2: Total Logged Time Radial Summary Gauge */}
                    <div className="bg-[var(--surface-elevated)] squircle-lg p-space-lg shadow-sm border border-[var(--border-subtle)] flex flex-col gap-space-md">
                        <div className="flex items-center justify-between">
                            <h4 className="font-headline-md text-sm font-bold text-on-surface">تحقق هدف کل امروز</h4>
                            <span className="font-label-sm text-xs text-secondary bg-secondary-container/40 px-space-xs py-0.5 rounded-full font-bold">
                                {formatToPersianDigits(progressPct)}٪ مسیر
                            </span>
                        </div>

                        <div className="flex items-center justify-around py-space-xs">
                            {/* Radial Inline SVG Chart */}
                            <div className="relative w-36 h-36 flex items-center justify-center">
                                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                                    <circle className="text-surface-container-high dark:text-slate-800 fill-none" cx="50" cy="50" r="40" stroke="currentColor" strokeWidth="8" />
                                    <circle
                                        className="text-secondary fill-none transition-all duration-1000"
                                        cx="50" cy="50" r="40"
                                        stroke="currentColor"
                                        strokeDasharray="251.3"
                                        strokeDashoffset={251.3 - (251.3 * (progressPct / 100))}
                                        strokeLinecap="round"
                                        strokeWidth="8"
                                    />
                                </svg>
                                <div className="absolute flex flex-col items-center">
                                    <span className="font-display-lg text-lg font-bold text-on-surface">{studyHoursFormatted}</span>
                                    <span className="font-label-sm text-xs text-[var(--text-secondary)]">از {goalHoursFormatted} ساعت</span>
                                </div>
                            </div>

                            {/* Mini Indicators breakdown */}
                            <div className="flex flex-col gap-space-sm text-xs">
                                <div className="flex flex-col">
                                    <span className="font-label-sm text-xs text-[var(--text-secondary)]">زمان باقی‌مانده</span>
                                    <span className="font-label-md font-bold text-on-surface">{remainingText}</span>
                                </div>
                                <div className="flex flex-col">
                                    <span className="font-label-sm text-xs text-[var(--text-secondary)]">تعداد دفعات گسست</span>
                                    <span className="font-label-md font-bold text-secondary">
                                        {interruptionTotal === 0 ? 'بدون گسست' : `${formatToPersianDigits(interruptionTotal)} بار`}
                                    </span>
                                </div>
                                <div className="flex flex-col">
                                    <span className="font-label-sm text-xs text-[var(--text-secondary)]">چرخه پومودورو</span>
                                    <span className="font-label-md font-bold text-primary">
                                        {formatToPersianDigits(pomodoroCycles)} چرخه
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-space-sm pt-space-xs text-xs">
                            <div className="bg-surface-container-low rounded-lg p-space-sm flex flex-col items-center">
                                <span className="font-label-sm text-xs text-[var(--text-secondary)]">بالاترین رکورد</span>
                                <span className="font-headline-md text-sm font-bold text-primary">{formatToPersianDigits(bestRecordHours)} ساعت</span>
                            </div>
                            <div className="bg-surface-container-low rounded-lg p-space-sm flex flex-col items-center">
                                <span className="font-label-sm text-xs text-[var(--text-secondary)]">میانگین ماه</span>
                                <span className="font-headline-md text-sm font-bold text-secondary">{formatToPersianDigits(monthAvgHours)} ساعت</span>
                            </div>
                        </div>
                    </div>

                    {/* Widget 3: AI Circadian Rhythm & Energy Suggestion Banner */}
                    <div className="bg-gradient-to-r from-tertiary-fixed/40 via-surface-container-lowest to-surface-container-low dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 squircle-card p-space-md shadow-sm border border-[var(--border-subtle)] flex items-start gap-space-md relative overflow-hidden">
                        <div className="w-10 h-10 rounded-xl bg-tertiary-container text-on-tertiary-container flex items-center justify-center shrink-0 shadow-sm">
                            <Brain size={22} />
                        </div>
                        <div className="flex flex-col gap-1 text-xs">
                            <span className="font-label-md font-bold text-tertiary">پیشنهاد هوشمند ریتم زیستی</span>
                            <p className="font-body-sm text-xs text-[var(--text-secondary)] leading-relaxed">
                                {circadianAdvice}
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default VisualPlanner;
