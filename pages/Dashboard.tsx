import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useStore } from '../context/StoreContext';
import {
    Plus, CalendarDays,
    Clipboard, Zap, TrendingUp,
    CheckCircle2, Flame,
    ArrowDownToLine, Play, ChevronRight, ChevronLeft, GitCompare, RefreshCw
} from 'lucide-react';
import { getShamsiDate, toIsoString, addDays, formatToPersianDigits } from '../utils';
import { getLogicalDateKey } from '../utils/streakEngine';
import { useFocus } from '../context/FocusContext';
import MoodTracker from '../components/MoodTracker';
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

    return <span>{display}{suffix}</span>;
};

/* ===== SVG Progress Ring ===== */
const ProgressRing = ({
    percent, size = 80, stroke = 8, color = '#6366f1', bg = '#e0e7ff'
}: {
    percent: number; size?: number; stroke?: number; color?: string; bg?: string;
}) => {
    const r = (size - stroke * 2) / 2;
    const circ = 2 * Math.PI * r;
    const offset = circ - (Math.min(percent, 100) / 100) * circ;
    return (
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90 overflow-visible">
            <defs>
                <filter id="glow-progress" x="-30%" y="-30%" width="160%" height="160%">
                    <feGaussianBlur stdDeviation="2.5" result="blur" />
                    <feComposite in="SourceGraphic" in2="blur" operator="over" />
                </filter>
            </defs>
            <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={bg} strokeWidth={stroke} className="opacity-90" />
            
            {/* Glowing neon shadow circle */}
            <circle
                cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke + 1.5}
                strokeLinecap="round" strokeDasharray={circ}
                strokeDashoffset={offset}
                className="transition-all duration-1000 ease-out opacity-30"
                filter="url(#glow-progress)"
            />

            <circle
                cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke}
                strokeLinecap="round" strokeDasharray={circ}
                strokeDashoffset={offset}
                className="transition-all duration-1000 ease-out"
            />
        </svg>
    );
};

const PERSIAN_SHORT_DAYS: Record<number, string> = {
    6: 'ش',
    0: '۱ش',
    1: '۲ش',
    2: '۳ش',
    3: '۴ش',
    4: '۵ش',
    5: 'ج',
};

/* ===== Quick Week Mini-View ===== */
const WeekMini = () => {
    const { getTasksByDate, getDayDate, currentDay, totalDays, setCurrentDay } = useStore();
    const today = toIsoString(new Date());
    const windowStart = Math.max(1, Math.min(currentDay - 3, Math.max(1, totalDays - 6)));
    const days = Array.from({ length: Math.min(7, totalDays) }, (_, i) => {
        const dayId = windowStart + i;
        const date = getDayDate(dayId);
        const tasks = getTasksByDate(date);
        const done = tasks.filter(t => t.isCompleted).length;
        const total = tasks.length;
        const pct = total > 0 ? done / total : 0;
        const isToday = date === today;
        return { dayId, date, done, total, pct, isToday };
    });

    return (
        <div className="flex items-end gap-2 justify-center">
            {days.map((d) => {
                const dateObj = new Date(d.date);
                const shortHand = PERSIAN_SHORT_DAYS[dateObj.getDay()] || String(d.dayId);

                return (
                    <div key={d.dayId} className="flex flex-col items-center gap-1">
                        <button
                            type="button"
                            onClick={() => setCurrentDay(d.dayId)}
                            className={`relative w-10 flex flex-col items-center justify-end h-14 bg-gray-100 dark:bg-gray-700/50 rounded-xl overflow-hidden hover:opacity-80 transition cursor-pointer ${d.dayId === currentDay ? 'ring-2 ring-indigo-500 ring-offset-1 dark:ring-offset-gray-900 border border-indigo-200 dark:border-indigo-800' : ''}`}
                        >
                            <div
                                className={`w-full rounded-b-xl transition-all duration-700 ${d.pct > 0.8 ? 'bg-emerald-500' : d.pct > 0.4 ? 'bg-indigo-400' : d.pct > 0 ? 'bg-indigo-300' : 'bg-transparent'}`}
                                style={{ height: `${Math.max(d.pct * 100, 0)}%` }}
                            />
                            {d.isToday && (
                                <div className="absolute top-1 right-0 left-0 flex justify-center">
                                    <div className="w-1.5 h-1.5 rounded-full bg-indigo-600 animate-pulse" />
                                </div>
                            )}
                        </button>
                        <span className={`text-[10px] whitespace-nowrap font-bold ${d.isToday ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-400'}`}>
                            {shortHand}
                        </span>
                    </div>
                );
            })}
        </div>
    );
};

/* ===== Main Dashboard ===== */
const Dashboard = () => {
    const {
        userName, currentDay, getProgress, getTasksByDate, getDayDate,
        tasks: allTasks, totalDays, setIsTimerOpen, level, progressPercent,
        currentLevelXp, xpForNextLevel,
        toggleTask, updateTask, deleteTask, moveTaskToDate, viewMode,
        isNewUser, setIsNewUser, addTask, setCurrentDay, rebalancePlan,
        setShowConfetti, settings,
        syncData, syncQueueCount, streakStats, studyMinutesByDate
    } = useStore();

    const overallProgress = getProgress();

    const activeDateIso = getDayDate(currentDay);
    const dailyTasks = useMemo(() => getTasksByDate(activeDateIso), [getTasksByDate, activeDateIso]);

    const currentStream = settings?.stream || 'life';
    const isAcademicStream = currentStream === 'riazi' || currentStream === 'tajrobi' || currentStream === 'ensani';
    const [onlySpecialized, setOnlySpecialized] = useState(true);
    const [selectedFilterSubject, setSelectedFilterSubject] = useState<string | null>(null);
    const [isSyncing, setIsSyncing] = useState(false);

    const handleManualSync = async () => {
        setIsSyncing(true);
        try {
            await syncData();
        } finally {
            setIsSyncing(false);
        }
    };

    const cutoffHour = settings?.dayCutoffHour ?? 5;
    const todayLogicalKey = getLogicalDateKey(new Date(), cutoffHour);

    const last7Days = useMemo(() => Array.from({ length: 7 }, (_, idx) => {
        const dKey = toIsoString(addDays(todayLogicalKey, idx - 6));
        const mins = studyMinutesByDate?.[dKey] || 0;
        return { dKey, mins };
    }), [todayLogicalKey, studyMinutesByDate]);

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
    const daysLeft = Math.max(0, totalDays - currentDay);
    const dailyPct = dailyTasks.length > 0 ? Math.round((completedDailyTasks / dailyTasks.length) * 100) : 0;

    const [editingTask, setEditingTask] = useState<SubjectTask | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

    const todayIso = toIsoString(new Date());
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
    }, [dailyPct, dailyTasks.length, celebratedToday]);

    const getGreeting = () => {
        const h = new Date().getHours();
        if (h < 12) return 'صبح بخیر';
        if (h < 17) return 'ظهر بخیر';
        return 'شب بخیر';
    };

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

    const completedTotal = allTasks.filter(t => t.isCompleted).length;

    return (
        <div className="p-4 md:p-6 space-y-5 animate-page-enter pb-24 md:pb-6">

            {/* ===== WELCOME BANNER FOR NEW USERS ===== */}
            <WelcomeBanner
                visible={isNewUser}
                onDismiss={() => setIsNewUser(false)}
            />

            {/* ===== HERO GREETING ===== */}
            <div className="relative overflow-hidden rounded-[2.25rem] bg-gradient-to-br from-indigo-600 via-indigo-500 to-violet-700 dark:from-gray-900 dark:via-indigo-950/40 dark:to-gray-900 p-6 shadow-xl border border-white/20 dark:border-white/5">
                {/* Ambient decoration orb */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-white/10 to-transparent blur-3xl pointer-events-none" />
                
                <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="space-y-2">
                        <div className="flex items-center gap-3">
                            <span className="text-xs font-black bg-white/20 dark:bg-indigo-900/50 text-white dark:text-indigo-200 px-3 py-1 rounded-full backdrop-blur-md">
                                {getGreeting()} 👋
                            </span>
                            
                            {/* Cloud Sync Button */}
                            <button
                                onClick={handleManualSync}
                                disabled={isSyncing}
                                className="flex items-center gap-1.5 px-3 py-1 bg-white/15 hover:bg-white/25 active:scale-95 disabled:opacity-50 text-white rounded-full text-[10px] font-bold backdrop-blur-md transition-all duration-300"
                                title="همگام‌سازی واقعی با سرور ابری"
                            >
                                <RefreshCw size={11} className={`${isSyncing ? 'animate-spin' : ''}`} />
                                <span>
                                    {isSyncing
                                        ? 'در حال همگام‌سازی...'
                                        : syncQueueCount > 0
                                          ? `سینک ابری (${syncQueueCount} در صف)`
                                          : 'همگام‌سازی ابری'}
                                </span>
                            </button>
                        </div>
                        
                        <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight">
                            سلام، <span className="text-amber-300 drop-shadow">{userName || 'کاربر عزیز'}</span>
                        </h1>
                        <p className="text-xs text-indigo-100/70 dark:text-gray-400 font-medium">امروز زمان ساختن رویاهاته. بیا قوی شروع کنیم!</p>
                        
                        {/* Day Selector */}
                        <div className="text-indigo-100 dark:text-gray-300 text-xs mt-4 flex items-center gap-2.5 bg-white/10 dark:bg-gray-800/60 p-1.5 rounded-2xl w-fit border border-white/5">
                            <button
                                onClick={() => setCurrentDay(Math.max(1, currentDay - 1))}
                                className="p-1.5 bg-white/10 dark:bg-gray-700/80 rounded-xl hover:bg-white/20 hover:scale-105 active:scale-95 transition cursor-pointer text-white"
                                title="روز قبل"
                            >
                                <ChevronRight size={14} />
                            </button>
                            <span className="font-bold text-xs">
                                روز <span className="text-white font-extrabold text-sm">{currentDay}</span> از <span className="text-white font-extrabold text-sm">{totalDays}</span>
                            </span>
                            <button
                                onClick={() => setCurrentDay(Math.min(totalDays, currentDay + 1))}
                                className="p-1.5 bg-white/10 dark:bg-gray-700/80 rounded-xl hover:bg-white/20 hover:scale-105 active:scale-95 transition cursor-pointer text-white"
                                title="روز بعد"
                            >
                                <ChevronLeft size={14} />
                            </button>
                            <span className="opacity-50 text-[10px] sm:inline pl-1 border-r border-white/15 pr-2.5">— {daysLeft} روز تا پایان دوره</span>
                        </div>
                    </div>

                    {/* XP Ring Visualizer */}
                    <div className="relative flex-shrink-0 self-center md:self-auto">
                        <div className="absolute inset-0 bg-white/10 rounded-full blur-md" />
                        <ProgressRing percent={progressPercent} size={84} stroke={8} color="#f59e0b" bg="rgba(255,255,255,0.15)" />
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                            <Zap size={15} className="text-amber-400 fill-amber-400 mb-0.5 animate-bounce" style={{ animationDuration: '3s' }} />
                            <span className="text-white font-black text-base leading-none">{level}</span>
                            <span className="text-indigo-200 dark:text-gray-400 text-[9px] font-bold">سطح</span>
                        </div>
                    </div>
                </div>

                {/* Level Up progress bar */}
                <div className="relative mt-6 bg-white/5 dark:bg-gray-800/40 p-3 rounded-2xl border border-white/5">
                    <div className="flex justify-between text-[10px] text-indigo-200 dark:text-gray-400 mb-1.5 font-bold font-mono">
                        <span>{currentLevelXp} XP</span>
                        <span className="text-amber-400 flex items-center gap-1">
                            سطح بعدی {level + 1}
                        </span>
                        <span>{xpForNextLevel} XP</span>
                    </div>
                    <div className="w-full h-2.5 bg-white/15 dark:bg-gray-800 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-gradient-to-l from-amber-400 via-orange-400 to-yellow-400 rounded-full transition-all duration-1000"
                            style={{ width: `${progressPercent}%` }}
                        />
                    </div>
                </div>
            </div>

            {/* ===== STATS CARDS ===== */}
            <div className="grid grid-cols-3 gap-3">
                {/* Card 1: پیشرفت کل */}
                <div className="animate-card-enter glass-card rounded-2xl p-3 bg-white dark:bg-gray-800/80 border border-gray-100/80 dark:border-gray-700/50">
                    <div className="flex flex-col items-center gap-2">
                        <div className="relative">
                            <ProgressRing percent={overallProgress} size={56} stroke={6} color="#6366f1" bg="#e0e7ff" />
                            <div className="absolute inset-0 flex items-center justify-center">
                                <span className="text-xs font-black text-indigo-600 dark:text-indigo-400">
                                    <AnimatedNumber value={overallProgress} suffix="%" />
                                </span>
                            </div>
                        </div>
                        <div className="text-center">
                            <p className="text-[10px] font-bold text-gray-500 dark:text-gray-400">پیشرفت کل</p>
                            <p className="text-xs font-black text-gray-800 dark:text-white">
                                {completedTotal}/{allTasks.length}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Card 2: امروز */}
                <div className="animate-card-enter glass-card rounded-2xl p-3 bg-white dark:bg-gray-800/80 border border-gray-100/80 dark:border-gray-700/50">
                    <div className="flex flex-col items-center gap-2">
                        <div className="relative">
                            <ProgressRing percent={dailyPct} size={56} stroke={6} color="#3b82f6" bg="#dbeafe" />
                            <div className="absolute inset-0 flex items-center justify-center">
                                <span className="text-xs font-black text-blue-600 dark:text-blue-400">
                                    <AnimatedNumber value={dailyPct} suffix="%" />
                                </span>
                            </div>
                        </div>
                        <div className="text-center">
                            <p className="text-[10px] font-bold text-gray-500 dark:text-gray-400">امروز</p>
                            <p className="text-xs font-black text-gray-800 dark:text-white">
                                {completedDailyTasks}/{dailyTasks.length}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Card 3: روزهای مانده */}
                <div className="animate-card-enter glass-card rounded-2xl p-3 bg-white dark:bg-gray-800/80 border border-gray-100/80 dark:border-gray-700/50">
                    <div className="flex flex-col items-center gap-2">
                        <div className="relative">
                            <ProgressRing
                                percent={((totalDays - daysLeft) / totalDays) * 100}
                                size={56} stroke={6} color="#10b981" bg="#d1fae5"
                            />
                            <div className="absolute inset-0 flex items-center justify-center">
                                <span className="text-xs font-black text-emerald-600 dark:text-emerald-400">
                                    <AnimatedNumber value={daysLeft} />
                                </span>
                            </div>
                        </div>
                        <div className="text-center">
                            <p className="text-[10px] font-bold text-gray-500 dark:text-gray-400">روز مانده</p>
                            <p className="text-xs font-black text-gray-800 dark:text-white">
                                از {totalDays} روز
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* ===== WEEK MINI CHART ===== */}
            <div className="bg-white dark:bg-gray-800/80 rounded-2xl p-4 border border-gray-100/80 dark:border-gray-700/50 animate-card-enter">
                <div className="flex items-center justify-between mb-3">
                    <h3 className="text-xs font-extrabold text-gray-700 dark:text-gray-200 flex items-center gap-1.5">
                        <TrendingUp size={14} className="text-indigo-500" />
                        نمای هفتگی
                    </h3>
                </div>
                <WeekMini />
            </div>

            {/* ===== STREAK CARD ===== */}
            <div className="animate-card-enter">
                {/* Streak Card + 7-day cadence */}
                <div className="bg-white dark:bg-gray-800/80 rounded-2xl p-4 border border-gray-100/80 dark:border-gray-700/50 shadow-sm flex flex-col justify-between gap-3">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                            <div className="w-9 h-9 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-500 flex items-center justify-center">
                                <Flame size={18} />
                            </div>
                            <div>
                                <p className="text-[11px] font-bold text-gray-400">زنجیره پیوستگی (شروع ۵ صبح)</p>
                                <h3 className="text-sm font-black text-gray-800 dark:text-white">
                                    {formatToPersianDigits(streakStats?.currentStreak || 0)} روز متوالی
                                </h3>
                            </div>
                        </div>
                        <span className="text-[11px] font-black px-2.5 py-1 rounded-xl bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300">
                            رکورد: {formatToPersianDigits(streakStats?.longestStreak || 0)} روز
                        </span>
                    </div>
                    <div className="flex items-center justify-between gap-1.5 pt-1">
                        {last7Days.map((d) => (
                            <div key={d.dKey} className="flex-1 flex flex-col items-center gap-1">
                                <div
                                    title={`${getShamsiDate(d.dKey)}: ${d.mins} دقیقه`}
                                    className={`w-full h-2.5 rounded-full transition ${
                                        d.mins >= 180
                                            ? 'bg-emerald-500'
                                            : d.mins >= 60
                                              ? 'bg-emerald-400'
                                              : d.mins > 0
                                                ? 'bg-emerald-200 dark:bg-emerald-800'
                                                : 'bg-gray-100 dark:bg-gray-700'
                                    }`}
                                />
                                <span className="text-[9px] text-gray-400">
                                    {d.mins > 0 ? `${formatToPersianDigits(Math.round((d.mins / 60) * 10) / 10)}h` : '•'}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* ===== MOOD & FOCUS TIMER ===== */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 items-stretch">
                <div className="md:col-span-2 bg-white dark:bg-gray-800/80 rounded-2xl p-3 border border-gray-100/80 dark:border-gray-700/50">
                    <MoodTracker />
                </div>
                <button
                    type="button"
                    onClick={() => setIsTimerOpen(true)}
                    className="flex items-center justify-center gap-3 p-4 bg-white dark:bg-gray-800/80 hover:bg-emerald-50/40 dark:hover:bg-gray-700/80 text-gray-800 dark:text-gray-100 rounded-2xl font-black text-sm border border-gray-200/80 dark:border-gray-700 shadow-sm transition btn-micro-interactive"
                >
                    <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-500 flex items-center justify-center shrink-0">
                        <Play size={20} fill="currentColor" />
                    </div>
                    <div className="text-right">
                        <span className="block text-sm font-black">تایمر فوکوس</span>
                        <span className="block text-[10px] text-gray-400 font-bold mt-0.5">شروع جلسه تمرکز و ثبت خودکار</span>
                    </div>
                </button>
            </div>

            {/* ===== تسک‌های امروز ===== */}
            <div className="space-y-3.5">
                <div className="flex items-center justify-between mb-1">
                    <h3 className="text-sm font-extrabold text-gray-700 dark:text-gray-200 flex items-center gap-1.5">
                        <CheckCircle2 size={15} className="text-indigo-500" />
                        تسک‌های امروز
                        <span className="text-[10px] text-gray-400 font-medium">({getShamsiDate(activeDateIso)})</span>
                    </h3>
                    <div className="flex items-center gap-2">
                        {isAcademicStream && (
                            <button
                                onClick={() => setOnlySpecialized(!onlySpecialized)}
                                className={`text-[10px] px-2.5 py-1 rounded-xl font-extrabold transition-all border ${
                                    onlySpecialized
                                        ? 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 border-indigo-100/30 dark:border-indigo-900/30'
                                        : 'bg-gray-50 dark:bg-gray-800 text-gray-400 border-gray-200/30 dark:border-gray-700/30'
                                }`}
                            >
                                {onlySpecialized ? 'فقط دروس تخصصی 🎯' : 'همه دسته‌ها 📚'}
                            </button>
                        )}
                        <button
                            onClick={() => { setEditingTask(null); setIsModalOpen(true); }}
                            className="text-[11px] text-indigo-500 font-bold hover:text-indigo-600 transition flex items-center gap-1 py-1 px-2 rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-900/20"
                        >
                            <Plus size={12} /> افزودن
                        </button>
                    </div>
                </div>

                {/* Subject Filters Carousel (2026 Premium Glassmorphic Capsule) */}
                {dailySubjects.length > 0 && (
                    <div className="flex gap-2 overflow-x-auto py-1 no-scrollbar select-none animate-card-enter" dir="rtl">
                        <button
                            onClick={() => setSelectedFilterSubject(null)}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border shrink-0 ${
                                selectedFilterSubject === null
                                    ? 'bg-indigo-600 text-white border-indigo-500 shadow-md shadow-indigo-500/20'
                                    : 'bg-white/40 dark:bg-gray-800/40 text-gray-500 dark:text-gray-400 border-gray-200/30 dark:border-gray-700/30 hover:bg-white/60 dark:hover:bg-white/60'
                            }`}
                        >
                            همه دسته‌ها
                        </button>
                        {dailySubjects.map(sub => {
                            const isSelected = selectedFilterSubject === sub;
                            return (
                                <button
                                    key={sub}
                                    onClick={() => setSelectedFilterSubject(isSelected ? null : sub)}
                                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border shrink-0 flex items-center gap-1.5 ${
                                        isSelected
                                            ? 'bg-indigo-600 text-white border-indigo-500 shadow-md shadow-indigo-500/20'
                                            : 'bg-white/40 dark:bg-gray-800/40 text-gray-500 dark:text-gray-400 border-gray-200/30 dark:border-gray-700/30 hover:bg-white/60 dark:hover:bg-white/60'
                                    }`}
                                >
                                    <span>{sub}</span>
                                </button>
                            );
                        })}
                    </div>
                )}

                {filteredDailyTasks.length > 0 ? (
                    <div className="space-y-2.5">
                        {filteredDailyTasks.map((task, i) => (
                            <div key={task.id} style={{ animationDelay: `${i * 0.05}s` }} className="animate-card-enter">
                                <TaskCard
                                    task={task}
                                    viewMode={viewMode}
                                    onToggle={toggleTask}
                                    onEdit={handleEdit}
                                    onDelete={handleDelete}
                                />
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-10 bg-white dark:bg-gray-800/60 rounded-2xl border border-dashed border-gray-200 dark:border-gray-700/50">
                        <div className="w-14 h-14 bg-gray-50 dark:bg-gray-700/50 rounded-2xl flex items-center justify-center mx-auto mb-3">
                            <Clipboard size={24} className="text-gray-300 dark:text-gray-600" />
                        </div>
                        <p className="text-sm text-gray-400 font-medium">تسکی با این فیلتر پیدا نشد!</p>
                        <button
                            onClick={() => { setEditingTask(null); setIsModalOpen(true); }}
                            className="mt-3 text-xs text-indigo-500 font-bold hover:text-indigo-600 transition bg-indigo-50 dark:bg-indigo-900/20 px-3 py-1.5 rounded-xl"
                        >
                            + افزودن اولین تسک
                        </button>
                    </div>
                )}
            </div>

            {/* ===== تسک‌های عقب‌افتاده ===== */}
            {overdueTasks.length > 0 && (
                <div className="mt-6">
                    <div className="flex items-center justify-between mb-3">
                        <h3 className="text-sm font-extrabold text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                            <ArrowDownToLine size={14} />
                            عقب‌افتاده ({overdueTasks.length})
                        </h3>
                        <button
                            onClick={rebalancePlan}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-100/50 hover:bg-amber-100 dark:bg-amber-900/30 dark:hover:bg-amber-900/50 text-amber-700 dark:text-amber-400 text-[11px] font-bold rounded-xl transition duration-200"
                        >
                            <GitCompare size={13} />
                            بالانس خودکار (Rebalance)
                        </button>
                    </div>
                    <div className="space-y-2.5">
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
