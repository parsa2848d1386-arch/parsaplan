import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { useStore } from '../context/StoreContext';
import {
    Plus, Clock, Zap, TrendingUp, CheckCircle2, Flame,
    Play, ChevronRight, ChevronLeft, GitCompare,
    Sparkles, Calendar, Users, AlertCircle, Headphones
} from 'lucide-react';
import { getShamsiDate, toIsoString, addDays, parseDate, formatToPersianDigits } from '../utils';
import { getLogicalDateKey } from '../utils/streakEngine';
import { TaskCard } from '../components/TaskCard';
import TaskModal from '../components/TaskModal';
import { SubjectTask, isSpecializedSubject, MoodType } from '../types';
import { WelcomeBanner } from '../components/WelcomeBanner';
import { WeekCalendarStrip } from '../components/dashboard/WeekCalendarStrip';
import { getTimeOfDayGreeting } from '../utils/designSystemHelpers';
import { haptics } from '../utils/haptics';
import {
    SQUASH_STRETCH_KEYFRAMES,
    STAGGER_CONTAINER_VARIANTS,
    STAGGER_ITEM_VARIANTS,
    TRANSITION_SQUASH,
} from '../utils/motionPresets';
import { PeakEndCheckmark, TactileDepthCard } from '../components/ui/MotionPrimitives';

/* ===== 5 Custom Vector SVG Icons for Today's Mood (No Text Emojis) ===== */
const IconMoodExcellent: React.FC<{ className?: string }> = ({ className = "w-6 h-6" }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="4" fill="currentColor" fillOpacity="0.2" />
        <path d="M12 2v2.5" />
        <path d="M12 19.5V22" />
        <path d="m4.93 4.93 1.77 1.77" />
        <path d="m17.3 17.3 1.77 1.77" />
        <path d="M2 12h2.5" />
        <path d="M19.5 12H22" />
        <path d="m6.7 17.3-1.77 1.77" />
        <path d="m19.07 4.93-1.77 1.77" />
        <circle cx="12" cy="12" r="7" strokeDasharray="2 3" opacity="0.6" />
    </svg>
);

const IconMoodHighEnergy: React.FC<{ className?: string }> = ({ className = "w-6 h-6" }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z" fill="currentColor" fillOpacity="0.25" />
        <path d="m16 4 3 3" opacity="0.7" />
        <path d="m5 17 3 3" opacity="0.7" />
    </svg>
);

const IconMoodNormal: React.FC<{ className?: string }> = ({ className = "w-6 h-6" }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="9" />
        <line x1="8" y1="12" x2="16" y2="12" strokeWidth="2.5" />
        <circle cx="12" cy="12" r="1.5" fill="currentColor" />
        <circle cx="8" cy="9" r="1" fill="currentColor" />
        <circle cx="16" cy="9" r="1" fill="currentColor" />
    </svg>
);

const IconMoodTired: React.FC<{ className?: string }> = ({ className = "w-6 h-6" }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect width="16" height="10" x="2" y="7" rx="2" />
        <line x1="22" x2="22" y1="11" y2="13" strokeWidth="2.5" />
        <path d="M6 11v2" strokeWidth="2.5" stroke="currentColor" />
        <path d="M12 4l-2 3" opacity="0.7" />
        <path d="M16 4l-1 2" opacity="0.7" />
    </svg>
);

const IconMoodExhausted: React.FC<{ className?: string }> = ({ className = "w-6 h-6" }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect width="16" height="10" x="2" y="7" rx="2" />
        <line x1="22" x2="22" y1="11" y2="13" strokeWidth="2.5" />
        <path d="M10 10.5v3" stroke="currentColor" strokeWidth="2" />
        <circle cx="10" cy="15" r="0.75" fill="currentColor" />
        <path d="m14 3-2 3" opacity="0.7" />
    </svg>
);

const MOOD_LEVELS = [
    {
        id: 'excellent' as MoodType,
        label: 'عالی',
        subLabel: 'انرژی ۱۰۰٪',
        Icon: IconMoodExcellent,
        themeActive: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/50 ring-2 ring-amber-500/30 shadow-sm',
        themeDefault: 'bg-surface-container-low dark:bg-slate-800 text-[var(--text-secondary)] hover:bg-amber-500/10 hover:text-amber-500 border-outline-variant/20',
        iconColor: 'text-amber-500',
    },
    {
        id: 'high-energy' as MoodType,
        label: 'خوب/پرانرژی',
        subLabel: 'جریان غرقه‌گی',
        Icon: IconMoodHighEnergy,
        themeActive: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/50 ring-2 ring-emerald-500/30 shadow-sm',
        themeDefault: 'bg-surface-container-low dark:bg-slate-800 text-[var(--text-secondary)] hover:bg-emerald-500/10 hover:text-emerald-500 border-outline-variant/20',
        iconColor: 'text-emerald-500',
    },
    {
        id: 'normal' as MoodType,
        label: 'معمولی',
        subLabel: 'ریتم متعادل',
        Icon: IconMoodNormal,
        themeActive: 'bg-sky-500/15 text-sky-600 dark:text-sky-400 border-sky-500/50 ring-2 ring-sky-500/30 shadow-sm',
        themeDefault: 'bg-surface-container-low dark:bg-slate-800 text-[var(--text-secondary)] hover:bg-sky-500/10 hover:text-sky-500 border-outline-variant/20',
        iconColor: 'text-sky-500',
    },
    {
        id: 'tired' as MoodType,
        label: 'خسته/کم‌انرژی',
        subLabel: 'نیاز به استراحت',
        Icon: IconMoodTired,
        themeActive: 'bg-orange-500/15 text-orange-600 dark:text-orange-400 border-orange-500/50 ring-2 ring-orange-500/30 shadow-sm',
        themeDefault: 'bg-surface-container-low dark:bg-slate-800 text-[var(--text-secondary)] hover:bg-orange-500/10 hover:text-orange-500 border-outline-variant/20',
        iconColor: 'text-orange-500',
    },
    {
        id: 'exhausted' as MoodType,
        label: 'فرسوده/بی‌انرژی',
        subLabel: 'هشدار بازتوانی',
        Icon: IconMoodExhausted,
        themeActive: 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/50 ring-2 ring-rose-500/30 shadow-sm',
        themeDefault: 'bg-surface-container-low dark:bg-slate-800 text-[var(--text-secondary)] hover:bg-rose-500/10 hover:text-rose-500 border-outline-variant/20',
        iconColor: 'text-rose-500',
    },
] as const;

const PERSIAN_WEEKDAYS = ['شنبه', 'یکشنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنج‌شنبه', 'جمعه'] as const;
const PERSIAN_SHORT_WEEKDAYS = ['ش', '۱ش', '۲ش', '۳ش', '۴ش', '۵ش', 'ج'] as const;

export const Dashboard: React.FC = () => {
    const navigate = useNavigate();
    const prefersReducedMotion = useReducedMotion();
    const {
        userName, currentDay, getTasksByDate, getDayDate,
        tasks: allTasks, setIsTimerOpen,
        toggleTask, updateTask, deleteTask, moveTaskToDate, viewMode,
        isNewUser, setIsNewUser, addTask, rebalancePlan,
        settings,
        streakStats, studyMinutesByDate, moods, setMood,
        isDemoActive, dismissDemoMode
    } = useStore();

    const [selectedDateOverride, setSelectedDateOverride] = useState<string | null>(null);
    const [weekOffset, setWeekOffset] = useState<number>(0);

    useEffect(() => {
        setSelectedDateOverride(null);
    }, [currentDay]);

    const activeDateIso = selectedDateOverride || getDayDate(currentDay);
    const dailyTasks = useMemo(() => getTasksByDate(activeDateIso), [getTasksByDate, activeDateIso]);

    const cutoffHour = settings?.dayCutoffHour ?? 5;
    const todayLogicalKey = getLogicalDateKey(new Date(), cutoffHour);
    const todayIso = toIsoString(new Date());

    const currentStream = settings?.stream || 'life';
    const isAcademicStream = currentStream === 'riazi' || currentStream === 'tajrobi' || currentStream === 'ensani';
    const [onlySpecialized, setOnlySpecialized] = useState(false);
    const [selectedFilterSubject, setSelectedFilterSubject] = useState<string | null>(null);

    // Modal State
    const [editingTask, setEditingTask] = useState<SubjectTask | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

    const openNewTaskModal = () => {
        setEditingTask(null);
        setIsModalOpen(true);
    };

    // 7-day Persian week ribbon (Sat -> Fri) with Liquid Fill & Week Navigation
    const weekDays = useMemo(() => {
        const baseDate = parseDate(todayIso);
        const daysSinceSaturday = (baseDate.getDay() + 1) % 7;
        const weekSaturday = addDays(baseDate, -daysSinceSaturday + (weekOffset * 7));

        return Array.from({ length: 7 }, (_, i) => {
            const dObj = addDays(weekSaturday, i);
            const iso = toIsoString(dObj);
            const tasks = getTasksByDate(iso);
            const done = tasks.filter((t) => t.isCompleted).length;
            const total = tasks.length;
            const isToday = iso === todayIso;
            const isSelected = iso === activeDateIso;
            const shamsiStr = getShamsiDate(iso);
            const shamsiDayNum = shamsiStr.split(' ')[0] || '';

            return {
                iso,
                weekday: PERSIAN_WEEKDAYS[i],
                shortWeekday: PERSIAN_SHORT_WEEKDAYS[i],
                shamsiDayNum: formatToPersianDigits(shamsiDayNum),
                done,
                total,
                isToday,
                isSelected,
                isCompleted: total > 0 && done === total,
                pct: total > 0 ? Math.round((done / total) * 100) : 0
            };
        });
    }, [todayIso, weekOffset, getTasksByDate, activeDateIso]);

    const filteredDailyTasks = useMemo(() => dailyTasks.filter(task => {
        if (onlySpecialized && isAcademicStream) {
            const isSpecialized = isSpecializedSubject(currentStream, task.subject);
            if (!isSpecialized) return false;
        }
        if (selectedFilterSubject && task.subject !== selectedFilterSubject) {
            return false;
        }
        return true;
    }), [dailyTasks, onlySpecialized, isAcademicStream, currentStream, selectedFilterSubject]);

    const dailySubjects = useMemo(() => Array.from(new Set(dailyTasks.map(t => t.subject))), [dailyTasks]);
    const completedDailyTasks = useMemo(() => dailyTasks.filter(t => t.isCompleted).length, [dailyTasks]);
    const dailyPct = dailyTasks.length > 0 ? Math.round((completedDailyTasks / dailyTasks.length) * 100) : 0;

    // Study minutes today (strictly computed from logged sessions/minutes; no fake 68% fallback)
    const studyMinsToday =
        studyMinutesByDate?.[activeDateIso] ??
        (activeDateIso === todayIso ? studyMinutesByDate?.[todayLogicalKey] : undefined) ??
        dailyTasks
            .filter(t => t.isCompleted)
            .reduce((sum, t) => sum + (t.actualDuration || 0), 0);
    const studyHoursToday = Math.floor(studyMinsToday / 60);
    const studyRemMinsToday = studyMinsToday % 60;
    const studyHoursDecimal = Math.round((studyMinsToday / 60) * 10) / 10;
    const focusTargetHours = Math.max(1, Math.round(((settings?.dailyCapacityMinutes ?? 360) / 60) * 10) / 10);
    const focusProgressPct = Math.min(100, Math.round((studyMinsToday / (focusTargetHours * 60)) * 100));

    // Scheduled timeblocks for today derived from real tasks with startTime
    const scheduledTimeblocks = useMemo(() => {
        const withTime = dailyTasks
            .filter(t => Boolean(t.startTime))
            .slice()
            .sort((a, b) => (a.startTime || '').localeCompare(b.startTime || ''));

        const formatEnd = (start: string, dur: number) => {
            const [hh, mm] = start.split(':').map(Number);
            if (isNaN(hh) || isNaN(mm)) return '';
            const total = (hh * 60 + mm + dur) % (24 * 60);
            return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
        };

        return withTime.slice(0, 3).map((t, idx) => {
            const dur = t.durationMinutes || 60;
            const end = formatEnd(t.startTime!, dur);
            return {
                id: t.id,
                badge: idx === 0 ? 'بلوک جاری' : idx === 1 ? 'بلوک بعدی' : 'بلوک پایانی',
                timeRange: end ? `${t.startTime} - ${end}` : t.startTime!,
                title: `${t.subject}${t.topic ? ` — ${t.topic}` : ''}`,
                subtitle: t.details || `${formatToPersianDigits(dur)} دقیقه تمرکز`,
                isCompleted: t.isCompleted,
            };
        });
    }, [dailyTasks]);

    const overdueTasks = useMemo(
        () => allTasks.filter(t => t.date < todayIso && !t.isCompleted && t.date !== activeDateIso),
        [allTasks, todayIso, activeDateIso]
    );

    const handleEdit = useCallback((e: React.MouseEvent, task: SubjectTask) => {
        e.stopPropagation();
        setEditingTask(task);
        setIsModalOpen(true);
    }, []);

    const handleDelete = useCallback((e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        deleteTask(id);
    }, [deleteTask]);

    const handleSaveTask = (taskData: Partial<SubjectTask>) => {
        if (editingTask) {
            updateTask({ ...editingTask, ...taskData } as SubjectTask);
        } else {
            addTask({
                id: crypto.randomUUID(),
                dayId: currentDay,
                date: activeDateIso,
                subject: 'عمومی',
                topic: 'تسک جدید',
                status: 'todo',
                isCompleted: false,
                priority: 'medium',
                durationMinutes: 30,
                ...taskData
            } as SubjectTask);
        }
        setIsModalOpen(false);
        setEditingTask(null);
    };

    const handleMoveToToday = useCallback((taskId: string) => moveTaskToDate(taskId, todayIso), [moveTaskToDate, todayIso]);

    const streakCount = streakStats?.currentStreak ?? 0;

    return (
        <div className="flex flex-col w-full">
            {/* ===== 1. Full-Bleed Edge-to-Edge Theme Gradient Hero Header (Space-Optimized) ===== */}
            <section
                aria-label="خلاصه وضعیت امروز"
                className="relative overflow-hidden -mt-[calc(4.25rem+env(safe-area-inset-top,0px))] md:-mt-16 pt-[max(0.75rem,env(safe-area-inset-top,0px))] md:pt-20 pb-5 sm:pb-6 px-3.5 xs:px-4 sm:px-6 lg:px-8 rounded-b-[28px] sm:rounded-b-[32px] bg-gradient-to-br from-[var(--color-indigo-600)] via-[var(--md-primary)] to-[var(--color-violet-700)] dark:from-[var(--color-indigo-900)] dark:via-[var(--color-indigo-800)] dark:to-[var(--color-violet-950)] text-white shadow-lg"
            >
                {/* Ambient decorative highlights */}
                <div className="absolute -top-16 -left-12 w-48 h-48 rounded-full bg-white/12 blur-2xl pointer-events-none" aria-hidden="true" />
                <div className="absolute -bottom-20 -right-10 w-56 h-56 rounded-full bg-white/10 blur-3xl pointer-events-none" aria-hidden="true" />

                <div className="relative z-10 max-app-container w-full mx-auto flex flex-col gap-3.5">
                    {/* Mobile: Greeting & Date tucked cleanly between the two top floating capsules */}
                    <div className="md:hidden flex flex-col items-center justify-center min-h-[50px] px-[6.8rem] text-center">
                        <h1 className="text-[13px] font-black text-white leading-tight truncate max-w-full">
                            {getTimeOfDayGreeting(new Date().getHours())}، {userName || 'دوست من'}
                        </h1>
                        <span className="text-[11px] font-bold text-white/80 mt-0.5">
                            {getShamsiDate(activeDateIso)}
                        </span>
                    </div>

                    {/* Desktop Greeting Row + Mobile Compact Action Bar */}
                    <div className="flex items-center justify-between gap-3">
                        <div className="hidden md:flex items-center gap-2.5 min-w-0">
                            <h1 className="text-2xl md:text-3xl text-white font-black leading-snug truncate">
                                {getTimeOfDayGreeting(new Date().getHours())}، {userName || 'دوست من'}
                            </h1>
                            <span className="text-xs bg-white/20 backdrop-blur-md text-white px-2.5 py-0.5 rounded-full font-bold border border-white/20 shrink-0">
                                {getShamsiDate(activeDateIso)}
                            </span>
                        </div>

                        <div className="flex md:hidden items-center gap-1.5 text-[11px] font-bold text-white/90 bg-white/15 px-3 py-1.5 rounded-full border border-white/15">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-300" aria-hidden="true" />
                            <span>هدف امروز: {formatToPersianDigits(focusTargetHours)} ساعت</span>
                        </div>

                        <motion.button
                            type="button"
                            onClick={openNewTaskModal}
                            whileTap={prefersReducedMotion ? undefined : { scale: 0.93 }}
                            transition={{ type: 'spring', stiffness: 400, damping: 18 }}
                            className="touch-target flex items-center justify-center gap-1.5 bg-white text-[var(--color-indigo-700)] dark:bg-white/95 dark:text-slate-900 px-3.5 py-2 rounded-full hover:brightness-95 transition-colors shadow-md font-extrabold text-xs cursor-pointer min-h-[40px] whitespace-nowrap shrink-0"
                        >
                            <Plus size={15} strokeWidth={2.6} aria-hidden="true" />
                            <span>تسک جدید</span>
                        </motion.button>
                    </div>

                    {/* Two Redesigned Interactive Bento Hero Stat Cards */}
                    <div className="grid grid-cols-2 gap-2.5 sm:gap-3.5">
                        {/* Mini Card 1: Deep Focus Card (Interactive -> Opens Timer) */}
                        <motion.button
                            type="button"
                            onClick={() => {
                                haptics.light();
                                setIsTimerOpen(true);
                            }}
                            initial={prefersReducedMotion ? false : { opacity: 0, y: 12, scale: 0.94 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            whileTap={prefersReducedMotion ? undefined : { scale: 0.97 }}
                            transition={{ type: 'spring', stiffness: 320, damping: 19, mass: 0.85 }}
                            className="group relative overflow-hidden bg-gradient-to-br from-white/95 via-indigo-50/40 to-white/95 dark:from-slate-900/95 dark:via-indigo-950/35 dark:to-slate-900/95 text-[var(--text-primary)] squircle-md p-3.5 sm:p-4 shadow-md border border-white/55 dark:border-indigo-400/15 hover:border-primary/40 text-start flex flex-col justify-between gap-2.5 cursor-pointer transition-colors"
                        >
                            <div className="flex items-center justify-between gap-1.5 w-full">
                                <span className="flex items-center gap-1.5 text-[11px] sm:text-xs font-extrabold text-[var(--text-secondary)]">
                                    <span className="w-6 h-6 rounded-lg bg-primary/12 text-primary flex items-center justify-center shrink-0">
                                        <Clock size={13} strokeWidth={2.3} aria-hidden="true" />
                                    </span>
                                    تمرکز عمیق
                                </span>
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/12 text-primary text-[10px] sm:text-[11px] font-extrabold shrink-0 group-hover:bg-primary group-hover:text-on-primary transition-colors">
                                    <Play size={9} fill="currentColor" aria-hidden="true" />
                                    شروع
                                </span>
                            </div>

                            <div className="flex items-center justify-between gap-2 w-full">
                                <div className="flex flex-col min-w-0">
                                    <span className="text-base sm:text-xl font-black text-on-surface tabular-nums leading-tight">
                                        {formatToPersianDigits(studyHoursDecimal)}{' '}
                                        <span className="text-[11px] sm:text-xs font-semibold text-[var(--text-tertiary)]">
                                            / {formatToPersianDigits(focusTargetHours)} ساعت
                                        </span>
                                    </span>
                                    <span className="text-[11px] font-semibold text-[var(--text-tertiary)] truncate mt-0.5 tabular-nums">
                                        {focusProgressPct >= 100
                                            ? 'هدف تمرکز امروز کامل شد'
                                            : studyMinsToday > 0
                                              ? `${formatToPersianDigits(studyHoursToday)} ساعت و ${formatToPersianDigits(studyRemMinsToday)} دقیقه ثبت‌شده`
                                              : 'برای شروع تایمر ضربه بزنید'}
                                    </span>
                                </div>

                                {/* Single Clean SVG Radial Progress Ring */}
                                <div className="relative w-12 h-12 sm:w-14 sm:h-14 flex items-center justify-center shrink-0">
                                    <svg className="w-full h-full transform -rotate-90" viewBox="0 0 48 48" aria-hidden="true">
                                        <circle
                                            className="text-surface-container-high dark:text-slate-800 fill-none"
                                            cx="24" cy="24" r="19"
                                            stroke="currentColor"
                                            strokeWidth="4.5"
                                        />
                                        <motion.circle
                                            className="text-primary fill-none"
                                            cx="24" cy="24" r="19"
                                            stroke="currentColor"
                                            strokeDasharray="119.38"
                                            initial={prefersReducedMotion ? false : { strokeDashoffset: 119.38 }}
                                            animate={{ strokeDashoffset: 119.38 - (119.38 * (focusProgressPct / 100)) }}
                                            transition={{ type: 'spring', stiffness: 140, damping: 20 }}
                                            strokeLinecap="round"
                                            strokeWidth="4.5"
                                        />
                                    </svg>
                                    <span className="absolute text-[11px] font-black tabular-nums text-on-surface">
                                        {formatToPersianDigits(focusProgressPct)}٪
                                    </span>
                                </div>
                            </div>
                        </motion.button>

                        {/* Mini Card 2: Today's Tasks Progress Card (Interactive -> Scrolls to Tasks) */}
                        <motion.button
                            type="button"
                            onClick={() => {
                                haptics.light();
                                document.getElementById('today-tasks-hub')?.scrollIntoView({
                                    behavior: prefersReducedMotion ? 'auto' : 'smooth',
                                    block: 'start',
                                });
                            }}
                            initial={prefersReducedMotion ? false : { opacity: 0, y: 12, scale: 0.94 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            whileTap={prefersReducedMotion ? undefined : { scale: 0.97 }}
                            transition={{ type: 'spring', stiffness: 320, damping: 19, mass: 0.85, delay: 0.04 }}
                            className="group relative overflow-hidden bg-gradient-to-br from-white/95 via-emerald-50/40 to-white/95 dark:from-slate-900/95 dark:via-emerald-950/30 dark:to-slate-900/95 text-[var(--text-primary)] squircle-md p-3.5 sm:p-4 shadow-md border border-white/55 dark:border-emerald-400/15 hover:border-emerald-500/40 text-start flex flex-col justify-between gap-2.5 cursor-pointer transition-colors"
                        >
                            <div className="flex items-center justify-between gap-1.5 w-full">
                                <span className="flex items-center gap-1.5 text-[11px] sm:text-xs font-extrabold text-[var(--text-secondary)]">
                                    <span className="w-6 h-6 rounded-lg bg-emerald-500/12 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                                        <CheckCircle2 size={13} strokeWidth={2.3} aria-hidden="true" />
                                    </span>
                                    پیشرفت تسک‌ها
                                </span>
                                <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 text-[11px] font-black tabular-nums shrink-0">
                                    {formatToPersianDigits(dailyPct)}٪
                                </span>
                            </div>

                            <div className="flex flex-col gap-2 w-full">
                                <div className="flex items-baseline justify-between gap-2">
                                    <span className="text-base sm:text-xl font-black text-on-surface tabular-nums leading-tight">
                                        {formatToPersianDigits(completedDailyTasks)}{' '}
                                        <span className="text-[11px] sm:text-xs font-semibold text-[var(--text-tertiary)]">
                                            از {formatToPersianDigits(dailyTasks.length)} تسک
                                        </span>
                                    </span>
                                    <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-300 truncate tabular-nums">
                                        {dailyTasks.length > completedDailyTasks
                                            ? `${formatToPersianDigits(dailyTasks.length - completedDailyTasks)} کار باقی‌مانده`
                                            : dailyTasks.length > 0
                                              ? 'همه کارها انجام شد'
                                              : 'بدون کار ثبت‌شده'}
                                    </span>
                                </div>

                                <div className="h-2 w-full rounded-full bg-surface-container-high dark:bg-slate-800 overflow-hidden p-0.5">
                                    <motion.div
                                        initial={prefersReducedMotion ? false : { width: 0 }}
                                        animate={{ width: `${dailyPct}%` }}
                                        transition={{ type: 'spring', stiffness: 180, damping: 22 }}
                                        className="h-full rounded-full bg-gradient-to-l from-emerald-500 via-teal-400 to-cyan-400"
                                    />
                                </div>
                            </div>
                        </motion.button>
                    </div>
                </div>
            </section>

            {/* Main Dashboard Body */}
            <div className="p-3 xs:p-4 sm:p-5 md:p-6 lg:p-8 flex flex-col gap-4 sm:gap-6 w-full max-app-container mx-auto">
                {/* Welcome banner for new users */}
                <WelcomeBanner
                    visible={isNewUser}
                    onDismiss={() => setIsNewUser(false)}
                />

                {/* Native Workspace Preview Notice (Calm, non-promotional surface — Banner Blindness fix) */}
                {isDemoActive && (
                    <div className="flex flex-wrap items-center justify-between gap-3 squircle-card px-4 py-2.5 bg-[var(--surface-elevated)] border border-[var(--border-subtle)] text-xs text-[var(--text-secondary)]">
                        <div className="flex items-center gap-2.5 min-w-0">
                            <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" aria-hidden="true" />
                            <span className="font-bold text-on-surface shrink-0">پیش‌نمایش نمونه</span>
                            <span aria-hidden="true" className="text-[var(--text-muted)]">·</span>
                            <span className="font-medium truncate sm:whitespace-normal">
                                با ثبت اولین فعالیت یا جلسه تمرکز، داده‌های واقعی شما جایگزین می‌شوند.
                            </span>
                        </div>
                        {dismissDemoMode && (
                            <button
                                type="button"
                                onClick={dismissDemoMode}
                                className="px-3 min-h-[44px] sm:min-h-[36px] rounded-xl bg-surface-container-low hover:bg-surface-container text-on-surface font-bold transition-colors cursor-pointer shrink-0"
                            >
                                بستن پیش‌نمایش
                            </button>
                        )}
                    </div>
                )}

            {/* ===== 2. 7-Day Persian Weekly Calendar with Liquid Fill Effect ===== */}
            <WeekCalendarStrip
                weekDays={weekDays}
                prefersReducedMotion={prefersReducedMotion}
                onPrevWeek={() => setWeekOffset(prev => prev - 1)}
                onToday={() => { setWeekOffset(0); setSelectedDateOverride(todayIso); }}
                onNextWeek={() => setWeekOffset(prev => prev + 1)}
                onSelectDate={setSelectedDateOverride}
            />

            {/* ===== 3. Compact Warm Yellow Streak Card (Duplicate Task KPI Removed) ===== */}
            <motion.section
                initial={prefersReducedMotion ? false : { opacity: 0, y: 10, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ type: 'spring', stiffness: 320, damping: 20 }}
                className="bg-gradient-to-l from-amber-500/22 via-amber-400/12 to-yellow-500/8 dark:from-amber-500/20 dark:via-amber-500/10 dark:to-yellow-500/5 px-4 py-3 squircle-card border border-amber-500/40 flex items-center justify-between gap-3"
            >
                <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-amber-500/25 flex items-center justify-center text-amber-500 shrink-0 shadow-xs">
                        <Flame size={21} className="fill-current text-amber-500" aria-hidden="true" />
                    </div>
                    <div className="flex flex-col min-w-0">
                        <div className="flex items-baseline gap-1.5">
                            <span className="text-lg sm:text-xl font-black text-amber-600 dark:text-amber-400 tabular-nums">
                                {formatToPersianDigits(streakCount)}
                            </span>
                            <span className="text-xs sm:text-sm font-extrabold text-on-surface">روز پیوسته</span>
                        </div>
                        <span className="text-[11px] text-amber-700 dark:text-amber-300/90 font-semibold truncate tabular-nums">
                            {streakCount > 0
                                ? `رکورد: ${formatToPersianDigits(streakStats?.longestStreak ?? streakCount)} روز`
                                : 'با ثبت اولین فعالیت امروز زنجیره را روشن کنید'}
                        </span>
                    </div>
                </div>
                <TrendingUp size={18} className="text-amber-500 shrink-0 opacity-80" aria-hidden="true" />
            </motion.section>

            {/* ===== 4. Core Bento Layout (8 Cols Main / 4 Cols Side) ===== */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6 items-start">
                {/* Main 8 Columns */}
                <div className="lg:col-span-8 flex flex-col gap-4 sm:gap-6">
                    {/* ===== Today's Tasks Hub (Timeblocks unified in 24h Timeline) Hub ===== */}
                    <div
                        id="today-tasks-hub"
                        className="bg-[var(--surface-elevated)] p-4 sm:p-6 squircle-lg shadow-sm border border-[var(--border-subtle)] flex flex-col gap-5 scroll-mt-20"
                    >
                        {/* Tasks List Header */}
                        <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-[var(--border-subtle)]">
                            <div className="flex items-center gap-2">
                                <CheckCircle2 size={20} className="text-primary" />
                                <h3 className="font-headline-md text-base font-bold text-on-surface">
                                    تسک‌های امروز ({formatToPersianDigits(completedDailyTasks)} از {formatToPersianDigits(dailyTasks.length)})
                                </h3>
                            </div>
                            {isAcademicStream && (
                                <button
                                    type="button"
                                    onClick={() => setOnlySpecialized(!onlySpecialized)}
                                    className={`min-h-[40px] sm:min-h-[34px] text-xs px-2.5 py-1 rounded-lg font-bold transition-all border cursor-pointer ${
                                        onlySpecialized
                                            ? 'bg-primary/10 text-primary border-primary/30'
                                            : 'bg-surface-container-low text-[var(--text-secondary)] border-[var(--border-subtle)]'
                                    }`}
                                >
                                    {onlySpecialized ? 'فقط دروس تخصصی' : 'همه دروس'}
                                </button>
                            )}
                        </div>

                        {/* Subject Filters Carousel */}
                        {dailySubjects.length > 0 && (
                            <div className="flex gap-2 overflow-x-auto py-1 no-scrollbar select-none" dir="rtl">
                                <button
                                    type="button"
                                    onClick={() => setSelectedFilterSubject(null)}
                                    className={`min-h-[40px] sm:min-h-[34px] px-3.5 py-1 rounded-full text-xs font-bold transition-all shrink-0 cursor-pointer ${
                                        selectedFilterSubject === null
                                            ? 'bg-primary text-on-primary shadow-xs'
                                            : 'bg-surface-container-low text-[var(--text-secondary)] hover:bg-surface-container'
                                    }`}
                                >
                                    همه حوزه‌ها
                                </button>
                                {dailySubjects.map(sub => (
                                    <button
                                        key={sub}
                                        type="button"
                                        onClick={() => setSelectedFilterSubject(selectedFilterSubject === sub ? null : sub)}
                                        className={`min-h-[40px] sm:min-h-[34px] px-3.5 py-1 rounded-full text-xs font-bold transition-all shrink-0 cursor-pointer ${
                                            selectedFilterSubject === sub
                                                ? 'bg-primary text-on-primary shadow-xs'
                                                : 'bg-surface-container-low text-[var(--text-secondary)] hover:bg-surface-container'
                                        }`}
                                    >
                                        {sub}
                                    </button>
                                ))}
                            </div>
                        )}

                        {/* Peak-End Celebration Banner when all today's tasks completed */}
                        {dailyTasks.length > 0 && completedDailyTasks === dailyTasks.length && (
                            <div className="p-3.5 squircle-card bg-emerald-500/10 border border-emerald-500/25 flex items-center gap-3">
                                <PeakEndCheckmark size={38} className="shrink-0" />
                                <div className="min-w-0">
                                    <p className="text-xs sm:text-sm font-black text-emerald-700 dark:text-emerald-300">
                                        تمام تسک‌های امروز تکمیل شدند!
                                    </p>
                                    <p className="text-[11px] text-emerald-700/80 dark:text-emerald-300/80 font-medium">
                                        روز پربار و درخشانی را به پایان رساندید.
                                    </p>
                                </div>
                            </div>
                        )}

                        {/* Task List (Principle 3: Stagger Choreography) */}
                        {filteredDailyTasks.length > 0 ? (
                            <motion.div
                                variants={STAGGER_CONTAINER_VARIANTS}
                                initial={prefersReducedMotion ? false : 'hidden'}
                                animate="visible"
                                className="space-y-2.5"
                            >
                                {filteredDailyTasks.map((task) => (
                                    <motion.div key={task.id} variants={STAGGER_ITEM_VARIANTS}>
                                        <TaskCard
                                            task={task}
                                            viewMode={viewMode}
                                            onToggle={toggleTask}
                                            onEdit={handleEdit}
                                            onDelete={handleDelete}
                                        />
                                    </motion.div>
                                ))}
                            </motion.div>
                        ) : dailyTasks.length > 0 && (selectedFilterSubject || onlySpecialized) ? (
                            <div className="text-center py-8 px-4 bg-surface-container-low squircle-card border border-dashed border-[var(--border-strong)] space-y-2.5">
                                <p className="text-sm text-on-surface font-semibold">
                                    با فیلتر فعال تسکی برای نمایش وجود ندارد.
                                </p>
                                <p className="text-xs text-[var(--text-secondary)]">
                                    {selectedFilterSubject ? `فیلتر حوزه: «${selectedFilterSubject}»` : 'فیلتر دروس تخصصی فعال است'}
                                </p>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setSelectedFilterSubject(null);
                                        setOnlySpecialized(false);
                                    }}
                                    className="mt-1 inline-flex items-center justify-center min-h-[44px] px-4 py-2 rounded-xl bg-primary-fixed text-on-primary-fixed text-xs font-bold hover:brightness-95 transition cursor-pointer"
                                >
                                    پاک کردن فیلتر
                                </button>
                            </div>
                        ) : (
                            <div className="text-center py-10 px-4 bg-surface-container-low squircle-card border border-dashed border-[var(--border-strong)] space-y-2">
                                <p className="text-sm text-on-surface font-semibold">تسکی برای این روز ثبت نشده است.</p>
                                <p className="text-xs text-[var(--text-secondary)]">اولین کار کلیدی امروز را اضافه کنید یا در تایم‌لاین بچینید.</p>
                                <button
                                    type="button"
                                    onClick={openNewTaskModal}
                                    className="mt-2 inline-flex items-center justify-center gap-1.5 min-h-[44px] px-4 py-2 rounded-xl bg-primary text-on-primary text-xs font-bold hover:brightness-110 transition cursor-pointer"
                                >
                                    <Plus size={15} aria-hidden="true" />
                                    ایجاد تسک جدید
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Overdue Tasks Section if any */}
                    {overdueTasks.length > 0 && (
                        <div className="bg-[var(--surface-elevated)] p-4 sm:p-5 squircle-lg shadow-sm border border-error/25 flex flex-col gap-3">
                            <div className="flex items-center justify-between gap-2">
                                <h3 className="text-sm font-bold text-error flex items-center gap-1.5">
                                    <AlertCircle size={16} />
                                    تسک‌های به تعویق افتاده ({formatToPersianDigits(overdueTasks.length)})
                                </h3>
                                <button
                                    type="button"
                                    onClick={rebalancePlan}
                                    className="min-h-[40px] sm:min-h-[34px] flex items-center gap-1.5 px-3 py-1 bg-amber-500/10 text-amber-700 dark:text-amber-300 text-xs font-bold rounded-lg hover:bg-amber-500/20 transition cursor-pointer"
                                >
                                    <GitCompare size={14} />
                                    چینش خودکار برنامه
                                </button>
                            </div>
                            <div className="space-y-2">
                                {overdueTasks.map(task => (
                                    <TaskCard
                                        key={task.id}
                                        task={task}
                                        isOverdue
                                        viewMode={viewMode}
                                        onToggle={toggleTask}
                                        onEdit={handleEdit}
                                        onDelete={handleDelete}
                                        onMoveToToday={handleMoveToToday}
                                    />
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Side 4 Columns (Live Study Pod & Focus Soundscape) */}
                <div className="lg:col-span-4 flex flex-col gap-4 sm:gap-6">
                    {/* Live Virtual Study Pod (Links to Real Firestore Rooms) */}
                    <div className="bg-[var(--surface-elevated)] p-4 sm:p-5 squircle-lg shadow-xs border border-[var(--border-subtle)] flex flex-col gap-3.5">
                        <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                                <Users size={20} className="text-primary shrink-0" aria-hidden="true" />
                                <h3 className="text-sm font-bold text-on-surface">
                                    اتاق‌های هم‌مطالعه زنده (<bdi>YPT</bdi>)
                                </h3>
                            </div>
                            <span className="text-xs text-secondary font-bold">
                                آماده اتصال
                            </span>
                        </div>

                        <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                            به اتاق‌های مطالعه آنلاین بپیوندید، تایمر گروهی را همگام کنید و پیشرفت هم‌تیمی‌ها را به صورت زنده دنبال کنید.
                        </p>

                        <button
                            type="button"
                            onClick={() => navigate('/leaderboard')}
                            className="touch-target w-full py-2.5 bg-surface-container-low hover:bg-surface-container text-primary font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer border border-[var(--border-subtle)] min-h-[44px]"
                        >
                            <Users size={16} aria-hidden="true" />
                            <span>پیوستن به میز مطالعه مجازی</span>
                        </button>
                    </div>

                    {/* Ambient Focus Audio Card */}
                    <div className="bg-[var(--surface-elevated)] p-4 sm:p-5 squircle-lg shadow-xs border border-[var(--border-subtle)] flex flex-col gap-3">
                        <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                                <Headphones size={20} className="text-secondary shrink-0" aria-hidden="true" />
                                <h3 className="text-sm font-bold text-on-surface">
                                    محیط صوتی تمرکز عمیق
                                </h3>
                            </div>
                            <span className="text-xs text-secondary font-semibold">
                                امواج تتا
                            </span>
                        </div>
                        <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                            افزایش ماندگاری حافظه و هماهنگی نیم‌کره‌های مغزی در جلسات پرفشار مطالعه.
                        </p>
                        <button
                            type="button"
                            onClick={() => setIsTimerOpen(true)}
                            className="touch-target w-full py-2.5 bg-surface-container-low hover:bg-surface-container text-on-surface font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer border border-[var(--border-subtle)] min-h-[44px]"
                        >
                            <Zap size={16} className="text-secondary" aria-hidden="true" />
                            <span>پخش نویز قهوه‌ای و امواج تتا</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* Task Modal for Creating / Editing Tasks */}
            {isModalOpen && (
                <TaskModal
                    isOpen={isModalOpen}
                    onClose={() => { setIsModalOpen(false); setEditingTask(null); }}
                    onSave={handleSaveTask}
                    initialData={editingTask}
                    currentDayId={currentDay}
                    defaultDateStr={activeDateIso}
                />
            )}
            </div>
        </div>
    );
};

export default Dashboard;
