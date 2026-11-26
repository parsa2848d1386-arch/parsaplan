import React, { useState, useMemo, useEffect } from 'react';
import { motion, LayoutGroup, useReducedMotion } from 'framer-motion';
import { useStore } from '../context/StoreContext';
import { useFocus } from '../context/FocusContext';
import { isSpecializedSubject } from '../types';
import {
    XAxis,
    YAxis,
    Tooltip,
    ResponsiveContainer,
    CartesianGrid,
    AreaChart,
    Area,
} from 'recharts';
import {
    TrendingUp,
    CheckCircle,
    Clock,
    Target,
    Activity,
    BrainCircuit,
    Play,
    Pause,
    Check,
    Gift,
    Sparkles,
    Calendar,
} from 'lucide-react';
import ActivityHeatmap from '../components/ActivityHeatmap';
import SmartMacroPlanner from '../components/SmartMacroPlanner';
import { formatToPersianDigits, addDays, toIsoString } from '../utils';
import { getLogicalDateKey } from '../utils/streakEngine';
import { SPRING_SNAPPY } from '../utils/motionPresets';
import { haptics } from '../utils/haptics';

export const Analysis = () => {
    const prefersReducedMotion = useReducedMotion();
    const {
        tasks,
        sessions = [],
        getProgress,
        subjects,
        moods = {},
        settings,
        studyMinutesByDate = {},
        isDemoActive,
        dismissDemoMode,
    } = useStore();
    const focusCtx = useFocus();

    const [activeTab, setActiveTab] = useState<'cognitive' | 'exam' | 'macro'>('cognitive');

    const isSprintRunning = focusCtx?.status === 'running';
    const isSprintPaused = focusCtx?.status === 'paused';
    const targetSprintSeconds = 45 * 60;
    const [tickOffset, setTickOffset] = useState(0);

    useEffect(() => {
        if (!isSprintRunning) {
            setTickOffset(0);
            return;
        }
        const id = setInterval(() => setTickOffset((prev) => prev + 1), 1000);
        return () => clearInterval(id);
    }, [isSprintRunning]);

    const sprintRemainingSeconds = useMemo(() => {
        const elapsed = (focusCtx?.elapsedSeconds || 0) + (isSprintRunning ? tickOffset : 0);
        if (focusCtx?.status === 'running' || focusCtx?.status === 'paused') {
            return Math.max(0, targetSprintSeconds - elapsed);
        }
        return targetSprintSeconds;
    }, [focusCtx?.elapsedSeconds, focusCtx?.status, isSprintRunning, tickOffset, targetSprintSeconds]);

    const handleSprintToggle = () => {
        if (isSprintRunning) {
            focusCtx?.pauseTimer?.();
        } else if (isSprintPaused) {
            if (focusCtx?.resumeTimer) focusCtx.resumeTimer();
            else focusCtx?.startTimer?.();
        } else {
            (focusCtx as any)?.setMode?.('countdown');
            (focusCtx as any)?.setCustomCountdownMinutes?.(45);
            focusCtx?.startTimer?.();
        }
    };

    const formatSprintTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        const faMins = formatToPersianDigits(mins);
        const faSecs = secs < 10 ? '۰' + formatToPersianDigits(secs) : formatToPersianDigits(secs);
        return `${faMins}:${faSecs}`;
    };

    const completedTasks = tasks.filter((t) => t.isCompleted);
    const overallProgress = getProgress();

    const ratedTasks = completedTasks.filter((t) => t.qualityRating);
    const averageQuality =
        ratedTasks.length > 0
            ? ratedTasks.reduce((acc, t) => acc + (t.qualityRating || 0), 0) / ratedTasks.length
            : 0;

    const testedTasks = completedTasks.filter((t) => t.testStats && t.testStats.total > 0);
    const totalTests = testedTasks.reduce((acc, t) => acc + (t.testStats?.total || 0), 0);
    const totalCorrect = testedTasks.reduce((acc, t) => acc + (t.testStats?.correct || 0), 0);
    const totalWrong = testedTasks.reduce((acc, t) => acc + (t.testStats?.wrong || 0), 0);
    const accuracy =
        totalTests > 0 ? Math.round(((totalCorrect * 3 - totalWrong) / (totalTests * 3)) * 100) : 0;

    const examTasks = tasks.filter((t) => t.studyType === 'exam' && t.isCompleted);
    const examTrendData = examTasks
        .filter((t) => t.testStats && t.testStats.total > 0)
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
        .map((t) => {
            const total = t.testStats!.total;
            const correct = t.testStats!.correct;
            const wrong = t.testStats!.wrong;
            const percentage = total > 0 ? Math.round(((correct * 3 - wrong) / (total * 3)) * 100) : 0;
            return {
                date: t.date.split('T')[0],
                shamsiDate: new Date(t.date).toLocaleDateString('fa-IR'),
                score: percentage > 0 ? percentage : 0,
                subject: t.subject,
            };
        });

    const weeklyDistribution = useMemo(() => {
        const todayObj = new Date();
        const daysSinceSaturday = (todayObj.getDay() + 1) % 7;
        const weekSaturday = addDays(todayObj, -daysSinceSaturday);
        const dayNames = [
            { short: 'ش', full: 'شنبه' },
            { short: 'ی', full: 'یکشنبه' },
            { short: 'د', full: 'دوشنبه' },
            { short: 'س', full: 'سه‌شنبه' },
            { short: 'چ', full: 'چهارشنبه' },
            { short: 'پ', full: 'پنج‌شنبه' },
            { short: 'ج', full: 'جمعه' },
        ];

        const daysData = dayNames.map((d, i) => {
            const dateObj = addDays(weekSaturday, i);
            const iso = toIsoString(dateObj);
            let minutes = studyMinutesByDate?.[iso] || 0;
            if (minutes <= 0) {
                const sessionMins = sessions
                    .filter((s) => (s.logicalDate || s.startedAt?.split('T')[0]) === iso)
                    .reduce((sum, s) => sum + Math.round((s.durationSeconds || 0) / 60), 0);
                const taskMins = tasks
                    .filter((t) => t.date === iso && t.isCompleted)
                    .reduce((sum, t) => sum + (t.actualDuration || t.durationMinutes || 0), 0);
                minutes = Math.max(sessionMins, taskMins);
            }
            const hours = Math.round((minutes / 60) * 10) / 10;
            return { ...d, iso, hours, minutes };
        });

        const totalMinutes = daysData.reduce((sum, d) => sum + d.minutes, 0);
        const totalHours = Math.round((totalMinutes / 60) * 10) / 10;
        const activeDays = daysData.filter((d) => d.minutes > 0).length;
        let maxDay = daysData[0];
        let minDay = daysData[0];
        daysData.forEach((d) => {
            if (d.hours > maxDay.hours) maxDay = d;
            if (d.hours < minDay.hours) minDay = d;
        });
        return { days: daysData, totalHours, totalMinutes, activeDays, maxDay, minDay };
    }, [studyMinutesByDate, tasks, sessions]);

    const avgDailyMinutes = weeklyDistribution.activeDays > 0
        ? Math.round(weeklyDistribution.totalMinutes / weeklyDistribution.activeDays)
        : 0;
    const avgHoursFormatted = `${formatToPersianDigits(Math.floor(avgDailyMinutes / 60))}:${formatToPersianDigits(
        String(avgDailyMinutes % 60).padStart(2, '0')
    )}`;

    const goldenHourWindow = useMemo(() => {
        if (sessions.length === 0) return 'ثبت‌نشده';
        const hourBuckets: Record<number, number> = {};
        sessions.forEach((s) => {
            if (!s.startedAt) return;
            const hr = new Date(s.startedAt).getHours();
            if (!isNaN(hr)) hourBuckets[hr] = (hourBuckets[hr] || 0) + (s.durationSeconds || 0);
        });
        const bestEntry = Object.entries(hourBuckets).sort((a, b) => b[1] - a[1])[0];
        if (!bestEntry) return 'ثبت‌نشده';
        const h = Number(bestEntry[0]);
        return `${formatToPersianDigits(h)} تا ${formatToPersianDigits((h + 2) % 24)}`;
    }, [sessions]);

    const efficiencyIndex = ratedTasks.length > 0
        ? Math.round((averageQuality / 5) * 100)
        : Math.max(0, Math.min(100, overallProgress));

    const cutoffHour = settings?.dayCutoffHour ?? 5;
    const todayLogical = getLogicalDateKey(new Date(), cutoffHour);
    const todayIso = toIsoString(new Date());
    const todayStudyMins =
        studyMinutesByDate?.[todayLogical] ??
        studyMinutesByDate?.[todayIso] ??
        sessions
            .filter((s) => (s.logicalDate || s.startedAt?.split('T')[0]) === todayLogical)
            .reduce((sum, s) => sum + Math.round((s.durationSeconds || 0) / 60), 0);

    const todayGoalSprints = Math.max(1, Math.round((settings?.dailyCapacityMinutes || 360) / 45));
    const todayCompletedSprints = Math.floor(todayStudyMins / 45);
    const remainingSprints = Math.max(0, todayGoalSprints - todayCompletedSprints);

    const quest1Done = todayStudyMins >= 180;
    const hasMoodToday = Boolean(moods?.[todayLogical] || moods?.[todayIso]);
    const todayScheduledTasksCount = tasks.filter(
        (t) => (t.date === todayLogical || t.date === todayIso) && Boolean(t.startTime)
    ).length;
    const quest3Done = todayScheduledTasksCount >= 3;
    const completedQuestsCount = [quest1Done, hasMoodToday, quest3Done].filter(Boolean).length;

    const performanceSubjects = useMemo(() => {
        if (subjects.length > 0) return subjects.slice(0, 4).map((s) => ({ name: s.name }));
        return Array.from(new Set(tasks.map((t) => t.subject).filter(Boolean))).slice(0, 4).map((name) => ({ name }));
    }, [subjects, tasks]);

    const balanceMetrics = useMemo(() => {
        const subjectNames = Array.from(
            new Set([...subjects.map((s) => s.name), ...tasks.map((t) => t.subject).filter(Boolean)])
        );
        const activeCount = new Set(tasks.map((t) => t.subject).filter(Boolean)).size;
        const totalSubCount = Math.max(subjectNames.length, activeCount);
        const countsBySubject = subjectNames.map((name) => tasks.filter((t) => t.subject === name).length);
        let deviationPct = 0;
        if (countsBySubject.length > 1) {
            const mean = countsBySubject.reduce((a, b) => a + b, 0) / countsBySubject.length;
            if (mean > 0) {
                const variance = countsBySubject.reduce((sum, c) => sum + Math.pow(c - mean, 2), 0) / countsBySubject.length;
                deviationPct = Math.min(100, Math.round((Math.sqrt(variance) / mean) * 100));
            }
        }
        const stream = settings?.stream || 'life';
        const specializedCount = tasks.filter((t) => isSpecializedSubject(stream, t.subject)).length;
        const specPct = tasks.length > 0 ? Math.round((specializedCount / tasks.length) * 100) : 0;
        const genPct = tasks.length > 0 ? 100 - specPct : 0;
        return { activeCount, totalSubCount, deviationPct, specPct, genPct };
    }, [subjects, tasks, settings?.stream]);

    return (
        <div className="flex flex-col w-full p-3 xs:p-4 sm:p-5 md:p-6 lg:p-8 max-app-container gap-4 sm:gap-6">
            {isDemoActive && (
                <div className="flex flex-wrap items-center justify-between gap-3 squircle-card px-4 py-2.5 bg-[var(--surface-elevated)] border border-[var(--border-subtle)] text-xs text-[var(--text-secondary)]">
                    <div className="flex items-center gap-2.5 min-w-0">
                        <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" aria-hidden="true" />
                        <span className="font-bold text-on-surface shrink-0">پیش‌نمایش نمونه</span>
                        <span aria-hidden="true" className="text-[var(--text-muted)]">·</span>
                        <span className="font-medium truncate sm:whitespace-normal">
                            تمامی نمودارها اکنون بر اساس داده‌های واقعی حساب شما محاسبه می‌شوند.
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

            {/* Header & Sub-Navigation Tabs */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-surface-container-lowest dark:bg-slate-900 p-4 sm:p-5 squircle-lg shadow-sm border border-outline-variant/30">
                <div className="flex items-center gap-3">
                    <div className="w-12 h-12 squircle-sm bg-primary text-on-primary flex items-center justify-center shadow-md shrink-0">
                        <TrendingUp size={24} />
                    </div>
                    <div>
                        <h1 className="font-headline-lg text-lg xs:text-xl md:text-2xl font-bold text-on-surface dark:text-white tracking-tight">
                            آنالیتیکس و هوش شناختی
                        </h1>
                        <p className="font-body-sm text-xs sm:text-sm text-on-surface-variant dark:text-gray-400">
                            تحلیل عمیق ریتم زیستی، تمرکز ادراکی و تراز پیشرفت تحصیلی
                        </p>
                    </div>
                </div>

                <LayoutGroup id="analysis-tabs">
                    <div
                        role="tablist"
                        aria-label="بخش‌های تحلیل عملکرد"
                        className="flex items-center gap-1 p-1 bg-surface-container-low dark:bg-slate-800 squircle-sm overflow-x-auto no-scrollbar max-w-full"
                    >
                        {[
                            { id: 'cognitive' as const, label: 'کارایی شناختی و اسپرینت', icon: BrainCircuit },
                            { id: 'exam' as const, label: 'روند آزمون‌ها و تراز', icon: Activity },
                            { id: 'macro' as const, label: 'ماکروپلنر و هیت‌مپ', icon: Calendar },
                        ].map((tab) => {
                            const TabIcon = tab.icon;
                            const isSelected = activeTab === tab.id;
                            return (
                                <button
                                    key={tab.id}
                                    type="button"
                                    role="tab"
                                    aria-selected={isSelected}
                                    onClick={() => {
                                        haptics.selection();
                                        setActiveTab(tab.id);
                                    }}
                                    className={`relative touch-target min-h-[44px] flex items-center gap-1.5 px-3 xs:px-4 py-2 rounded-xl text-label-sm font-label-sm transition-colors whitespace-nowrap active:scale-95 cursor-pointer ${
                                        isSelected
                                            ? 'text-on-primary font-bold'
                                            : 'text-on-surface-variant dark:text-gray-300 hover:text-on-surface dark:hover:text-white'
                                    }`}
                                >
                                    {isSelected && (
                                        <motion.span
                                            layoutId="analysisActiveTabPill"
                                            transition={prefersReducedMotion ? { duration: 0 } : SPRING_SNAPPY}
                                            aria-hidden="true"
                                            className="absolute inset-0 rounded-xl bg-primary shadow-xs"
                                        />
                                    )}
                                    <TabIcon size={17} className="relative z-10" aria-hidden="true" />
                                    <span className="relative z-10">{tab.label}</span>
                                </button>
                            );
                        })}
                    </div>
                </LayoutGroup>
            </div>

            {/* TAB 1: COGNITIVE PERFORMANCE & BENTO GRID */}
            {activeTab === 'cognitive' && (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6 items-start">
                    {/* LEFT COLUMN: Cognitive Metrics & Weekly Distribution (Span 7) */}
                    <div className="lg:col-span-7 flex flex-col gap-4 sm:gap-6">
                        <div className="bg-surface-container-lowest dark:bg-slate-900 squircle-lg p-4 sm:p-6 shadow-sm flex flex-col gap-4 border border-outline-variant/30 bento-card-interactive">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <BrainCircuit size={22} className="text-primary" />
                                    <h2 className="text-base sm:text-lg text-on-surface dark:text-white font-bold">
                                        تحلیل کارایی عصبی-شناختی
                                    </h2>
                                </div>
                                <span className="bg-surface-container-high dark:bg-slate-800 text-on-surface-variant dark:text-gray-300 font-label-sm text-xs px-2.5 py-0.5 rounded-full font-bold">
                                    ۷ روز اخیر
                                </span>
                            </div>

                            <div className="grid grid-cols-1 xs:grid-cols-3 gap-2.5 pt-1">
                                <div className="bg-surface-container-low dark:bg-slate-800/80 p-space-sm rounded-xl flex flex-col gap-1 items-start border border-outline-variant/20">
                                    <span className="font-label-sm text-label-sm text-on-surface-variant dark:text-gray-400 font-medium">میانگین تمرکز</span>
                                    <span className="font-headline-md text-headline-md text-on-surface dark:text-white font-bold">
                                        {avgHoursFormatted}{' '}
                                        <span className="font-label-sm text-label-sm font-normal text-on-surface-variant dark:text-gray-400">ساعت/روز</span>
                                    </span>
                                    <span className="font-label-sm text-label-sm text-secondary font-bold flex items-center gap-0.5">
                                        <TrendingUp size={14} />{formatToPersianDigits(weeklyDistribution.activeDays)} روز فعال
                                    </span>
                                </div>

                                <div className="bg-surface-container-low dark:bg-slate-800/80 p-space-sm rounded-xl flex flex-col gap-1 items-start border border-outline-variant/20">
                                    <span className="font-label-sm text-label-sm text-on-surface-variant dark:text-gray-400 font-medium">زمان طلایی</span>
                                    <span className="font-headline-md text-headline-md text-primary font-bold">
                                        {goldenHourWindow}
                                    </span>
                                    <span className="font-label-sm text-label-sm text-on-surface-variant dark:text-gray-400 font-medium">
                                        {sessions.length > 0 ? 'اوج ثبت جلسات فوکوس' : 'در انتظار اولین جلسه'}
                                    </span>
                                </div>

                                <div className="bg-surface-container-low dark:bg-slate-800/80 p-space-sm rounded-xl flex flex-col gap-1 items-start border border-outline-variant/20">
                                    <span className="font-label-sm text-label-sm text-on-surface-variant dark:text-gray-400 font-medium">شاخص بازده</span>
                                    <span className="font-headline-md text-headline-md text-secondary font-bold">
                                        {formatToPersianDigits(efficiencyIndex)}٪
                                    </span>
                                    <span className="font-label-sm text-label-sm text-secondary font-bold">
                                        {efficiencyIndex >= 80 ? 'عالی' : efficiencyIndex >= 50 ? 'متعادل' : 'در شروع مسیر'}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Weekly Study Distribution Bar Chart Bento */}
                        <div className="bg-surface-container-lowest dark:bg-slate-900 squircle-lg p-space-lg shadow-sm flex flex-col gap-space-md border border-outline-variant/30">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-space-xs">
                                    <Activity size={22} className="text-secondary" />
                                    <h3 className="font-headline-md text-headline-md text-on-surface dark:text-white font-bold">
                                        توزیع زمانی هفته (شنبه تا جمعه)
                                    </h3>
                                </div>
                                <span className="font-label-sm text-label-sm text-tertiary bg-tertiary-fixed/30 px-space-xs py-0.5 rounded-full font-bold">
                                    مجموع: {formatToPersianDigits(weeklyDistribution.totalHours)} ساعت
                                </span>
                            </div>
                            <p className="font-body-sm text-body-sm text-on-surface-variant dark:text-gray-300 leading-relaxed">
                                {weeklyDistribution.totalHours > 0 ? (
                                    <>
                                        {weeklyDistribution.maxDay.full} با{' '}
                                        <strong className="text-on-surface dark:text-white font-semibold">
                                            {formatToPersianDigits(weeklyDistribution.maxDay.hours)} ساعت
                                        </strong>{' '}
                                        پرتمرکزترین روز هفته شما بوده است.
                                    </>
                                ) : (
                                    'هنوز ساعت مطالعه‌ای در این هفته ثبت نشده است. با اولین تایمر فوکوس یا تکمیل تسک، نمودار فعال می‌شود.'
                                )}
                            </p>

                            <div className="w-full bg-surface-container-low dark:bg-slate-800/80 rounded-xl p-space-md flex flex-col gap-space-sm border border-outline-variant/20">
                                <div className="h-44 w-full flex items-end justify-between gap-2 px-1 pt-6">
                                    {weeklyDistribution.days.map((d) => {
                                        const isPeak = weeklyDistribution.totalHours > 0 && d.iso === weeklyDistribution.maxDay.iso;
                                        const maxVal = Math.max(1, weeklyDistribution.maxDay.hours);
                                        const heightPct = d.hours > 0 ? Math.max(12, Math.round((d.hours / maxVal) * 100)) : 4;

                                        return (
                                            <div key={d.iso} className="flex-1 flex flex-col items-center gap-space-xs h-full justify-end relative group cursor-pointer">
                                                {isPeak && (
                                                    <div className="absolute -top-3 bg-secondary text-on-secondary font-label-sm text-[10px] px-1.5 py-0.5 rounded-md shadow-xs font-bold">
                                                        رکورد
                                                    </div>
                                                )}
                                                <span className={`font-label-sm text-label-sm font-bold transition-colors ${
                                                    isPeak ? 'text-secondary' : 'text-on-surface-variant dark:text-gray-400 group-hover:text-primary'
                                                }`}>
                                                    {formatToPersianDigits(d.hours)}
                                                </span>
                                                <div
                                                    className={`w-full max-w-[28px] rounded-t-lg transition-all ${
                                                        isPeak ? 'bg-secondary shadow-sm' : d.hours > 0 ? 'bg-primary/45 group-hover:bg-primary' : 'bg-outline-variant/30'
                                                    }`}
                                                    style={{ height: `${heightPct}%` }}
                                                    title={`${d.full}: ${d.hours} ساعت`}
                                                />
                                                <span className={`font-label-sm text-label-sm font-bold ${isPeak ? 'text-secondary' : 'text-on-surface-variant dark:text-gray-400'}`}>
                                                    {d.short}
                                                </span>
                                            </div>
                                        );
                                    })}
                                </div>
                                <div className="flex items-center justify-between pt-space-xs font-label-sm text-label-sm text-on-surface-variant dark:text-gray-400">
                                    <span>کمترین: {weeklyDistribution.minDay.full} ({formatToPersianDigits(weeklyDistribution.minDay.hours)} ساعت)</span>
                                    <span className="text-secondary font-bold">بیشترین: {weeklyDistribution.maxDay.full} ({formatToPersianDigits(weeklyDistribution.maxDay.hours)} ساعت)</span>
                                </div>
                            </div>

                            <div className="bg-surface-container dark:bg-slate-800 rounded-xl p-space-sm flex items-center gap-space-sm border border-outline-variant/20">
                                <Sparkles size={20} className="text-primary shrink-0" />
                                <p className="font-body-sm text-body-sm text-on-surface dark:text-gray-200 leading-normal">
                                    {totalTests > 0
                                        ? `میانگین تراز آزمون‌های ثبت‌شده شما برابر با ${formatToPersianDigits(accuracy)}٪ و پیشرفت کلی تسک‌ها ${formatToPersianDigits(overallProgress)}٪ است.`
                                        : `درصد پیشرفت کل تسک‌های برنامه‌ریزی‌شده تاکنون ${formatToPersianDigits(overallProgress)}٪ بوده است.`}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* RIGHT COLUMN: Focus Sprint Pod & Daily Productivity Quests */}
                    <div className="lg:col-span-5 flex flex-col gap-space-lg">
                        <div className="bg-surface-container-lowest dark:bg-slate-900 squircle-lg p-space-lg shadow-sm flex flex-col gap-space-md relative overflow-hidden border border-outline-variant/30">
                            <div className="absolute -top-12 -left-12 w-40 h-40 bg-primary/10 rounded-full blur-2xl pointer-events-none"></div>
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-space-xs">
                                    <Clock size={20} className="text-primary" />
                                    <h2 className="font-headline-md text-headline-md text-on-surface dark:text-white font-bold">فوکوس اسپرینت هوشمند</h2>
                                </div>
                                <span className="font-label-sm text-label-sm bg-primary-fixed text-on-primary-fixed-variant px-space-xs py-0.5 rounded-full font-bold">تکنیک پومودورو پلاس</span>
                            </div>

                            <div className="bg-surface-container-low dark:bg-slate-800/80 rounded-xl p-space-md flex flex-col items-center justify-center text-center gap-space-sm border border-outline-variant/20">
                                <div className="relative w-36 h-36 flex items-center justify-center">
                                    <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                                        <circle className="text-surface-container-highest dark:text-slate-700" cx="50" cy="50" fill="none" r="42" stroke="currentColor" strokeWidth="8" />
                                        <circle
                                            className="text-primary transition-all duration-1000"
                                            cx="50" cy="50" fill="none" r="42" stroke="currentColor"
                                            strokeDasharray="264"
                                            strokeDashoffset={Math.round(264 * (sprintRemainingSeconds / targetSprintSeconds))}
                                            strokeLinecap="round" strokeWidth="8"
                                        />
                                    </svg>
                                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                                        <span className="font-display-lg text-headline-lg font-bold text-on-surface dark:text-white tracking-tight" dir="ltr">
                                            {formatSprintTime(sprintRemainingSeconds)}
                                        </span>
                                        <span className="font-label-sm text-label-sm text-on-surface-variant dark:text-gray-400 font-medium">دقیقه غوطه‌وری عمیق</span>
                                    </div>
                                </div>

                                <div className="flex flex-col gap-0.5">
                                    <span className="font-label-md text-label-md font-bold text-on-surface dark:text-white">
                                        {isSprintRunning ? 'اسپرینت متصل به تایمر سراسری فعال است' : 'آماده برای شروع اسپرینت ۴۵ دقیقه‌ای؟'}
                                    </span>
                                    <p className="font-body-sm text-body-sm text-on-surface-variant dark:text-gray-400">
                                        زمان مطالعه به‌صورت مستقیم در زنجیره پیوستگی و جدول لیگ ذخیره می‌شود.
                                    </p>
                                </div>

                                <button
                                    type="button"
                                    onClick={handleSprintToggle}
                                    className={`touch-target w-full mt-2 py-3 px-4 rounded-xl font-medium text-sm font-bold shadow-md transition-all active:scale-[0.98] flex items-center justify-center gap-2 cursor-pointer ${
                                        isSprintRunning ? 'bg-tertiary text-on-tertiary' : 'bg-primary hover:bg-primary-container text-on-primary'
                                    }`}
                                >
                                    {isSprintRunning ? <Pause size={18} /> : <Play size={18} />}
                                    <span>{isSprintRunning ? 'توقف موقت اسپرینت' : isSprintPaused ? 'ادامه اسپرینت فوکوس' : 'شروع اسپرینت فوکوس'}</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => focusCtx?.setIsTimerOpen?.(true)}
                                    className="text-xs font-bold text-primary hover:underline cursor-pointer"
                                >
                                    باز کردن پنجره کامل تایمر فوکوس
                                </button>
                            </div>

                            <div className="flex items-center justify-between text-on-surface-variant dark:text-gray-300 font-body-sm text-xs sm:text-sm px-1">
                                <span className="flex items-center gap-1 font-medium">
                                    <CheckCircle size={15} className="text-secondary" />
                                    {formatToPersianDigits(todayCompletedSprints)} از {formatToPersianDigits(todayGoalSprints)} اسپرینت انجام شد
                                </span>
                                <span className="font-bold text-primary">
                                    {remainingSprints > 0 ? `${formatToPersianDigits(remainingSprints)} اسپرینت تا هدف روز` : 'هدف اسپرینت امروز کامل شد'}
                                </span>
                            </div>
                        </div>

                        {/* Daily Productivity Quests */}
                        <div className="bg-surface-container-lowest dark:bg-slate-900 squircle-lg p-4 sm:p-6 shadow-sm flex flex-col gap-4 border border-outline-variant/30 bento-card-interactive">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <Target size={20} className="text-secondary" />
                                    <h3 className="text-base sm:text-lg text-on-surface dark:text-white font-bold">ماموریت‌های فعال امروز</h3>
                                </div>
                                <span className="font-label-sm text-xs bg-secondary-container text-on-secondary-container px-2.5 py-0.5 rounded-full font-bold">
                                    {formatToPersianDigits(completedQuestsCount)} از {formatToPersianDigits(3)} تکمیل
                                </span>
                            </div>

                            <div className="flex flex-col gap-2">
                                <div className="bg-surface-container-low dark:bg-slate-800/80 p-3 sm:p-4 rounded-xl flex items-center justify-between border border-outline-variant/20">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${quest1Done ? 'bg-secondary text-on-secondary shadow-xs' : 'bg-surface-container-highest dark:bg-slate-700 text-transparent'}`}>
                                            <Check size={16} />
                                        </div>
                                        <div className="flex flex-col">
                                            <span className={`font-label-md text-sm text-on-surface dark:text-white font-semibold ${quest1Done ? 'line-through opacity-75' : ''}`}>۳ ساعت مطالعه ثبت‌شده امروز</span>
                                            <span className="font-label-sm text-xs text-on-surface-variant dark:text-gray-400 font-medium">{formatToPersianDigits(todayStudyMins)} از {formatToPersianDigits(180)} دقیقه</span>
                                        </div>
                                    </div>
                                    <span className="bg-secondary-fixed text-on-secondary-fixed font-label-sm text-xs px-2 py-0.5 rounded-md font-bold shrink-0">+۱۰۰ XP</span>
                                </div>

                                <div className="bg-surface-container-low dark:bg-slate-800/80 p-3 sm:p-4 rounded-xl flex items-center justify-between border border-outline-variant/20">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${hasMoodToday ? 'bg-secondary text-on-secondary shadow-xs' : 'bg-surface-container-highest dark:bg-slate-700 text-transparent'}`}>
                                            <Check size={16} />
                                        </div>
                                        <div className="flex flex-col">
                                            <span className={`font-label-md text-sm text-on-surface dark:text-white font-semibold ${hasMoodToday ? 'line-through opacity-75' : ''}`}>ثبت مود و سطح انرژی امروز</span>
                                            <span className="font-label-sm text-xs text-on-surface-variant dark:text-gray-400 font-medium">{hasMoodToday ? 'چک‌این امروز ثبت شده است' : 'از داشبورد وضعیت امروز را ثبت کنید'}</span>
                                        </div>
                                    </div>
                                    <span className="bg-secondary-fixed text-on-secondary-fixed font-label-sm text-xs px-2 py-0.5 rounded-md font-bold shrink-0">+۳۰ XP</span>
                                </div>

                                <div className="bg-surface-container-low dark:bg-slate-800/80 p-3 sm:p-4 rounded-xl flex items-center justify-between border border-outline-variant/20">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${quest3Done ? 'bg-secondary text-on-secondary shadow-xs' : 'bg-surface-container-highest dark:bg-slate-700 text-transparent'}`}>
                                            <Check size={16} />
                                        </div>
                                        <div className="flex flex-col">
                                            <span className={`font-label-md text-sm font-semibold ${quest3Done ? 'line-through opacity-75 text-on-surface dark:text-white' : 'text-on-surface dark:text-white'}`}>ثبت ۳ بلاک زمانی در تایم‌لاین</span>
                                            <span className="font-label-sm text-xs text-on-surface-variant dark:text-gray-400 font-medium">پیشرفت فعلی: {formatToPersianDigits(Math.min(3, todayScheduledTasksCount))} از ۳ بلاک</span>
                                        </div>
                                    </div>
                                    <span className="bg-primary-fixed text-on-primary-fixed-variant font-label-sm text-label-sm px-space-xs py-0.5 rounded-md font-bold">+۵۰ XP</span>
                                </div>
                            </div>

                            <div className="bg-tertiary-fixed/30 p-space-sm rounded-xl flex items-center gap-space-sm border border-tertiary/20">
                                <Gift size={22} className="text-tertiary shrink-0" />
                                <div className="flex flex-col">
                                    <span className="font-label-sm text-label-sm text-tertiary font-bold">پاداش استمرار ماموریت‌ها</span>
                                    <span className="font-body-sm text-body-sm text-on-surface dark:text-gray-200 font-medium">با تکمیل تسک‌ها و جلسات تایمر فوکوس، سطح خود را به‌صورت خودکار ارتقا دهید.</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Performance Details & Study Balance Bento Strip */}
                    <div className="lg:col-span-12 grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 pt-1">
                        {/* 1. Performance Details Card (MUST precede Study Balance) */}
                        <div className="bg-surface-container-lowest dark:bg-slate-900 squircle-lg p-4 sm:p-6 shadow-sm border border-outline-variant/30 flex flex-col gap-4 bento-card-interactive">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <TrendingUp size={20} className="text-secondary" />
                                    <h3 className="font-headline-md text-base sm:text-lg text-on-surface dark:text-white font-bold">جزئیات عملکرد</h3>
                                </div>
                                <span className="text-label-sm font-label-sm bg-secondary-container/40 text-secondary px-2.5 py-0.5 rounded-full font-bold">تراز کلی</span>
                            </div>
                            <div className="flex flex-col gap-2.5">
                                {performanceSubjects.length === 0 ? (
                                    <p className="text-xs text-on-surface-variant dark:text-gray-400 py-4 text-center">هنوز حوزه یا درسی با تسک فعال ثبت نشده است.</p>
                                ) : (
                                    performanceSubjects.map((sub) => {
                                        const subTasks = tasks.filter((t) => t.subject === sub.name);
                                        const subDone = subTasks.filter((t) => t.isCompleted).length;
                                        const pct = subTasks.length > 0 ? Math.round((subDone / subTasks.length) * 100) : 0;
                                        return (
                                            <div key={sub.name} className="flex flex-col gap-1 p-2 rounded-xl bg-surface-container-low dark:bg-slate-800/80 border border-outline-variant/20">
                                                <div className="flex items-center justify-between text-xs font-bold text-on-surface dark:text-white">
                                                    <span>{sub.name}</span>
                                                    <span className="text-secondary">{formatToPersianDigits(pct)}٪ پیشرفت</span>
                                                </div>
                                                <div className="w-full h-2 rounded-full bg-surface-container-highest dark:bg-slate-700 overflow-hidden">
                                                    <div className="h-full bg-secondary rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        </div>

                        {/* 2. Study Balance Card */}
                        <div className="bg-surface-container-lowest dark:bg-slate-900 squircle-lg p-4 sm:p-6 shadow-sm border border-outline-variant/30 flex flex-col gap-4 bento-card-interactive">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <Activity size={20} className="text-primary" />
                                    <h3 className="font-headline-md text-base sm:text-lg text-on-surface dark:text-white font-bold">تعادل مطالعاتی</h3>
                                </div>
                                <span className="text-label-sm font-label-sm bg-primary-container/40 text-primary px-2.5 py-0.5 rounded-full font-bold">تنوع هفتگی</span>
                            </div>
                            <div className="flex flex-col gap-2">
                                <div className="p-3 rounded-xl bg-surface-container-low dark:bg-slate-800/80 border border-outline-variant/20 flex items-center justify-between">
                                    <span className="text-xs text-on-surface-variant dark:text-gray-400 font-medium">پوشش موضوعات فعال:</span>
                                    <span className="text-xs font-bold text-primary">{formatToPersianDigits(balanceMetrics.activeCount)} از {formatToPersianDigits(balanceMetrics.totalSubCount)} حوزه فعال</span>
                                </div>
                                <div className="p-3 rounded-xl bg-surface-container-low dark:bg-slate-800/80 border border-outline-variant/20 flex items-center justify-between">
                                    <span className="text-xs text-on-surface-variant dark:text-gray-400 font-medium">شاخص انحراف از هدف:</span>
                                    <span className="text-xs font-bold text-secondary">{formatToPersianDigits(balanceMetrics.deviationPct)}٪ ({balanceMetrics.deviationPct <= 20 ? 'تعادل مناسب' : 'نیاز به بالانس'})</span>
                                </div>
                                <div className="p-3 rounded-xl bg-surface-container-low dark:bg-slate-800/80 border border-outline-variant/20 flex items-center justify-between">
                                    <span className="text-xs text-on-surface-variant dark:text-gray-400 font-medium">سهم عمومی به اختصاصی:</span>
                                    <span className="text-xs font-bold text-on-surface dark:text-white">{formatToPersianDigits(balanceMetrics.genPct)}٪ به {formatToPersianDigits(balanceMetrics.specPct)}٪</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* TAB 2: EXAM TRENDS */}
            {activeTab === 'exam' && (
                <div className="flex flex-col gap-space-lg">
                    <div className="bg-surface-container-lowest dark:bg-slate-900 squircle-lg p-space-lg shadow-sm border border-outline-variant/30 flex flex-col gap-4">
                        <div className="flex items-center justify-between">
                            <h2 className="font-headline-md text-headline-md text-on-surface dark:text-white font-bold flex items-center gap-2">
                                <Activity size={22} className="text-primary" />
                                <span>روند درصد و تراز در آزمون‌های آزمایشی</span>
                            </h2>
                            <span className="text-label-sm font-label-sm bg-primary-fixed text-on-primary-fixed-variant px-3 py-1 rounded-full font-bold">
                                {formatToPersianDigits(examTrendData.length)} آزمون ثبت‌شده
                            </span>
                        </div>

                        {examTrendData.length === 0 ? (
                            <div className="text-center py-12 text-on-surface-variant dark:text-gray-400 font-medium text-body-md">
                                هنوز آزمونی ثبت نشده است. هنگام افزودن تسک، نوع مطالعه را «آزمون» انتخاب کنید.
                            </div>
                        ) : (
                            <div className="h-72 w-full pt-4" dir="ltr">
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={examTrendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                        <defs>
                                            <linearGradient id="scoreColor" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#4648d4" stopOpacity={0.4} />
                                                <stop offset="95%" stopColor="#4648d4" stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.15} />
                                        <XAxis dataKey="shamsiDate" tick={{ fontSize: 11 }} />
                                        <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                                        <Tooltip
                                            content={({ active, payload, label }) => {
                                                if (active && payload && payload.length) {
                                                    return (
                                                        <div className="bg-surface-container-lowest dark:bg-slate-900 border border-outline-variant/30 text-on-surface dark:text-white p-2.5 rounded-xl shadow-lg text-xs font-bold font-sans">
                                                            <p className="text-on-surface-variant dark:text-gray-400 font-medium">{label}</p>
                                                            <p className="text-primary mt-1">تراز آزمون: {formatToPersianDigits(payload[0].value as number)}٪</p>
                                                        </div>
                                                    );
                                                }
                                                return null;
                                            }}
                                        />
                                        <Area type="monotone" dataKey="score" name="درصد تراز" stroke="#4648d4" strokeWidth={3} fillOpacity={1} fill="url(#scoreColor)" />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* TAB 3: MACRO PLANNER & HEATMAP */}
            {activeTab === 'macro' && (
                <div className="flex flex-col gap-space-lg">
                    <div className="bg-surface-container-lowest dark:bg-slate-900 squircle-lg p-space-lg shadow-sm border border-outline-variant/30">
                        <ActivityHeatmap />
                    </div>
                    <div className="bg-surface-container-lowest dark:bg-slate-900 squircle-lg p-space-lg shadow-sm border border-outline-variant/30">
                        <SmartMacroPlanner />
                    </div>
                </div>
            )}
        </div>
    );
};

export default Analysis;