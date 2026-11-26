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
        themeDefault: 'bg-surface-container-low dark:bg-slate-800 text-on-surface-variant dark:text-gray-300 hover:bg-amber-500/10 hover:text-amber-500 border-outline-variant/20',
        iconColor: 'text-amber-500',
    },
    {
        id: 'high-energy' as MoodType,
        label: 'خوب/پرانرژی',
        subLabel: 'جریان غرقه‌گی',
        Icon: IconMoodHighEnergy,
        themeActive: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/50 ring-2 ring-emerald-500/30 shadow-sm',
        themeDefault: 'bg-surface-container-low dark:bg-slate-800 text-on-surface-variant dark:text-gray-300 hover:bg-emerald-500/10 hover:text-emerald-500 border-outline-variant/20',
        iconColor: 'text-emerald-500',
    },
    {
        id: 'normal' as MoodType,
        label: 'معمولی',
        subLabel: 'ریتم متعادل',
        Icon: IconMoodNormal,
        themeActive: 'bg-sky-500/15 text-sky-600 dark:text-sky-400 border-sky-500/50 ring-2 ring-sky-500/30 shadow-sm',
        themeDefault: 'bg-surface-container-low dark:bg-slate-800 text-on-surface-variant dark:text-gray-300 hover:bg-sky-500/10 hover:text-sky-500 border-outline-variant/20',
        iconColor: 'text-sky-500',
    },
    {
        id: 'tired' as MoodType,
        label: 'خسته/کم‌انرژی',
        subLabel: 'نیاز به استراحت',
        Icon: IconMoodTired,
        themeActive: 'bg-orange-500/15 text-orange-600 dark:text-orange-400 border-orange-500/50 ring-2 ring-orange-500/30 shadow-sm',
        themeDefault: 'bg-surface-container-low dark:bg-slate-800 text-on-surface-variant dark:text-gray-300 hover:bg-orange-500/10 hover:text-orange-500 border-outline-variant/20',
        iconColor: 'text-orange-500',
    },
    {
        id: 'exhausted' as MoodType,
        label: 'فرسوده/بی‌انرژی',
        subLabel: 'هشدار بازتوانی',
        Icon: IconMoodExhausted,
        themeActive: 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/50 ring-2 ring-rose-500/30 shadow-sm',
        themeDefault: 'bg-surface-container-low dark:bg-slate-800 text-on-surface-variant dark:text-gray-300 hover:bg-rose-500/10 hover:text-rose-500 border-outline-variant/20',
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

    // Brain Dump Input State
    const [brainDumpText, setBrainDumpText] = useState('');
    const [brainDumpFeedback, setBrainDumpFeedback] = useState<string | null>(null);

    // Modal State
    const [editingTask, setEditingTask] = useState<SubjectTask | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

    const openNewTaskModal = () => {
        setEditingTask(null);
        setIsModalOpen(true);
    };

    // Current Mood for Active Date
    const currentMood = (moods && moods[activeDateIso]) || undefined;

    const handleSelectMood = (moodId: MoodType) => {
        if (setMood) {
            setMood(activeDateIso, moodId);
        }
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

    const handleBrainDumpSubmit = (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (!brainDumpText.trim()) return;

        const val = brainDumpText.trim();
        addTask({
            id: crypto.randomUUID(),
            dayId: currentDay,
            date: activeDateIso,
            subject: 'شخصی',
            topic: val,
            details: 'ثبت سریع از نوار دستیار هوشمند',
            isCompleted: false,
            status: 'todo',
            priority: 'medium',
            durationMinutes: 30,
            isCustom: true
        });

        setBrainDumpText('');
        setBrainDumpFeedback(`ثبت شد: «${val.slice(0, 24)}...»`);
        setTimeout(() => setBrainDumpFeedback(null), 3500);
    };

    const streakCount = streakStats?.currentStreak ?? 0;

    return (
        <div className="flex flex-col w-full">
            {/* ===== 1. Full-Bleed Edge-to-Edge Theme Gradient Hero Header ===== */}
            <section
                aria-label="خلاصه وضعیت امروز"
                className="relative overflow-hidden -mt-[calc(4.25rem+env(safe-area-inset-top,0px))] md:-mt-16 pt-[calc(5.1rem+env(safe-area-inset-top,0px))] md:pt-22 pb-5 sm:pb-6 px-3.5 xs:px-4 sm:px-6 lg:px-8 rounded-b-[28px] sm:rounded-b-[32px] bg-gradient-to-br from-[var(--color-indigo-600)] via-[var(--md-primary)] to-[var(--color-violet-700)] dark:from-[var(--color-indigo-900)] dark:via-[var(--color-indigo-800)] dark:to-[var(--color-violet-950)] text-white shadow-lg"
            >
                {/* Ambient decorative highlights */}
                <div className="absolute -top-16 -left-12 w-48 h-48 rounded-full bg-white/12 blur-2xl pointer-events-none" aria-hidden="true" />
                <div className="absolute -bottom-20 -right-10 w-56 h-56 rounded-full bg-white/10 blur-3xl pointer-events-none" aria-hidden="true" />

                <div className="relative z-10 max-app-container w-full mx-auto flex flex-col gap-4">
                    {/* Top Greeting & Compact New Task CTA */}
                    <div className="flex items-center justify-between gap-3">
                        <div className="flex flex-col gap-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                                <h1 className="text-lg sm:text-2xl md:text-3xl text-white font-black leading-snug truncate">
                                    {getTimeOfDayGreeting(new Date().getHours())}، {userName || 'دوست من'}
                                </h1>
                                <span className="text-[11px] sm:text-xs bg-white/20 backdrop-blur-md text-white px-2.5 py-0.5 rounded-full font-bold border border-white/20 shrink-0">
                                    {getShamsiDate(activeDateIso)}
                                </span>
                            </div>
                        </div>

                        <button
                            type="button"
                            onClick={openNewTaskModal}
                            className="touch-target flex items-center justify-center gap-1.5 bg-white text-[var(--color-indigo-700)] dark:bg-white/95 dark:text-slate-900 px-3.5 py-2 rounded-full hover:brightness-95 active:scale-[0.97] transition-all shadow-md font-extrabold text-xs cursor-pointer min-h-[40px] whitespace-nowrap shrink-0"
                        >
                            <Plus size={15} strokeWidth={2.6} aria-hidden="true" />
                            <span>تسک جدید</span>
                        </button>
                    </div>

                    {/* Two Crisp White / Dark Mini Stat Cards */}
                    <div className="grid grid-cols-2 gap-2.5 sm:gap-3.5">
                        {/* Mini Card 1: Upgraded Deep Focus Card */}
                        <div className="bg-white/95 dark:bg-slate-900/90 text-[var(--text-primary)] squircle-md p-3 sm:p-4 shadow-md border border-white/45 dark:border-white/10 flex flex-col justify-between gap-2.5">
                            <div className="flex items-center justify-between gap-2">
                                <div className="flex flex-col min-w-0">
                                    <span className="text-[11px] sm:text-xs font-bold text-[var(--text-secondary)]">تمرکز عمیق</span>
                                    <span className="text-sm sm:text-base font-black text-on-surface tabular-nums mt-0.5">
                                        {formatToPersianDigits(studyHoursDecimal)}{' '}
                                        <span className="text-xs font-semibold text-[var(--text-tertiary)]">
                                            / {formatToPersianDigits(focusTargetHours)} ساعت
                                        </span>
                                    </span>
                                </div>

                                <div className="relative w-11 h-11 sm:w-12 sm:h-12 flex items-center justify-center shrink-0">
                                    <svg className="w-full h-full transform -rotate-90" viewBox="0 0 48 48" aria-hidden="true">
                                        <circle
                                            className="text-surface-container-high dark:text-slate-800 fill-none"
                                            cx="24" cy="24" r="19"
                                            stroke="currentColor"
                                            strokeWidth="4.5"
                                        />
                                        <circle
                                            className="text-primary fill-none transition-all duration-300 ease-[cubic-bezier(0.42,0,0.58,1)]"
                                            cx="24" cy="24" r="19"
                                            stroke="currentColor"
                                            strokeDasharray="119.38"
                                            strokeDashoffset={119.38 - (119.38 * (focusProgressPct / 100))}
                                            strokeLinecap="round"
                                            strokeWidth="4.5"
                                        />
                                    </svg>
                                    <span className="absolute text-[10px] sm:text-[11px] font-extrabold tabular-nums text-on-surface">
                                        {formatToPersianDigits(focusProgressPct)}٪
                                    </span>
                                </div>
                            </div>

                            <div className="h-1.5 w-full rounded-full bg-surface-container-high dark:bg-slate-800 overflow-hidden">
                                <div
                                    className="h-full rounded-full bg-primary transition-all duration-300"
                                    style={{ width: `${focusProgressPct}%` }}
                                />
                            </div>
                        </div>

                        {/* Mini Card 2: Today's Tasks Progress Card */}
                        <div className="bg-white/95 dark:bg-slate-900/90 text-[var(--text-primary)] squircle-md p-3 sm:p-4 shadow-md border border-white/45 dark:border-white/10 flex flex-col justify-between gap-2.5">
                            <div className="flex items-start justify-between gap-2">
                                <div className="flex flex-col min-w-0">
                                    <span className="text-[11px] sm:text-xs font-bold text-[var(--text-secondary)]">پیشرفت تسک‌ها</span>
                                    <span className="text-sm sm:text-base font-black text-on-surface tabular-nums mt-0.5">
                                        {formatToPersianDigits(completedDailyTasks)}{' '}
                                        <span className="text-xs font-semibold text-[var(--text-tertiary)]">
                                            از {formatToPersianDigits(dailyTasks.length)} تسک
                                        </span>
                                    </span>
                                </div>
                                <span className="px-2 py-0.5 rounded-full bg-primary/12 text-primary text-[11px] font-extrabold tabular-nums shrink-0">
                                    {formatToPersianDigits(dailyPct)}٪
                                </span>
                            </div>

                            <div className="flex flex-col gap-1.5">
                                <span className="text-[11px] font-semibold text-[var(--text-tertiary)] truncate">
                                    {dailyTasks.length > completedDailyTasks
                                        ? `${formatToPersianDigits(dailyTasks.length - completedDailyTasks)} کار باقی‌مانده`
                                        : dailyTasks.length > 0
                                          ? 'همه کارها انجام شد'
                                          : 'بدون کار ثبت‌شده'}
                                </span>
                                <div className="h-1.5 w-full rounded-full bg-surface-container-high dark:bg-slate-800 overflow-hidden">
                                    <div
                                        className="h-full rounded-full bg-secondary transition-all duration-300"
                                        style={{ width: `${dailyPct}%` }}
                                    />
                                </div>
                            </div>
                        </div>
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
            <section className="bento-card-interactive bg-[var(--surface-elevated)] p-4 sm:p-5 squircle-lg shadow-sm border border-[var(--border-subtle)]">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 mb-3 border-b border-[var(--border-subtle)] gap-3">
                    <div className="flex items-center gap-2">
                        <Calendar size={20} className="text-primary shrink-0" />
                        <h2 className="font-headline-md text-sm sm:text-base font-bold text-on-surface">
                            تقویم هفته جاری | {getShamsiDate(activeDateIso)}
                        </h2>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-auto">
                        <div className="flex items-center gap-1 bg-surface-container-low p-1 rounded-xl border border-[var(--border-subtle)]">
                            <button
                                type="button"
                                aria-label="هفته قبل"
                                onClick={() => setWeekOffset(prev => prev - 1)}
                                className="touch-target p-1.5 rounded-lg hover:bg-surface-container text-[var(--text-secondary)] transition-colors cursor-pointer"
                            >
                                <ChevronRight size={18} />
                            </button>
                            <button
                                type="button"
                                onClick={() => { setWeekOffset(0); setSelectedDateOverride(todayIso); }}
                                className="min-h-[40px] sm:min-h-[32px] px-3 py-1 text-xs font-bold text-primary hover:bg-primary/10 rounded-lg transition-colors cursor-pointer"
                            >
                                امروز
                            </button>
                            <button
                                type="button"
                                aria-label="هفته بعد"
                                onClick={() => setWeekOffset(prev => prev + 1)}
                                className="touch-target p-1.5 rounded-lg hover:bg-surface-container text-[var(--text-secondary)] transition-colors cursor-pointer"
                            >
                                <ChevronLeft size={18} />
                            </button>
                        </div>
                    </div>
                </div>

                {/* 7 Days Liquid Fill Strip — Visual Completion (~32% next-card peek) on mobile, 7-col grid on md+ */}
                <div className="flex md:grid md:grid-cols-7 gap-2 sm:gap-3 overflow-x-auto snap-x snap-mandatory no-scrollbar py-1">
                    {weekDays.map((d) => (
                        <button
                            key={d.iso}
                            type="button"
                            onClick={() => setSelectedDateOverride(d.iso)}
                            className={`touch-target relative overflow-hidden flex flex-col items-center justify-between p-2.5 sm:p-3 squircle-sm border transition-colors duration-150 w-[calc((100%-2rem)/4.35)] min-w-[68px] shrink-0 md:w-auto md:min-w-0 md:shrink snap-start min-h-[96px] sm:min-h-[110px] cursor-pointer group ${
                                d.isSelected
                                    ? 'border-primary ring-2 ring-primary/30 bg-[var(--surface-elevated)]'
                                    : d.isToday
                                        ? 'border-primary/50 bg-surface-container-low/70'
                                        : 'border-[var(--border-subtle)] bg-[var(--surface-elevated)] hover:border-[var(--border-strong)]'
                            }`}
                        >
                            {/* Liquid Fill Layer (Bottom-to-Top Reservoir) */}
                            <div
                                className={`absolute inset-x-0 bottom-0 transition-all duration-300 ease-[cubic-bezier(0.42,0,0.58,1)] pointer-events-none ${
                                    d.isCompleted
                                        ? 'bg-gradient-to-t from-emerald-500/35 via-emerald-500/20 to-emerald-400/10 dark:from-emerald-600/45 dark:via-emerald-500/25 dark:to-emerald-400/15'
                                        : 'bg-gradient-to-t from-primary/30 via-primary/15 to-secondary/10 dark:from-indigo-600/40 dark:via-indigo-500/20 dark:to-cyan-400/10'
                                }`}
                                style={{ height: `${d.pct}%` }}
                            >
                                {d.pct > 0 && d.pct < 100 && (
                                    <div className="absolute top-0 inset-x-0 h-0.5 bg-primary/60 dark:bg-white/60" />
                                )}
                                {d.isCompleted && (
                                    <div className="absolute top-0 inset-x-0 h-0.5 bg-emerald-400/80" />
                                )}
                            </div>

                            {/* Content Layer with z-10 */}
                            <div className="relative z-10 w-full flex flex-col items-center gap-1 text-center">
                                <div className="flex items-center justify-center w-full text-[11px] sm:text-xs">
                                    <span
                                        className="font-bold px-2 py-0.5 rounded-lg bg-surface-container-high/60 dark:bg-slate-700/60 text-on-surface dark:text-white"
                                        title={d.weekday}
                                    >
                                        {d.shortWeekday}
                                    </span>
                                </div>
                                <span className="text-base sm:text-xl font-display-md font-bold text-on-surface dark:text-white my-0.5">
                                    {d.shamsiDayNum}
                                </span>
                            </div>

                            {/* Bottom Reservoir Metric */}
                            <div className="relative z-10 w-full flex items-center justify-between text-xs pt-1 border-t border-[var(--border-subtle)]">
                                <span className="text-[var(--text-secondary)] font-medium">
                                    {formatToPersianDigits(d.done)}/{formatToPersianDigits(d.total)}
                                </span>
                                <span className={`font-bold font-mono ${d.isCompleted ? 'text-emerald-600 dark:text-emerald-400' : 'text-primary'}`}>
                                    {formatToPersianDigits(d.pct)}٪
                                </span>
                            </div>
                        </button>
                    ))}
                </div>
            </section>

            {/* ===== 3. Balanced 2-Column Key Metrics (Clean Single-Elevation Surfaces) ===== */}
            <section className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                {/* Tile 1: Streak / Chain Continuity (Principle 17: Solid Drawing) */}
                <TactileDepthCard className="squircle-card">
                <div className="bg-[var(--surface-elevated)] p-4 sm:p-5 squircle-card border border-[var(--border-subtle)] flex items-center justify-between h-full">
                    <div className="flex flex-col gap-1">
                        <span className="text-xs text-[var(--text-secondary)] font-medium">
                            استمرار مطالعاتی و زنجیره پیوستگی
                        </span>
                        <div className="flex items-baseline gap-1.5">
                            <span className="text-2xl sm:text-3xl font-extrabold text-tertiary tabular-nums">
                                {formatToPersianDigits(streakCount)}
                            </span>
                            <span className="text-xs sm:text-sm font-bold text-on-surface">روز پیوسته</span>
                        </div>
                        <span className="text-xs text-tertiary font-semibold flex items-center gap-1 mt-1 tabular-nums">
                            <TrendingUp size={14} className="shrink-0" aria-hidden="true" />
                            {streakCount > 0
                                ? `بیشترین رکورد ثبت‌شده: ${formatToPersianDigits(streakStats?.longestStreak ?? streakCount)} روز`
                                : 'با ثبت اولین فعالیت امروز زنجیره را روشن کنید'}
                        </span>
                    </div>
                    <div className="w-12 h-12 sm:w-14 sm:h-14 squircle-sm bg-tertiary-fixed/60 flex items-center justify-center text-tertiary shrink-0">
                        <Flame size={26} className="fill-current text-tertiary" aria-hidden="true" />
                    </div>
                </div>
                </TactileDepthCard>

                {/* Tile 2: Task Progress */}
                <div className="bg-[var(--surface-elevated)] p-4 sm:p-5 squircle-card shadow-xs border border-[var(--border-subtle)] flex items-center justify-between">
                    <div className="flex flex-col gap-1 flex-1 pe-4">
                        <span className="text-xs text-[var(--text-secondary)] font-medium">وظایف کلیدی امروز</span>
                        <div className="flex items-baseline gap-1.5">
                            <span className="text-2xl sm:text-3xl font-extrabold text-secondary tabular-nums">
                                {formatToPersianDigits(completedDailyTasks)}
                            </span>
                            <span className="text-xs sm:text-sm font-bold text-on-surface tabular-nums">
                                از {formatToPersianDigits(dailyTasks.length)} تسک
                            </span>
                        </div>
                        <div className="w-full max-w-xs bg-surface-container h-2 rounded-full overflow-hidden mt-2">
                            <div
                                className="bg-secondary h-full rounded-full transition-all duration-300 ease-[cubic-bezier(0.42,0,0.58,1)]"
                                style={{ width: `${dailyPct}%` }}
                            />
                        </div>
                    </div>
                    <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-secondary-fixed/50 flex items-center justify-center text-secondary shrink-0">
                        <CheckCircle2 size={26} aria-hidden="true" />
                    </div>
                </div>
            </section>

            {/* ===== 4. Core Bento Layout (8 Cols Main / 4 Cols Side) ===== */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6 items-start">
                {/* Main 8 Columns */}
                <div className="lg:col-span-8 flex flex-col gap-4 sm:gap-6">
                    {/* ===== Today's Mood Widget (5 Strict Levels + Vector SVGs, No Emojis) ===== */}
                    <div className="bento-card-interactive bg-[var(--surface-elevated)] p-4 sm:p-5 squircle-lg shadow-sm border border-[var(--border-subtle)] flex flex-col gap-3.5">
                        <div className="flex items-center justify-between flex-wrap gap-2">
                            <div className="flex items-center gap-2">
                                <Sparkles size={20} className="text-primary shrink-0" />
                                <h3 className="font-headline-md text-sm sm:text-base font-bold text-on-surface">
                                    مود امروز
                                </h3>
                            </div>
                            <span className="font-label-sm text-xs text-[var(--text-secondary)]">
                                ثبت وضعیت زیستی و روانی برای تطبیق هوشمند فشار مطالعه
                            </span>
                        </div>

                        {/* 5-Level Vector Grid */}
                        <div className="grid grid-cols-2 xs:grid-cols-3 sm:grid-cols-5 gap-2.5">
                            {MOOD_LEVELS.map((m) => {
                                const isSelected = currentMood === m.id;
                                const MoodIcon = m.Icon;
                                return (
                                    <button
                                        key={m.id}
                                        type="button"
                                        onClick={() => {
                                            haptics.selection();
                                            handleSelectMood(m.id);
                                        }}
                                        className={`touch-target flex flex-col items-center justify-center p-3 squircle-sm border transition-all duration-200 cursor-pointer min-h-[76px] gap-1.5 ${
                                            isSelected ? m.themeActive : m.themeDefault
                                        }`}
                                    >
                                        <motion.span
                                            animate={
                                                prefersReducedMotion
                                                    ? undefined
                                                    : isSelected
                                                      ? SQUASH_STRETCH_KEYFRAMES
                                                      : { scaleX: 1, scaleY: 1 }
                                            }
                                            transition={TRANSITION_SQUASH}
                                            className="inline-flex"
                                        >
                                            <MoodIcon className={`w-6 h-6 ${isSelected ? 'scale-110' : m.iconColor} transition-transform`} />
                                        </motion.span>
                                        <span className="font-label-md text-xs font-bold">{m.label}</span>
                                        <span className="font-label-sm text-[10px] opacity-75">{m.subLabel}</span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* ===== Unified Tasks & Integrated Timeblocks Hub ===== */}
                    <div className="bg-[var(--surface-elevated)] p-4 sm:p-6 squircle-lg shadow-sm border border-[var(--border-subtle)] flex flex-col gap-5">
                        {/* 5.1 Integrated Timeblocks Preview Header */}
                        <div className="bg-surface-container-low/70 p-4 squircle-card border border-[var(--border-subtle)] flex flex-col gap-3">
                            <div className="flex items-center justify-between flex-wrap gap-2">
                                <div className="flex items-center gap-2">
                                    <Clock size={18} className="text-secondary shrink-0" />
                                    <h4 className="font-headline-md text-sm sm:text-base font-bold text-on-surface">
                                        بلوک‌های زمانی پیش‌رو
                                    </h4>
                                    {scheduledTimeblocks.length === 0 && (
                                        <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-amber-500/15 text-amber-800 dark:text-amber-300">
                                            الگوی پیشنهادی
                                        </span>
                                    )}
                                </div>
                                <button
                                    type="button"
                                    onClick={() => navigate('/planner')}
                                    className="min-h-[40px] sm:min-h-[32px] px-2 font-label-sm text-xs text-primary hover:underline font-bold cursor-pointer"
                                >
                                    برنامه کامل
                                </button>
                            </div>

                            {/* Continuity Connector Track + Horizontal Timeblock Flow (Visual Completion mobile peek + Connected Steps) */}
                            <div className="relative">
                                {/* Connected Timeline Track on Desktop */}
                                <div className="hidden md:flex items-center justify-between px-12 mb-2 relative" aria-hidden="true">
                                    <div className="absolute inset-x-16 top-1/2 -translate-y-1/2 h-0.5 bg-gradient-to-l from-primary/60 via-secondary/45 to-[var(--border-strong)]" />
                                    {[1, 2, 3].map((stepNum) => (
                                        <span
                                            key={stepNum}
                                            className={`relative z-10 w-5 h-5 rounded-full text-[10px] font-black flex items-center justify-center border ${
                                                stepNum === 1
                                                    ? 'bg-primary text-on-primary border-primary shadow-xs'
                                                    : stepNum === 2
                                                      ? 'bg-secondary-fixed text-on-secondary-fixed border-secondary/40'
                                                      : 'bg-[var(--surface-elevated)] text-[var(--text-secondary)] border-[var(--border-strong)]'
                                            }`}
                                        >
                                            {formatToPersianDigits(stepNum)}
                                        </span>
                                    ))}
                                </div>

                                {scheduledTimeblocks.length > 0 ? (
                                    <div className="flex md:grid md:grid-cols-3 gap-2.5 overflow-x-auto snap-x snap-mandatory no-scrollbar pb-1 text-xs">
                                        {scheduledTimeblocks.map((blk, i) => (
                                            <div
                                                key={blk.id}
                                                className={`w-[74%] shrink-0 snap-start md:w-auto p-3 squircle-sm border flex flex-col gap-1.5 relative ${
                                                    i === 0
                                                        ? 'bg-primary-fixed/35 dark:bg-primary-container/25 border-primary/40 ring-2 ring-primary/30 shadow-xs'
                                                        : 'bg-surface-container-lowest dark:bg-slate-800/80 border-outline-variant/10'
                                                }`}
                                            >
                                                <div className="flex items-center justify-between gap-1">
                                                    <span
                                                        className={`font-label-sm text-[10px] px-2 py-0.5 rounded font-bold ${
                                                            i === 0
                                                                ? 'bg-primary text-on-primary'
                                                                : i === 1
                                                                    ? 'bg-secondary-fixed text-on-secondary-fixed'
                                                                    : 'bg-surface-container-highest dark:bg-slate-700 text-on-surface-variant dark:text-gray-300'
                                                        }`}
                                                    >
                                                        {blk.badge}
                                                    </span>
                                                    <span className="text-xs text-on-surface font-semibold tabular-nums" dir="ltr">
                                                        {formatToPersianDigits(blk.timeRange)}
                                                    </span>
                                                </div>
                                                <h5 className={`text-xs font-bold text-on-surface mt-1 line-clamp-1 ${blk.isCompleted ? 'line-through opacity-60' : ''}`}>
                                                    {blk.title}
                                                </h5>
                                                <p className="text-xs text-[var(--text-secondary)] line-clamp-1">
                                                    {blk.subtitle}
                                                </p>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="flex md:grid md:grid-cols-3 gap-2.5 overflow-x-auto snap-x snap-mandatory no-scrollbar pb-1 text-xs">
                                        {/* Suggested Block 1 (Principle 13: Von Restorff focal prominence) */}
                                        <div className="w-[74%] shrink-0 snap-start md:w-auto p-3 squircle-sm bg-primary-fixed/35 border border-primary/40 ring-2 ring-primary/30 shadow-xs flex flex-col gap-1.5">
                                            <div className="flex items-center justify-between">
                                                <span className="text-[11px] bg-primary text-on-primary px-2 py-0.5 rounded font-bold">
                                                    بلوک جاری
                                                </span>
                                                <span className="text-xs text-[var(--text-secondary)] font-semibold">پیشنهادی</span>
                                            </div>
                                            <h5 className="text-xs font-bold text-on-surface mt-1 line-clamp-1">
                                                {dailyTasks[0]?.topic || 'مطالعه متمرکز کلیدی'}
                                            </h5>
                                            <p className="text-xs text-[var(--text-secondary)] line-clamp-1">
                                                {dailyTasks[0]?.subject || 'برای زمان‌بندی دقیق به تایم‌لاین بروید'}
                                            </p>
                                        </div>

                                        {/* Suggested Block 2 */}
                                        <div className="w-[74%] shrink-0 snap-start md:w-auto p-3 squircle-sm bg-[var(--surface-elevated)] border border-[var(--border-subtle)] flex flex-col gap-1.5">
                                            <div className="flex items-center justify-between">
                                                <span className="text-[11px] bg-secondary-fixed text-on-secondary-fixed px-2 py-0.5 rounded font-semibold">
                                                    استراحت هوشمند
                                                </span>
                                                <span className="text-xs text-[var(--text-secondary)]">۱۵ دقیقه</span>
                                            </div>
                                            <h5 className="text-xs font-bold text-on-surface mt-1 line-clamp-1">
                                                ریکاوری ذهن و نوشیدن آب
                                            </h5>
                                            <p className="text-xs text-[var(--text-secondary)] line-clamp-1">فاصله گرفتن از نمایشگر بین بلوک‌ها</p>
                                        </div>

                                        {/* Suggested Block 3 */}
                                        <div className="w-[74%] shrink-0 snap-start md:w-auto p-3 squircle-sm bg-[var(--surface-elevated)] border border-[var(--border-subtle)] flex flex-col gap-1.5">
                                            <div className="flex items-center justify-between">
                                                <span className="text-[11px] bg-surface-container-highest text-[var(--text-secondary)] px-2 py-0.5 rounded font-semibold">
                                                    بلوک عصر
                                                </span>
                                                <span className="text-xs text-[var(--text-secondary)]">مرور</span>
                                            </div>
                                            <h5 className="text-xs font-bold text-on-surface mt-1 line-clamp-1">
                                                {dailyTasks[1]?.topic || 'مرور و تثبیت یادداشت‌ها'}
                                            </h5>
                                            <p className="text-xs text-[var(--text-secondary)] line-clamp-1">
                                                {dailyTasks[1]?.subject || 'زمان‌بندی نشده در تایم‌لاین'}
                                            </p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* 5.2 Tasks List Header */}
                        <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-[var(--border-subtle)]">
                            <div className="flex items-center gap-2">
                                <CheckCircle2 size={20} className="text-primary" />
                                <h3 className="font-headline-md text-base font-bold text-on-surface">
                                    تسک‌های امروز ({formatToPersianDigits(completedDailyTasks)} از {formatToPersianDigits(dailyTasks.length)})
                                </h3>
                            </div>
                            <div className="flex items-center gap-1.5 flex-wrap">
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
                                <button
                                    type="button"
                                    onClick={() => navigate('/subjects')}
                                    className="md:hidden min-h-[40px] text-xs text-[var(--text-secondary)] hover:text-on-surface font-bold hover:bg-surface-container px-2.5 py-1 rounded-lg transition cursor-pointer"
                                >
                                    مدیریت حوزه‌ها
                                </button>
                                <button
                                    type="button"
                                    onClick={openNewTaskModal}
                                    className="min-h-[40px] sm:min-h-[34px] text-xs text-primary font-bold hover:bg-primary/10 px-2.5 py-1 rounded-lg transition flex items-center gap-1 cursor-pointer"
                                >
                                    <Plus size={14} />
                                    افزودن تسک
                                </button>
                            </div>
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

            {/* ===== Bottom Bento: Brain Dump & Quick Capture Bar ===== */}
            <section className="bg-[var(--surface-elevated)] p-4 squircle-lg shadow-xs border border-[var(--border-subtle)] flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-3 w-full md:w-auto">
                    <div className="w-10 h-10 rounded-xl bg-primary-fixed flex items-center justify-center text-on-primary-fixed shrink-0">
                        <Sparkles size={20} aria-hidden="true" />
                    </div>
                    <div className="flex flex-col text-right">
                        <span className="text-xs sm:text-sm font-bold text-on-surface">
                            تخلیه ذهن و ثبت سریع
                        </span>
                        <span className="text-xs text-[var(--text-secondary)]">
                            {brainDumpFeedback || 'ثبت هرگونه ایده، استرس لحظه‌ای یا وظیفه سریع بدون خروج از تمرکز'}
                        </span>
                    </div>
                </div>

                <form onSubmit={handleBrainDumpSubmit} className="relative w-full md:w-2/5 flex items-center">
                    <input
                        type="text"
                        value={brainDumpText}
                        onChange={(e) => setBrainDumpText(e.target.value)}
                        placeholder="ثبت ایده یا تسک جدید..."
                        aria-label="ثبت سریع ایده یا تسک"
                        className="w-full min-h-[48px] ps-4 pe-24 bg-surface-container-low rounded-xl text-on-surface text-base sm:text-sm placeholder:text-[var(--text-secondary)] focus:outline-none focus:bg-[var(--surface-elevated)] focus:border-primary border border-[var(--border-subtle)] transition-all"
                    />
                    <button
                        type="submit"
                        className="touch-target absolute end-1.5 px-3 py-1.5 bg-primary text-on-primary rounded-lg font-bold text-xs hover:brightness-110 transition-all cursor-pointer min-h-[40px]"
                    >
                        ثبت سریع
                    </button>
                </form>
            </section>

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
