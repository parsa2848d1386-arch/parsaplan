import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../context/StoreContext';
import {
    Plus, Clock, Zap, TrendingUp, CheckCircle2, Flame,
    ArrowDownToLine, Play, ChevronRight, ChevronLeft, GitCompare,
    RefreshCw, BatteryCharging, Sparkles, Brain, Check, Music,
    Calendar, Users, Eye, Target, Smile, AlertCircle
} from 'lucide-react';
import { getShamsiDate, toIsoString, addDays, parseDate, getDiffDays, formatToPersianDigits } from '../utils';
import { getLogicalDateKey } from '../utils/streakEngine';
import { useFocus } from '../context/FocusContext';
import { TaskCard } from '../components/TaskCard';
import TaskModal from '../components/TaskModal';
import { SubjectTask, isSpecializedSubject } from '../types';
import { WelcomeBanner } from '../components/WelcomeBanner';

/* ===== Animated Counter ===== */
const AnimatedNumber = ({ value, suffix = '' }: { value: number; suffix?: string }) => {
    const [display, setDisplay] = useState(0);
    const prevRef = useRef(0);

    useEffect(() => {
        const start = prevRef.current;
        const end = value;
        if (start === end) return;
        const duration = 700;
        const startTime = performance.now();
        const tick = (now: number) => {
            const p = Math.min((now - startTime) / duration, 1);
            const ease = 1 - Math.pow(1 - p, 3);
            setDisplay(Math.round(start + (end - start) * ease));
            if (p < 1) requestAnimationFrame(tick);
            else prevRef.current = end;
        };
        requestAnimationFrame(tick);
    }, [value]);

    return <span>{formatToPersianDigits(display)}{suffix}</span>;
};

const PERSIAN_WEEKDAYS = ['شنبه', 'یکشنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنج‌شنبه', 'جمعه'] as const;

export const Dashboard: React.FC = () => {
    const navigate = useNavigate();
    const {
        userName, currentDay, getProgress, getTasksByDate, getDayDate,
        tasks: allTasks, totalDays, setIsTimerOpen, level, progressPercent,
        toggleTask, updateTask, deleteTask, moveTaskToDate, viewMode,
        isNewUser, setIsNewUser, addTask, setCurrentDay, rebalancePlan,
        setShowConfetti, settings,
        syncData, syncQueueCount, streakStats, studyMinutesByDate
    } = useStore();

    const [selectedDateOverride, setSelectedDateOverride] = useState<string | null>(null);
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
    const [isSyncing, setIsSyncing] = useState(false);

    // Selected Mood State
    const [selectedMood, setSelectedMood] = useState<'excellent' | 'focused' | 'high-energy' | 'tired' | 'sluggish'>('focused');
    
    // Brain Dump Input State
    const [brainDumpText, setBrainDumpText] = useState('');
    const [brainDumpFeedback, setBrainDumpFeedback] = useState<string | null>(null);

    // Modal State
    const [editingTask, setEditingTask] = useState<SubjectTask | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

    const handleManualSync = async () => {
        setIsSyncing(true);
        try {
            await syncData();
        } finally {
            setIsSyncing(false);
        }
    };

    // 7-day true Persian week ribbon (Sat -> Fri)
    const weekDays = useMemo(() => {
        const baseDate = parseDate(activeDateIso || todayIso);
        const daysSinceSaturday = (baseDate.getDay() + 1) % 7;
        const weekSaturday = addDays(baseDate, -daysSinceSaturday);

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
                shamsiDayNum: formatToPersianDigits(shamsiDayNum),
                done,
                total,
                isToday,
                isSelected,
                isCompleted: total > 0 && done === total,
                pct: total > 0 ? Math.round((done / total) * 100) : 0
            };
        });
    }, [activeDateIso, todayIso, getTasksByDate]);

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
        e.stopPropagation(); setEditingTask(task); setIsModalOpen(true);
    };
    const handleDelete = (e: React.MouseEvent, id: string) => {
        e.stopPropagation(); deleteTask(id);
    };
    const handleSaveTask = (taskData: Partial<SubjectTask>) => {
        if (editingTask) {
            updateTask({ ...editingTask, ...taskData } as SubjectTask);
        } else {
            addTask({ id: crypto.randomUUID(), ...taskData } as SubjectTask);
        }
        setIsModalOpen(false); setEditingTask(null);
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

            {/* ===== Top Welcome Header & Real-time Status ===== */}
            <section className="bento-card-interactive flex flex-col md:flex-row md:items-center justify-between gap-4 bg-surface-container-lowest dark:bg-slate-900 p-4 sm:p-6 rounded-2xl shadow-sm border border-outline-variant/20">
                <div className="flex flex-col gap-1.5 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                        <h1 className="font-headline-lg text-xl sm:text-2xl md:text-3xl text-on-surface dark:text-white font-bold tracking-tight">
                            صبح بخیر، {userName || 'سارا'} 👋
                        </h1>
                        <span className="font-label-sm text-xs bg-primary-fixed text-on-primary-fixed px-2.5 py-0.5 rounded-full font-semibold">
                            کنکور ارشد ۱۴۰۳
                        </span>
                        <span className="inline-flex items-center gap-1.5 font-label-sm text-xs text-secondary bg-secondary-container/40 px-2.5 py-0.5 rounded-full font-semibold">
                            <span className="w-2 h-2 rounded-full bg-secondary animate-pulse" />
                            سیستم آمادگی ذهنی فعال
                        </span>
                    </div>
                    <p className="font-body-md text-xs sm:text-sm text-on-surface-variant dark:text-gray-300 leading-relaxed">
                        برنامه مطالعه روزانه: ۵.۵ ساعت تمرکز عمیق ثبت شده است. {dailyTasks.length - completedDailyTasks} تسک از {dailyTasks.length} تسک کلیدی باقی مانده.
                    </p>
                </div>

                {/* Quick Status Badges & New Task CTA */}
                <div className="flex items-center gap-2.5 self-start md:self-auto flex-wrap">
                    <div className="flex items-center gap-2 bg-surface-container-low dark:bg-slate-800 px-3.5 py-2 rounded-xl text-on-surface dark:text-gray-200 border border-outline-variant/20 shadow-xs">
                        <BatteryCharging size={20} className="text-secondary shrink-0" />
                        <div className="flex flex-col text-right">
                            <span className="font-label-sm text-[10px] text-on-surface-variant dark:text-gray-400">سطح انرژی زیستی</span>
                            <span className="font-label-md text-xs font-bold text-on-surface dark:text-white">۸۵٪ - حالت پرواز</span>
                        </div>
                    </div>

                    <button
                        type="button"
                        onClick={() => { setEditingTask(null); setIsModalOpen(true); }}
                        className="touch-target flex items-center gap-1.5 bg-primary text-on-primary px-4 py-2.5 rounded-xl hover:bg-primary-container transition-all shadow-sm active:scale-95 font-bold text-xs cursor-pointer min-h-[44px]"
                    >
                        <Plus size={18} />
                        <span>تسک جدید</span>
                    </button>
                </div>
            </section>

            {/* ===== 7-Day Persian Weekly Calendar Strip ===== */}
            <section className="bento-card-interactive bg-surface-container-lowest dark:bg-slate-900 p-3 sm:p-4 rounded-2xl shadow-sm border border-outline-variant/20">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-2.5 mb-2.5 border-b border-outline-variant/20 gap-2">
                    <div className="flex items-center gap-2">
                        <Calendar size={18} className="text-primary shrink-0" />
                        <span className="font-label-md text-xs sm:text-sm font-bold text-on-surface dark:text-white">
                            تقویم هفته جاری | {getShamsiDate(activeDateIso)}
                        </span>
                    </div>
                    <div className="flex items-center gap-3 text-on-surface-variant dark:text-gray-400 font-label-sm text-[11px] overflow-x-auto no-scrollbar py-0.5">
                        <span className="flex items-center gap-1 whitespace-nowrap"><span className="w-2 h-2 rounded-full bg-secondary shrink-0" /> تکمیل شده</span>
                        <span className="flex items-center gap-1 whitespace-nowrap"><span className="w-2 h-2 rounded-full bg-primary shrink-0" /> امروز</span>
                        <span className="flex items-center gap-1 whitespace-nowrap"><span className="w-2 h-2 rounded-full bg-outline-variant shrink-0" /> آینده</span>
                    </div>
                </div>

                <div className="grid grid-cols-7 gap-1 sm:gap-2 overflow-x-auto no-scrollbar py-1">
                    {weekDays.map((d) => (
                        <button
                            key={d.iso}
                            type="button"
                            onClick={() => setSelectedDateOverride(d.iso)}
                            className={`touch-target flex flex-col items-center justify-center p-2 rounded-xl transition-all cursor-pointer min-w-[38px] xs:min-w-[44px] ${
                                d.isToday
                                    ? 'bg-primary-container text-on-primary-container shadow-md ring-2 ring-primary ring-offset-2 dark:ring-offset-slate-900 scale-102 font-bold'
                                    : d.isSelected
                                        ? 'bg-surface-container dark:bg-slate-800 text-on-surface dark:text-white border border-primary/40 font-semibold'
                                        : 'bg-surface-container-low dark:bg-slate-800/60 hover:bg-surface-container text-on-surface-variant dark:text-gray-400'
                            }`}
                        >
                            <span className="font-label-sm text-[10px] sm:text-xs opacity-80">{d.label}</span>
                            <span className="font-headline-md text-xs sm:text-base font-bold my-0.5">{d.dayNum}</span>
                            <span className="text-[10px] font-mono opacity-70 hidden sm:inline">{d.shamsiMonth}</span>
                        </button>
                    ))}
                </div>
            </section>

            {/* ===== 3 Key Metric Summary Bento Tiles ===== */}
            <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                {/* Tile 1: Streak */}
                <div className="bento-card-interactive bg-surface-container-lowest dark:bg-slate-900 p-4 sm:p-5 rounded-2xl shadow-sm border border-outline-variant/20 flex items-center justify-between relative overflow-hidden group">
                    <div className="flex flex-col gap-1 z-10">
                        <span className="font-label-sm text-xs text-on-surface-variant dark:text-gray-400 font-medium">استمرار مطالعاتی پیاپی</span>
                        <div className="flex items-baseline gap-1">
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
                    <div className="flex flex-col gap-1 z-10">
                        <span className="font-label-sm text-xs text-on-surface-variant dark:text-gray-400 font-medium">وظایف کلیدی امروز</span>
                        <div className="flex items-baseline gap-1">
                            <span className="font-display-lg text-2xl sm:text-3xl lg:text-4xl font-bold text-secondary">
                                {formatToPersianDigits(completedDailyTasks)}
                            </span>
                            <span className="font-headline-md text-xs sm:text-sm font-bold text-on-surface dark:text-white">
                                از {formatToPersianDigits(dailyTasks.length)} تسک
                            </span>
                        </div>
                        <div className="w-28 sm:w-32 bg-surface-container dark:bg-slate-800 h-2 rounded-full overflow-hidden mt-2">
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

                {/* Tile 3: Focus Quality Score */}
                <div className="bento-card-interactive bg-surface-container-lowest dark:bg-slate-900 p-4 sm:p-5 rounded-2xl shadow-sm border border-outline-variant/20 flex items-center justify-between relative overflow-hidden group sm:col-span-2 lg:col-span-1">
                    <div className="flex flex-col gap-1 z-10">
                        <span className="font-label-sm text-xs text-on-surface-variant dark:text-gray-400 font-medium">شاخص کیفیت و عمق توجه</span>
                        <div className="flex items-baseline gap-1">
                            <span className="font-display-lg text-2xl sm:text-3xl lg:text-4xl font-bold text-primary">
                                ۹۲٪
                            </span>
                            <span className="font-headline-md text-xs sm:text-sm font-bold text-on-surface dark:text-white">نمره بازدهی</span>
                        </div>
                        <span className="font-label-sm text-[11px] text-secondary font-semibold flex items-center gap-1 mt-1">
                            <Zap size={14} className="shrink-0" />
                            عدم انحراف تمرکز از ۸ صبح
                        </span>
                    </div>
                    <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-primary-fixed flex items-center justify-center text-primary shadow-inner shrink-0">
                        <Sparkles size={30} />
                    </div>
                    <div className="absolute -left-6 -bottom-6 w-24 h-24 bg-primary-fixed-dim/20 rounded-full blur-xl pointer-events-none" />
                </div>
            </section>

            {/* ===== Core Bento Layout (8 Cols Main / 4 Cols Side on Desktop) ===== */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6 items-start">
                {/* Left/Main Wide Panel (8 Cols) */}
                <div className="lg:col-span-8 flex flex-col gap-4 sm:gap-6">
                    {/* Primary Deep Focus Card with Interactive Circular Gauge */}
                    <div className="bento-card-interactive bg-surface-container-lowest dark:bg-slate-900 p-4 sm:p-6 rounded-2xl shadow-sm border border-outline-variant/20 flex flex-col justify-between relative overflow-hidden">
                        {/* Header */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                            <div className="flex flex-col gap-1">
                                <div className="flex items-center gap-2">
                                    <Clock size={20} className="text-primary shrink-0" />
                                    <h2 className="font-headline-md text-base sm:text-lg font-bold text-on-surface dark:text-white">تمرکز عمیق امروز</h2>
                                </div>
                                <span className="font-body-sm text-xs text-on-surface-variant dark:text-gray-400">
                                    هدف تنظیم شده: {formatToPersianDigits(focusTargetHours)} ساعت مطالعه فعال تخصصی
                                </span>
                            </div>
                            <div className="flex items-center gap-1 bg-surface-container-low dark:bg-slate-800 p-1 rounded-xl self-start text-xs overflow-x-auto no-scrollbar max-w-full">
                                <button className="px-3 py-1.5 rounded-lg bg-surface-container-lowest dark:bg-slate-700 text-primary font-bold shadow-xs whitespace-nowrap">
                                    پومودورو
                                </button>
                                <button className="px-3 py-1.5 rounded-lg text-on-surface-variant dark:text-gray-300 hover:text-on-surface whitespace-nowrap">
                                    تایمر پیوسته
                                </button>
                                <button className="px-3 py-1.5 rounded-lg text-on-surface-variant dark:text-gray-300 hover:text-on-surface whitespace-nowrap">
                                    کرونومتر معکوس
                                </button>
                            </div>
                        </div>

                        {/* Center Interactive Gauge & Metrics */}
                        <div className="flex flex-col md:flex-row items-center justify-around gap-6 my-2">
                            {/* Circular SVG Progress Ring */}
                            <div className="relative w-48 h-48 sm:w-56 sm:h-56 flex items-center justify-center shrink-0">
                                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 120 120">
                                    {/* Track */}
                                    <circle className="text-surface-container-high dark:text-slate-800 fill-none" cx="60" cy="60" r="50" stroke="currentColor" strokeWidth="8" />
                                    {/* Completed Active Segment (Circumference ~ 314.159) */}
                                    <circle
                                        className="text-primary fill-none transition-all duration-1000"
                                        cx="60" cy="60" r="50"
                                        stroke="currentColor"
                                        strokeDasharray="314.159"
                                        strokeDashoffset={314.159 - (314.159 * (focusProgressPct / 100))}
                                        strokeLinecap="round"
                                        strokeWidth="8"
                                    />
                                    {/* Sub-marker for Rest/Buffer */}
                                    <circle
                                        className="text-secondary/40 fill-none"
                                        cx="60" cy="60" r="42"
                                        stroke="currentColor"
                                        strokeDasharray="263.89"
                                        strokeDashoffset="70"
                                        strokeWidth="3"
                                    />
                                </svg>
                                {/* Center Metric Details */}
                                <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                                    <span className="font-label-sm text-[11px] text-on-surface-variant dark:text-gray-400 font-medium">مجموع ثبت شده</span>
                                    <span className="font-display-lg text-2xl sm:text-3xl font-bold text-on-surface dark:text-white tracking-tight my-0.5">
                                        ۰۵:۳۰
                                    </span>
                                    <span className="font-label-md text-[11px] text-primary font-bold bg-primary-fixed/50 dark:bg-primary-container/30 px-2.5 py-0.5 rounded-full">
                                        {formatToPersianDigits(focusProgressPct)}٪ از تارگت روز
                                    </span>
                                </div>
                            </div>

                            {/* Micro Analytics Columns */}
                            <div className="flex flex-col gap-2.5 w-full max-w-xs text-xs">
                                <div className="bg-surface-container-low dark:bg-slate-800/70 p-3 rounded-xl flex items-center justify-between border border-outline-variant/10">
                                    <div className="flex items-center gap-2">
                                        <span className="w-2.5 h-2.5 rounded-full bg-primary shrink-0" />
                                        <span className="font-body-sm text-on-surface-variant dark:text-gray-400">سپری شده (فوکوس)</span>
                                    </div>
                                    <span className="font-headline-md font-bold text-on-surface dark:text-white">۵ ساعت و ۳۰ دقیقه</span>
                                </div>
                                <div className="bg-surface-container-low dark:bg-slate-800/70 p-3 rounded-xl flex items-center justify-between border border-outline-variant/10">
                                    <div className="flex items-center gap-2">
                                        <span className="w-2.5 h-2.5 rounded-full bg-outline-variant shrink-0" />
                                        <span className="font-body-sm text-on-surface-variant dark:text-gray-400">باقی‌مانده تا سقف هدف</span>
                                    </div>
                                    <span className="font-headline-md font-bold text-on-surface dark:text-white">۲ ساعت و ۳۰ دقیقه</span>
                                </div>
                                <div className="bg-surface-container-low dark:bg-slate-800/70 p-3 rounded-xl flex items-center justify-between border border-outline-variant/10">
                                    <div className="flex items-center gap-2">
                                        <span className="w-2.5 h-2.5 rounded-full bg-secondary shrink-0" />
                                        <span className="font-body-sm text-on-surface-variant dark:text-gray-400">استراحت هوشمند مفید</span>
                                    </div>
                                    <span className="font-headline-md font-bold text-secondary">۴۵ دقیقه</span>
                                </div>
                            </div>
                        </div>

                        {/* Focus CTA Buttons */}
                        <div className="mt-4 flex flex-col sm:flex-row items-center gap-3 pt-4 border-t border-outline-variant/10">
                            <button
                                type="button"
                                onClick={() => setIsTimerOpen(true)}
                                className="touch-target w-full sm:flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-primary to-primary-container text-on-primary font-bold shadow-md hover:shadow-lg hover:brightness-105 active:scale-[0.98] transition-all flex items-center justify-center gap-2 text-xs cursor-pointer min-h-[44px]"
                            >
                                <Play size={18} fill="currentColor" />
                                <span>شروع پومودورو عمیق بعدی (۲۵ دقیقه مطالعه تخصصی)</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => setIsTimerOpen(true)}
                                className="touch-target w-full sm:w-auto py-3 px-4 rounded-xl bg-surface-container-low dark:bg-slate-800 text-on-surface dark:text-gray-200 hover:bg-surface-container transition-colors flex items-center justify-center gap-2 text-xs font-bold cursor-pointer border border-outline-variant/20 min-h-[44px]"
                            >
                                <Music size={18} className="text-secondary shrink-0" />
                                <span>نویز سفید (امواج تتا)</span>
                            </button>
                        </div>
                    </div>

                    {/* Daily Mood & Energy Check-in Bento Widget */}
                    <div className="bento-card-interactive bg-surface-container-lowest dark:bg-slate-900 p-4 sm:p-5 rounded-2xl shadow-sm border border-outline-variant/20 flex flex-col gap-3">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Smile size={20} className="text-tertiary shrink-0" />
                                <h3 className="font-headline-md text-sm sm:text-base font-bold text-on-surface dark:text-white">وضعیت و انرژی زیستی اکنون شما</h3>
                            </div>
                            <span className="font-label-sm text-[11px] text-on-surface-variant dark:text-gray-400">ثبت در لاگ آنالیتیکس زیستی</span>
                        </div>

                        <div className="grid grid-cols-2 xs:grid-cols-3 sm:grid-cols-5 gap-2">
                            <button
                                type="button"
                                onClick={() => setSelectedMood('excellent')}
                                className={`touch-target flex flex-col items-center justify-center p-3 rounded-xl transition-all gap-1 cursor-pointer min-h-[50px] ${
                                    selectedMood === 'excellent'
                                        ? 'bg-primary-fixed text-on-primary-fixed ring-2 ring-primary shadow-xs'
                                        : 'bg-surface-container-low dark:bg-slate-800 text-on-surface dark:text-gray-200 hover:bg-surface-container'
                                }`}
                            >
                                <span className="text-2xl">🌟</span>
                                <span className="font-label-md text-xs font-semibold">عالی</span>
                                <span className="font-label-sm text-[10px] opacity-80">انرژی ۱۰۰٪</span>
                            </button>

                            <button
                                type="button"
                                onClick={() => setSelectedMood('focused')}
                                className={`flex flex-col items-center justify-center p-space-md rounded-xl transition-all gap-space-xs cursor-pointer ${
                                    selectedMood === 'focused'
                                        ? 'bg-primary-fixed text-on-primary-fixed ring-2 ring-primary shadow-xs'
                                        : 'bg-surface-container-low dark:bg-slate-800 text-on-surface dark:text-gray-200 hover:bg-surface-container'
                                }`}
                            >
                                <span className="text-2xl">🎯</span>
                                <span className="font-label-md text-xs font-bold">متمرکز</span>
                                <span className="font-label-sm text-[10px] opacity-80">جریان غرقه‌گی</span>
                            </button>

                            <button
                                type="button"
                                onClick={() => setSelectedMood('high-energy')}
                                className={`flex flex-col items-center justify-center p-space-md rounded-xl transition-all gap-space-xs cursor-pointer ${
                                    selectedMood === 'high-energy'
                                        ? 'bg-primary-fixed text-on-primary-fixed ring-2 ring-primary shadow-xs'
                                        : 'bg-surface-container-low dark:bg-slate-800 text-on-surface dark:text-gray-200 hover:bg-surface-container'
                                }`}
                            >
                                <span className="text-2xl">⚡</span>
                                <span className="font-label-md text-xs font-semibold">پرانرژی</span>
                                <span className="font-label-sm text-[10px] opacity-80">سرعت بالا</span>
                            </button>

                            <button
                                type="button"
                                onClick={() => setSelectedMood('tired')}
                                className={`flex flex-col items-center justify-center p-space-md rounded-xl transition-all gap-space-xs cursor-pointer ${
                                    selectedMood === 'tired'
                                        ? 'bg-primary-fixed text-on-primary-fixed ring-2 ring-primary shadow-xs'
                                        : 'bg-surface-container-low dark:bg-slate-800 text-on-surface dark:text-gray-200 hover:bg-surface-container'
                                }`}
                            >
                                <span className="text-2xl">🥱</span>
                                <span className="font-label-md text-xs font-semibold">خسته</span>
                                <span className="font-label-sm text-[10px] opacity-80">نیاز به استراحت</span>
                            </button>

                            <button
                                type="button"
                                onClick={() => setSelectedMood('sluggish')}
                                className={`col-span-2 sm:col-span-1 flex flex-col items-center justify-center p-space-md rounded-xl transition-all gap-space-xs cursor-pointer ${
                                    selectedMood === 'sluggish'
                                        ? 'bg-primary-fixed text-on-primary-fixed ring-2 ring-primary shadow-xs'
                                        : 'bg-surface-container-low dark:bg-slate-800 text-on-surface dark:text-gray-200 hover:bg-surface-container'
                                }`}
                            >
                                <span className="text-2xl">🌧️</span>
                                <span className="font-label-md text-xs font-semibold">بی‌حوصله</span>
                                <span className="font-label-sm text-[10px] opacity-80">تسک سبک</span>
                            </button>
                        </div>
                    </div>

                    {/* Today's Tasks List Section */}
                    <div className="bg-surface-container-lowest dark:bg-slate-900 p-space-lg rounded-xl shadow-sm border border-outline-variant/20 flex flex-col gap-space-md">
                        <div className="flex items-center justify-between pb-space-xs border-b border-outline-variant/20">
                            <div className="flex items-center gap-space-xs">
                                <CheckCircle2 size={20} className="text-primary" />
                                <h3 className="font-headline-md text-base font-bold text-on-surface dark:text-white">
                                    تسک‌های امروز ({formatToPersianDigits(completedDailyTasks)} از {formatToPersianDigits(dailyTasks.length)})
                                </h3>
                            </div>
                            <div className="flex items-center gap-space-xs">
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
                                        {onlySpecialized ? 'دروس تخصصی 🎯' : 'همه دروس 📚'}
                                    </button>
                                )}
                                <button
                                    type="button"
                                    onClick={() => { setEditingTask(null); setIsModalOpen(true); }}
                                    className="text-xs text-primary font-bold hover:bg-primary/10 px-2.5 py-1 rounded-lg transition flex items-center gap-1"
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
                                    className={`px-3 py-1 rounded-full text-xs font-bold transition-all shrink-0 ${
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
                                        className={`px-3 py-1 rounded-full text-xs font-bold transition-all shrink-0 ${
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
                            <div className="text-center py-10 bg-surface-container-low dark:bg-slate-800/50 rounded-xl border border-dashed border-outline-variant/40">
                                <p className="text-sm text-on-surface-variant dark:text-gray-400 font-medium">تسکی برای این روز یافت نشد.</p>
                                <button
                                    type="button"
                                    onClick={() => { setEditingTask(null); setIsModalOpen(true); }}
                                    className="mt-3 text-xs text-primary font-bold hover:underline"
                                >
                                    + ایجاد تسک جدید
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Overdue Tasks Section if any */}
                    {overdueTasks.length > 0 && (
                        <div className="bg-surface-container-lowest dark:bg-slate-900 p-space-lg rounded-xl shadow-sm border border-error/20 flex flex-col gap-space-md">
                            <div className="flex items-center justify-between">
                                <h3 className="text-sm font-bold text-error flex items-center gap-1.5">
                                    <AlertCircle size={16} />
                                    تسک‌های به تعویق افتاده ({formatToPersianDigits(overdueTasks.length)})
                                </h3>
                                <button
                                    type="button"
                                    onClick={rebalancePlan}
                                    className="flex items-center gap-1.5 px-3 py-1 bg-amber-500/10 text-amber-600 dark:text-amber-400 text-xs font-bold rounded-lg hover:bg-amber-500/20 transition"
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

                {/* Right Side Bento Column (Upcoming Timeblocks & Live Study Room - Span 4) */}
                <div className="lg:col-span-4 flex flex-col gap-space-lg">
                    {/* Timeblocks Preview Widget */}
                    <div className="bg-surface-container-lowest dark:bg-slate-900 p-space-lg rounded-xl shadow-sm border border-outline-variant/20 flex flex-col gap-space-md">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-space-xs">
                                <Clock size={20} className="text-secondary" />
                                <h3 className="font-headline-md text-base font-bold text-on-surface dark:text-white">بلوک‌های زمانی پیش‌رو</h3>
                            </div>
                            <button
                                type="button"
                                onClick={() => navigate('/planner')}
                                className="font-label-sm text-xs text-primary hover:underline font-semibold"
                            >
                                برنامه کامل
                            </button>
                        </div>

                        <div className="flex flex-col gap-space-sm text-xs">
                            {/* Block 1: Active Now */}
                            <div className="p-space-md rounded-xl bg-primary-fixed/30 dark:bg-primary-container/20 border border-primary/20 flex flex-col gap-space-xs relative overflow-hidden">
                                <div className="flex items-center justify-between">
                                    <span className="font-label-sm text-[10px] bg-primary text-on-primary px-space-xs py-0.5 rounded font-bold">
                                        بلوک جاری
                                    </span>
                                    <span className="font-label-sm text-on-surface dark:text-gray-300 font-semibold dir-ltr">۱۴:۳۰ - ۱۶:۰۰</span>
                                </div>
                                <h4 className="font-label-md text-sm font-bold text-on-surface dark:text-white mt-1">مطالعه ریاضی مهندسی (معادلات دیفرانسیل)</h4>
                                <p className="font-body-sm text-[11px] text-on-surface-variant dark:text-gray-400">حل ۲۰ تست زمان‌دار کنکور سال‌های اخیر</p>
                                <div className="flex items-center gap-space-xs mt-space-xs">
                                    <span className="font-label-sm text-[10px] bg-surface-container-lowest dark:bg-slate-800 text-on-surface dark:text-gray-200 px-space-xs py-0.5 rounded-full">تست محاسباتی</span>
                                    <span className="font-label-sm text-[10px] bg-surface-container-lowest dark:bg-slate-800 text-tertiary px-space-xs py-0.5 rounded-full font-bold">ضریب ۴</span>
                                </div>
                            </div>

                            {/* Block 2: Next */}
                            <div className="p-space-md rounded-xl bg-surface-container-low dark:bg-slate-800/60 border border-outline-variant/10 flex flex-col gap-space-xs">
                                <div className="flex items-center justify-between">
                                    <span className="font-label-sm text-[10px] bg-secondary-fixed text-on-secondary-fixed px-space-xs py-0.5 rounded font-medium">
                                        استراحت هوشمند
                                    </span>
                                    <span className="font-label-sm text-on-surface-variant dark:text-gray-400 dir-ltr">۱۶:۰۰ - ۱۶:۲۰</span>
                                </div>
                                <h4 className="font-label-md text-xs font-bold text-on-surface dark:text-white mt-1">پیاده‌روی سبک، حرکات کششی و نوشیدن آب</h4>
                                <p className="font-body-sm text-[11px] text-on-surface-variant dark:text-gray-400">دوری کامل از گوشی و صفحه‌نمایش دیجیتال</p>
                            </div>

                            {/* Block 3 */}
                            <div className="p-space-md rounded-xl bg-surface-container-low dark:bg-slate-800/60 border border-outline-variant/10 flex flex-col gap-space-xs">
                                <div className="flex items-center justify-between">
                                    <span className="font-label-sm text-[10px] bg-surface-container-highest dark:bg-slate-700 text-on-surface-variant dark:text-gray-300 px-space-xs py-0.5 rounded font-medium">
                                        بلوک عصر
                                    </span>
                                    <span className="font-label-sm text-on-surface-variant dark:text-gray-400 dir-ltr">۱۶:۲۰ - ۱۸:۰۰</span>
                                </div>
                                <h4 className="font-label-md text-xs font-bold text-on-surface dark:text-white mt-1">مرور فلش‌کارت‌های لغات تخصصی</h4>
                                <p className="font-body-sm text-[11px] text-on-surface-variant dark:text-gray-400">مرور فعالانه ۱۲۰ کارت بازپخش شده با فاصله زمانی</p>
                            </div>
                        </div>
                    </div>

                    {/* Live Virtual Study Pod (Community Peer-Focus) */}
                    <div className="bento-card-interactive bg-surface-container-lowest dark:bg-slate-900 p-4 sm:p-5 rounded-2xl shadow-sm border border-outline-variant/20 flex flex-col gap-3">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Users size={20} className="text-primary shrink-0" />
                                <h3 className="font-label-md text-xs sm:text-sm font-bold text-on-surface dark:text-white">اتاق هم‌مطالعه کنکور ارشد</h3>
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
                </div>
            </div>

            {/* ===== Bottom Bento: Brain Dump & AI Copilot Action Bar ===== */}
            <section className="bento-card-interactive bg-surface-container-lowest dark:bg-slate-900 p-4 rounded-2xl shadow-sm border border-outline-variant/20 flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-3 w-full md:w-auto">
                    <div className="w-10 h-10 rounded-xl bg-primary-fixed flex items-center justify-center text-primary shrink-0 shadow-xs">
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

            {/* Task Modal */}
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
