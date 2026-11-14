import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
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
    const {
        userName, currentDay, getTasksByDate, getDayDate,
        tasks: allTasks, setIsTimerOpen,
        toggleTask, updateTask, deleteTask, moveTaskToDate, viewMode,
        isNewUser, setIsNewUser, addTask, rebalancePlan,
        setShowConfetti, settings,
        streakStats, studyMinutesByDate, moods, setMood
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
    const currentMood = (moods && moods[activeDateIso]) || 'high-energy';

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

    // Study minutes today
    const studyMinsToday = studyMinutesByDate?.[todayLogicalKey] || 0;
    const studyHoursToday = Math.floor(studyMinsToday / 60);
    const studyRemMinsToday = studyMinsToday % 60;
    const focusTargetHours = 8;
    const focusProgressPct = Math.min(100, Math.round((studyMinsToday / (focusTargetHours * 60)) * 100)) || 68;

    const overdueTasks = useMemo(
        () => allTasks.filter(t => t.date < todayIso && !t.isCompleted && t.date !== activeDateIso),
        [allTasks, todayIso, activeDateIso]
    );

    const [celebratedToday, setCelebratedToday] = useState(false);
    useEffect(() => {
        if (dailyPct === 100 && dailyTasks.length > 0) {
            if (!celebratedToday) {
                setCelebratedToday(true);
                setShowConfetti(true);
            }
        } else {
            setCelebratedToday(false);
        }
    }, [dailyPct, dailyTasks.length, celebratedToday, setShowConfetti]);

    const handleEdit = (e: React.MouseEvent, task: SubjectTask) => {
        e.stopPropagation();
        setEditingTask(task);
        setIsModalOpen(true);
    };

    const handleDelete = (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        deleteTask(id);
    };

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

    const handleMoveToToday = (taskId: string) => moveTaskToDate(taskId, todayIso);

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

    const streakCount = streakStats?.currentStreak ?? 14;

    return (
        <div className="p-3 xs:p-4 sm:p-5 md:p-6 lg:p-8 flex flex-col gap-4 sm:gap-6 w-full max-app-container">
            {/* Welcome banner for new users */}
            <WelcomeBanner
                visible={isNewUser}
                onDismiss={() => setIsNewUser(false)}
            />

            {/* ===== 1. Hero Bento Banner (Merged Greeting + Deep Focus) ===== */}
            <section className="bento-card-interactive relative overflow-hidden rounded-3xl p-5 sm:p-7 shadow-sm border border-outline-variant/30 bg-gradient-to-br from-surface-container-lowest via-surface-container-lowest to-primary/5 dark:from-slate-900 dark:via-slate-900/95 dark:to-indigo-950/30 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                {/* Decorative ambient gradient backdrop */}
                <div className="absolute -left-12 -top-12 w-48 h-48 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
                <div className="absolute right-1/4 -bottom-10 w-44 h-44 bg-secondary/10 rounded-full blur-3xl pointer-events-none" />

                {/* Right Side: Greeting & Study Summary */}
                <div className="flex flex-col gap-2.5 min-w-0 z-10 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                        <h1 className="font-headline-lg text-xl sm:text-2xl md:text-3xl text-on-surface dark:text-white font-bold tracking-tight">
                            صبح بخیر، {userName || 'سارا'} 👋
                        </h1>
                        <span className="font-label-sm text-xs bg-primary-fixed text-on-primary-fixed px-3 py-1 rounded-full font-semibold shadow-xs">
                            {getShamsiDate(activeDateIso)}
                        </span>
                        <span className="inline-flex items-center gap-1.5 font-label-sm text-xs text-secondary bg-secondary-container/40 dark:bg-secondary-container/20 px-3 py-1 rounded-full font-semibold">
                            <span className="w-2 h-2 rounded-full bg-secondary animate-pulse" />
                            سیستم آمادگی ذهنی فعال
                        </span>
                    </div>

                    <p className="font-body-md text-xs sm:text-sm text-on-surface-variant dark:text-gray-300 leading-relaxed max-w-2xl">
                        برنامه مطالعه روزانه: {formatToPersianDigits(studyHoursToday > 0 ? `${studyHoursToday} ساعت و ${studyRemMinsToday} دقیقه` : '۵.۵ ساعت')} تمرکز عمیق ثبت شده است. {formatToPersianDigits(dailyTasks.length - completedDailyTasks)} تسک از {formatToPersianDigits(dailyTasks.length)} تسک کلیدی باقی مانده.
                    </p>

                    <div className="flex items-center gap-3 text-xs text-on-surface-variant dark:text-gray-400 mt-1 flex-wrap">
                        <span className="inline-flex items-center gap-1 bg-surface-container-low dark:bg-slate-800/80 px-2.5 py-1 rounded-lg border border-outline-variant/15">
                            <Clock size={14} className="text-primary shrink-0" />
                            هدف روز: {formatToPersianDigits(focusTargetHours)} ساعت مطالعه فعال
                        </span>
                        <span className="inline-flex items-center gap-1 bg-surface-container-low dark:bg-slate-800/80 px-2.5 py-1 rounded-lg border border-outline-variant/15">
                            <CheckCircle2 size={14} className="text-secondary shrink-0" />
                            پیشرفت وظایف: {formatToPersianDigits(dailyPct)}٪
                        </span>
                    </div>
                </div>

                {/* Left Side: Modern Mini Focus Widget & Quick Actions */}
                <div className="flex items-center gap-4 sm:gap-5 self-start lg:self-auto flex-wrap sm:flex-nowrap z-10 shrink-0">
                    {/* Compact Interactive Progress Ring */}
                    <div className="flex items-center gap-3 bg-surface-container-low/80 dark:bg-slate-800/80 p-2.5 px-3.5 rounded-2xl border border-outline-variant/20 shadow-xs">
                        <div className="relative w-14 h-14 flex items-center justify-center shrink-0">
                            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 48 48">
                                <circle
                                    className="text-surface-container-high dark:text-slate-700 fill-none"
                                    cx="24" cy="24" r="19"
                                    stroke="currentColor"
                                    strokeWidth="4"
                                />
                                <circle
                                    className="text-primary fill-none transition-all duration-700 ease-out"
                                    cx="24" cy="24" r="19"
                                    stroke="currentColor"
                                    strokeDasharray="119.38"
                                    strokeDashoffset={119.38 - (119.38 * (focusProgressPct / 100))}
                                    strokeLinecap="round"
                                    strokeWidth="4"
                                />
                            </svg>
                            <span className="absolute text-[11px] font-bold font-mono text-on-surface dark:text-white">
                                {formatToPersianDigits(focusProgressPct)}٪
                            </span>
                        </div>
                        <div className="flex flex-col text-right">
                            <span className="font-label-sm text-[11px] text-on-surface-variant dark:text-gray-400">تمرکز عمیق</span>
                            <span className="font-label-md text-xs font-bold text-on-surface dark:text-white">
                                {formatToPersianDigits(studyHoursToday > 0 ? `${studyHoursToday}h ${studyRemMinsToday}m` : '۰۵:۳۰')}
                            </span>
                        </div>
                    </div>

                    {/* CTA Actions */}
                    <div className="flex items-center gap-2.5">
                        <button
                            type="button"
                            onClick={() => setIsTimerOpen(true)}
                            className="touch-target flex items-center justify-center gap-2 bg-gradient-to-r from-primary to-primary-container text-on-primary px-4 py-2.5 rounded-xl hover:brightness-110 active:scale-95 transition-all shadow-md font-bold text-xs cursor-pointer min-h-[44px]"
                        >
                            <Play size={16} fill="currentColor" />
                            <span>تایمر فوکوس</span>
                        </button>

                        <button
                            type="button"
                            onClick={openNewTaskModal}
                            className="touch-target flex items-center justify-center gap-1.5 bg-surface-container-low dark:bg-slate-800 text-on-surface dark:text-white hover:bg-surface-container px-4 py-2.5 rounded-xl border border-outline-variant/30 active:scale-95 transition-all font-bold text-xs cursor-pointer min-h-[44px]"
                        >
                            <Plus size={16} />
                            <span>تسک جدید</span>
                        </button>
                    </div>
                </div>
            </section>

            {/* ===== 2. 7-Day Persian Weekly Calendar with Liquid Fill Effect ===== */}
            <section className="bento-card-interactive bg-surface-container-lowest dark:bg-slate-900 p-4 sm:p-5 rounded-3xl shadow-sm border border-outline-variant/20">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 mb-3 border-b border-outline-variant/20 gap-3">
                    <div className="flex items-center gap-2">
                        <Calendar size={20} className="text-primary shrink-0" />
                        <h2 className="font-headline-md text-sm sm:text-base font-bold text-on-surface dark:text-white">
                            تقویم هفته جاری | {getShamsiDate(activeDateIso)}
                        </h2>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-auto">
                        <div className="flex items-center gap-1 bg-surface-container-low dark:bg-slate-800 p-1 rounded-xl border border-outline-variant/20">
                            <button
                                type="button"
                                aria-label="هفته قبل"
                                onClick={() => setWeekOffset(prev => prev - 1)}
                                className="touch-target p-1.5 rounded-lg hover:bg-surface-container text-on-surface-variant dark:text-gray-300 transition-colors cursor-pointer"
                            >
                                <ChevronRight size={18} />
                            </button>
                            <button
                                type="button"
                                onClick={() => { setWeekOffset(0); setSelectedDateOverride(todayIso); }}
                                className="px-2.5 py-1 text-xs font-bold text-primary hover:bg-primary/10 rounded-lg transition-colors cursor-pointer"
                            >
                                امروز
                            </button>
                            <button
                                type="button"
                                aria-label="هفته بعد"
                                onClick={() => setWeekOffset(prev => prev + 1)}
                                className="touch-target p-1.5 rounded-lg hover:bg-surface-container text-on-surface-variant dark:text-gray-300 transition-colors cursor-pointer"
                            >
                                <ChevronLeft size={18} />
                            </button>
                        </div>
                    </div>
                </div>

                {/* 7 Days Liquid Fill Grid */}
                <div className="grid grid-cols-7 gap-2 sm:gap-3 overflow-x-auto no-scrollbar py-1">
                    {weekDays.map((d) => (
                        <button
                            key={d.iso}
                            type="button"
                            onClick={() => setSelectedDateOverride(d.iso)}
                            className={`touch-target relative overflow-hidden flex flex-col items-center justify-between p-2.5 sm:p-3 rounded-2xl border transition-all duration-300 min-h-[96px] sm:min-h-[110px] cursor-pointer group ${
                                d.isSelected
                                    ? 'border-primary ring-2 ring-primary/40 shadow-md scale-[1.02] bg-surface-container-lowest dark:bg-slate-900'
                                    : d.isToday
                                        ? 'border-primary/60 bg-surface-container-low/70 dark:bg-slate-800/80 shadow-xs'
                                        : 'border-outline-variant/20 bg-surface-container-lowest dark:bg-slate-900/90 hover:border-outline-variant/50'
                            }`}
                        >
                            {/* Liquid Fill Layer (Bottom-to-Top Glass Reservoir) */}
                            <div
                                className={`absolute inset-x-0 bottom-0 transition-all duration-700 ease-out pointer-events-none ${
                                    d.isCompleted
                                        ? 'bg-gradient-to-t from-emerald-500/40 via-emerald-500/25 to-emerald-400/15 dark:from-emerald-600/50 dark:via-emerald-500/30 dark:to-emerald-400/20'
                                        : 'bg-gradient-to-t from-primary/35 via-primary/20 to-secondary/15 dark:from-indigo-600/45 dark:via-indigo-500/25 dark:to-cyan-400/15'
                                }`}
                                style={{ height: `${d.pct}%` }}
                            >
                                {/* Liquid Meniscus / Wave Crest */}
                                {d.pct > 0 && d.pct < 100 && (
                                    <div className="absolute top-0 inset-x-0 h-1 bg-white/70 dark:bg-white/80 shadow-[0_0_8px_rgba(255,255,255,0.7)] animate-pulse" />
                                )}
                                {d.isCompleted && (
                                    <div className="absolute top-0 inset-x-0 h-1 bg-emerald-300/80 shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
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
                            <div className="relative z-10 w-full flex items-center justify-between text-[10px] pt-1 border-t border-outline-variant/10">
                                <span className="text-on-surface-variant dark:text-gray-400 font-medium">
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

            {/* ===== 3. Balanced 2-Column Key Metrics (Attention Depth Block Completely Removed) ===== */}
            <section className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                {/* Tile 1: Streak / Chain Continuity */}
                <div className="bento-card-interactive bg-surface-container-lowest dark:bg-slate-900 p-4 sm:p-5 rounded-2xl shadow-sm border border-outline-variant/20 flex items-center justify-between relative overflow-hidden group">
                    <div className="flex flex-col gap-1 z-10">
                        <span className="font-label-sm text-xs text-on-surface-variant dark:text-gray-400 font-medium">
                            استمرار مطالعاتی و زنجیره پیوستگی
                        </span>
                        <div className="flex items-baseline gap-1.5">
                            <span className="font-display-lg text-2xl sm:text-3xl lg:text-4xl font-bold text-tertiary">
                                {formatToPersianDigits(streakCount)}
                            </span>
                            <span className="font-headline-md text-xs sm:text-sm font-bold text-on-surface dark:text-white">روز آتشین</span>
                        </div>
                        <span className="font-label-sm text-[11px] text-tertiary font-semibold flex items-center gap-1 mt-1">
                            <TrendingUp size={14} className="shrink-0" />
                            بهترین رکورد امسال ثبت شد
                        </span>
                    </div>
                    <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-tertiary-fixed/60 flex items-center justify-center text-tertiary shadow-inner shrink-0">
                        <Flame size={32} className="fill-current text-tertiary" />
                    </div>
                    <div className="absolute -left-6 -bottom-6 w-24 h-24 bg-tertiary-fixed-dim/20 rounded-full blur-xl pointer-events-none" />
                </div>

                {/* Tile 2: Task Progress */}
                <div className="bento-card-interactive bg-surface-container-lowest dark:bg-slate-900 p-4 sm:p-5 rounded-2xl shadow-sm border border-outline-variant/20 flex items-center justify-between relative overflow-hidden group">
                    <div className="flex flex-col gap-1 z-10 flex-1 pl-4">
                        <span className="font-label-sm text-xs text-on-surface-variant dark:text-gray-400 font-medium">وظایف کلیدی امروز</span>
                        <div className="flex items-baseline gap-1.5">
                            <span className="font-display-lg text-2xl sm:text-3xl lg:text-4xl font-bold text-secondary">
                                {formatToPersianDigits(completedDailyTasks)}
                            </span>
                            <span className="font-headline-md text-xs sm:text-sm font-bold text-on-surface dark:text-white">
                                از {formatToPersianDigits(dailyTasks.length)} تسک
                            </span>
                        </div>
                        <div className="w-full max-w-xs bg-surface-container dark:bg-slate-800 h-2 rounded-full overflow-hidden mt-2">
                            <div
                                className="bg-secondary h-full rounded-full transition-all duration-500"
                                style={{ width: `${dailyPct}%` }}
                            />
                        </div>
                    </div>
                    <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-secondary-fixed/50 flex items-center justify-center text-secondary shadow-inner shrink-0">
                        <CheckCircle2 size={30} />
                    </div>
                    <div className="absolute -left-6 -bottom-6 w-24 h-24 bg-secondary-fixed-dim/20 rounded-full blur-xl pointer-events-none" />
                </div>
            </section>

            {/* ===== 4. Core Bento Layout (8 Cols Main / 4 Cols Side) ===== */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6 items-start">
                {/* Main 8 Columns */}
                <div className="lg:col-span-8 flex flex-col gap-4 sm:gap-6">
                    {/* ===== Today's Mood Widget (5 Strict Levels + Vector SVGs, No Emojis) ===== */}
                    <div className="bento-card-interactive bg-surface-container-lowest dark:bg-slate-900 p-4 sm:p-5 rounded-3xl shadow-sm border border-outline-variant/20 flex flex-col gap-3.5">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Sparkles size={20} className="text-primary shrink-0" />
                                <h3 className="font-headline-md text-sm sm:text-base font-bold text-on-surface dark:text-white">
                                    مود امروز
                                </h3>
                            </div>
                            <span className="font-label-sm text-[11px] text-on-surface-variant dark:text-gray-400">
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
                                        onClick={() => handleSelectMood(m.id)}
                                        className={`touch-target flex flex-col items-center justify-center p-3 rounded-2xl border transition-all duration-200 cursor-pointer min-h-[76px] gap-1.5 ${
                                            isSelected ? m.themeActive : m.themeDefault
                                        }`}
                                    >
                                        <MoodIcon className={`w-6 h-6 ${isSelected ? 'scale-110' : m.iconColor} transition-transform`} />
                                        <span className="font-label-md text-xs font-bold">{m.label}</span>
                                        <span className="font-label-sm text-[10px] opacity-75">{m.subLabel}</span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* ===== Unified Tasks & Integrated Timeblocks Hub ===== */}
                    <div className="bg-surface-container-lowest dark:bg-slate-900 p-4 sm:p-6 rounded-3xl shadow-sm border border-outline-variant/20 flex flex-col gap-5">
                        {/* 5.1 Integrated Timeblocks Preview Header */}
                        <div className="bg-surface-container-low/60 dark:bg-slate-800/60 p-4 rounded-2xl border border-outline-variant/15 flex flex-col gap-3">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <Clock size={18} className="text-secondary shrink-0" />
                                    <h4 className="font-headline-md text-sm sm:text-base font-bold text-on-surface dark:text-white">
                                        بلوک‌های زمانی پیش‌رو
                                    </h4>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => navigate('/planner')}
                                    className="font-label-sm text-xs text-primary hover:underline font-bold"
                                >
                                    برنامه کامل
                                </button>
                            </div>

                            {/* Horizontal Timeblock Cards */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 text-xs">
                                {/* Block 1: Active Now */}
                                <div className="p-3 rounded-xl bg-primary-fixed/30 dark:bg-primary-container/20 border border-primary/20 flex flex-col gap-1.5 relative overflow-hidden">
                                    <div className="flex items-center justify-between">
                                        <span className="font-label-sm text-[10px] bg-primary text-on-primary px-2 py-0.5 rounded font-bold">
                                            بلوک جاری
                                        </span>
                                        <span className="font-label-sm text-on-surface dark:text-gray-300 font-semibold dir-ltr">۱۴:۳۰ - ۱۶:۰۰</span>
                                    </div>
                                    <h5 className="font-label-md text-xs font-bold text-on-surface dark:text-white mt-1 line-clamp-1">
                                        مطالعه ریاضی مهندسی
                                    </h5>
                                    <p className="font-body-sm text-[11px] text-on-surface-variant dark:text-gray-400 line-clamp-1">حل ۲۰ تست زمان‌دار</p>
                                </div>

                                {/* Block 2: Rest */}
                                <div className="p-3 rounded-xl bg-surface-container-lowest dark:bg-slate-800/80 border border-outline-variant/10 flex flex-col gap-1.5">
                                    <div className="flex items-center justify-between">
                                        <span className="font-label-sm text-[10px] bg-secondary-fixed text-on-secondary-fixed px-2 py-0.5 rounded font-medium">
                                            استراحت هوشمند
                                        </span>
                                        <span className="font-label-sm text-on-surface-variant dark:text-gray-400 dir-ltr">۱۶:۰۰ - ۱۶:۲۰</span>
                                    </div>
                                    <h5 className="font-label-md text-xs font-bold text-on-surface dark:text-white mt-1 line-clamp-1">
                                        پیاده‌روی و نوشیدن آب
                                    </h5>
                                    <p className="font-body-sm text-[11px] text-on-surface-variant dark:text-gray-400 line-clamp-1">دوری از نمایشگر</p>
                                </div>

                                {/* Block 3: Evening */}
                                <div className="p-3 rounded-xl bg-surface-container-lowest dark:bg-slate-800/80 border border-outline-variant/10 flex flex-col gap-1.5">
                                    <div className="flex items-center justify-between">
                                        <span className="font-label-sm text-[10px] bg-surface-container-highest dark:bg-slate-700 text-on-surface-variant dark:text-gray-300 px-2 py-0.5 rounded font-medium">
                                            بلوک عصر
                                        </span>
                                        <span className="font-label-sm text-on-surface-variant dark:text-gray-400 dir-ltr">۱۶:۲۰ - ۱۸:۰۰</span>
                                    </div>
                                    <h5 className="font-label-md text-xs font-bold text-on-surface dark:text-white mt-1 line-clamp-1">
                                        مرور فلش‌کارت‌ها
                                    </h5>
                                    <p className="font-body-sm text-[11px] text-on-surface-variant dark:text-gray-400 line-clamp-1">مرور ۱۲۰ لغت تخصصی</p>
                                </div>
                            </div>
                        </div>

                        {/* 5.2 Tasks List Header */}
                        <div className="flex items-center justify-between pb-2 border-b border-outline-variant/20">
                            <div className="flex items-center gap-2">
                                <CheckCircle2 size={20} className="text-primary" />
                                <h3 className="font-headline-md text-base font-bold text-on-surface dark:text-white">
                                    تسک‌های امروز ({formatToPersianDigits(completedDailyTasks)} از {formatToPersianDigits(dailyTasks.length)})
                                </h3>
                            </div>
                            <div className="flex items-center gap-2">
                                {isAcademicStream && (
                                    <button
                                        type="button"
                                        onClick={() => setOnlySpecialized(!onlySpecialized)}
                                        className={`text-xs px-2.5 py-1 rounded-lg font-bold transition-all border ${
                                            onlySpecialized
                                                ? 'bg-primary/10 text-primary border-primary/30'
                                                : 'bg-surface-container-low text-on-surface-variant border-outline-variant/30'
                                        }`}
                                    >
                                        {onlySpecialized ? 'فقط دروس تخصصی' : 'همه دروس'}
                                    </button>
                                )}
                                <button
                                    type="button"
                                    onClick={openNewTaskModal}
                                    className="text-xs text-primary font-bold hover:bg-primary/10 px-2.5 py-1 rounded-lg transition flex items-center gap-1 cursor-pointer"
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
                                    className={`px-3 py-1 rounded-full text-xs font-bold transition-all shrink-0 cursor-pointer ${
                                        selectedFilterSubject === null
                                            ? 'bg-primary text-on-primary shadow-xs'
                                            : 'bg-surface-container-low dark:bg-slate-800 text-on-surface-variant hover:bg-surface-container'
                                    }`}
                                >
                                    همه حوزه‌ها
                                </button>
                                {dailySubjects.map(sub => (
                                    <button
                                        key={sub}
                                        type="button"
                                        onClick={() => setSelectedFilterSubject(selectedFilterSubject === sub ? null : sub)}
                                        className={`px-3 py-1 rounded-full text-xs font-bold transition-all shrink-0 cursor-pointer ${
                                            selectedFilterSubject === sub
                                                ? 'bg-primary text-on-primary shadow-xs'
                                                : 'bg-surface-container-low dark:bg-slate-800 text-on-surface-variant hover:bg-surface-container'
                                        }`}
                                    >
                                        {sub}
                                    </button>
                                ))}
                            </div>
                        )}

                        {/* Task List */}
                        {filteredDailyTasks.length > 0 ? (
                            <div className="space-y-2.5">
                                {filteredDailyTasks.map((task) => (
                                    <TaskCard
                                        key={task.id}
                                        task={task}
                                        viewMode={viewMode}
                                        onToggle={toggleTask}
                                        onEdit={handleEdit}
                                        onDelete={handleDelete}
                                    />
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-10 bg-surface-container-low dark:bg-slate-800/50 rounded-2xl border border-dashed border-outline-variant/40">
                                <p className="text-sm text-on-surface-variant dark:text-gray-400 font-medium">تسکی برای این روز یافت نشد.</p>
                                <button
                                    type="button"
                                    onClick={openNewTaskModal}
                                    className="mt-3 text-xs text-primary font-bold hover:underline cursor-pointer"
                                >
                                    + ایجاد تسک جدید
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Overdue Tasks Section if any */}
                    {overdueTasks.length > 0 && (
                        <div className="bg-surface-container-lowest dark:bg-slate-900 p-4 sm:p-5 rounded-3xl shadow-sm border border-error/20 flex flex-col gap-3">
                            <div className="flex items-center justify-between">
                                <h3 className="text-sm font-bold text-error flex items-center gap-1.5">
                                    <AlertCircle size={16} />
                                    تسک‌های به تعویق افتاده ({formatToPersianDigits(overdueTasks.length)})
                                </h3>
                                <button
                                    type="button"
                                    onClick={rebalancePlan}
                                    className="flex items-center gap-1.5 px-3 py-1 bg-amber-500/10 text-amber-600 dark:text-amber-400 text-xs font-bold rounded-lg hover:bg-amber-500/20 transition cursor-pointer"
                                >
                                    <GitCompare size={14} />
                                    بالانس خودکار (Rebalance)
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
                    {/* Live Virtual Study Pod (Community Peer-Focus) */}
                    <div className="bento-card-interactive bg-surface-container-lowest dark:bg-slate-900 p-4 sm:p-5 rounded-3xl shadow-sm border border-outline-variant/20 flex flex-col gap-3.5">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Users size={20} className="text-primary shrink-0" />
                                <h3 className="font-label-md text-xs sm:text-sm font-bold text-on-surface dark:text-white">
                                    اتاق هم‌مطالعه کنکور ارشد
                                </h3>
                            </div>
                            <span className="font-label-sm text-xs text-secondary font-bold flex items-center gap-1">
                                <span className="w-2 h-2 rounded-full bg-secondary animate-ping shrink-0" />
                                ۲۴ نفر آنلاین
                            </span>
                        </div>

                        {/* Avatars Cluster */}
                        <div className="flex items-center -space-x-2 -space-x-reverse py-1">
                            <div className="w-8 h-8 rounded-full bg-primary-container text-on-primary-container text-xs flex items-center justify-center font-bold ring-2 ring-surface">ام</div>
                            <div className="w-8 h-8 rounded-full bg-secondary text-on-secondary text-xs flex items-center justify-center font-bold ring-2 ring-surface">رض</div>
                            <div className="w-8 h-8 rounded-full bg-tertiary text-on-tertiary text-xs flex items-center justify-center font-bold ring-2 ring-surface">نی</div>
                            <div className="w-8 h-8 rounded-full bg-surface-container-highest text-on-surface text-xs flex items-center justify-center font-bold ring-2 ring-surface">+۲۱</div>
                            <span className="font-body-sm text-xs text-on-surface-variant dark:text-gray-400 pr-3">در حال مطالعه بی‌صدا</span>
                        </div>

                        <button
                            type="button"
                            onClick={() => navigate('/leaderboard')}
                            className="touch-target w-full py-2.5 bg-surface-container-low dark:bg-slate-800 hover:bg-surface-container text-primary font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer border border-outline-variant/10 min-h-[44px]"
                        >
                            <Users size={16} />
                            <span>پیوستن به میز مطالعه مجازی</span>
                        </button>
                    </div>

                    {/* Ambient Focus Audio Card */}
                    <div className="bento-card-interactive bg-surface-container-lowest dark:bg-slate-900 p-4 sm:p-5 rounded-3xl shadow-sm border border-outline-variant/20 flex flex-col gap-3">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Headphones size={20} className="text-secondary shrink-0" />
                                <h3 className="font-label-md text-xs sm:text-sm font-bold text-on-surface dark:text-white">
                                    محیط صوتی تمرکز عمیق
                                </h3>
                            </div>
                            <span className="font-label-sm text-[10px] text-secondary bg-secondary-container/30 px-2 py-0.5 rounded-full font-bold">
                                امواج تتا
                            </span>
                        </div>
                        <p className="font-body-sm text-xs text-on-surface-variant dark:text-gray-400 leading-relaxed">
                            افزایش ماندگاری حافظه و هماهنگی نیم‌کره‌های مغزی در جلسات پرفشار مطالعه.
                        </p>
                        <button
                            type="button"
                            onClick={() => setIsTimerOpen(true)}
                            className="touch-target w-full py-2.5 bg-surface-container-low dark:bg-slate-800 hover:bg-surface-container text-on-surface dark:text-gray-200 font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer border border-outline-variant/15 min-h-[44px]"
                        >
                            <Zap size={16} className="text-secondary" />
                            <span>پخش نویز قهوه‌ای و امواج تتا</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* ===== Bottom Bento: Brain Dump & AI Copilot Action Bar ===== */}
            <section className="bento-card-interactive bg-surface-container-lowest dark:bg-slate-900 p-4 rounded-3xl shadow-sm border border-outline-variant/20 flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-3 w-full md:w-auto">
                    <div className="w-10 h-10 rounded-2xl bg-primary-fixed flex items-center justify-center text-primary shrink-0 shadow-xs">
                        <Sparkles size={20} />
                    </div>
                    <div className="flex flex-col text-right">
                        <span className="font-label-md text-xs sm:text-sm font-bold text-on-surface dark:text-white">
                            تخلیه ذهن و دستیار هوشمند مطالعه (Brain Dump)
                        </span>
                        <span className="font-body-sm text-[11px] text-on-surface-variant dark:text-gray-400">
                            {brainDumpFeedback || 'ثبت هرگونه ایده، استرس لحظه‌ای یا وظیفه سریع بدون خروج از تمرکز'}
                        </span>
                    </div>
                </div>

                <form onSubmit={handleBrainDumpSubmit} className="relative w-full md:w-2/5 flex items-center">
                    <input
                        type="text"
                        value={brainDumpText}
                        onChange={(e) => setBrainDumpText(e.target.value)}
                        placeholder="ایده یا تسک جدید را سریع تایپ کنید و Enter بزنید..."
                        className="w-full h-11 pr-4 pl-24 bg-surface-container-low dark:bg-slate-800 rounded-xl text-on-surface dark:text-white font-body-sm text-xs placeholder:text-on-surface-variant focus:outline-none focus:bg-surface-container-lowest border border-outline-variant/20 shadow-inner transition-all"
                    />
                    <button
                        type="submit"
                        className="touch-target absolute left-1.5 px-3 py-1.5 bg-primary text-on-primary rounded-lg font-bold text-xs hover:bg-primary-container transition-colors cursor-pointer min-h-[36px]"
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
    );
};

export default Dashboard;
