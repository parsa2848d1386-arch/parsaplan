import React, { useState, useMemo } from 'react';
import { useReducedMotion } from 'framer-motion';
import { useStore } from '../context/StoreContext';
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
    Target,
    Activity,
    BrainCircuit,
    Check,
    Sparkles,
    ChevronDown,
} from 'lucide-react';
import ActivityHeatmap from '../components/ActivityHeatmap';
import SmartMacroPlanner from '../components/SmartMacroPlanner';
import { CompactPageHero, HeroSegmentedTabs } from '../components/layout/CompactPageHero';
import { formatToPersianDigits, addDays, toIsoString } from '../utils';
import { getLogicalDateKey } from '../utils/streakEngine';

const EXAM_CHART_MARGIN = { top: 10, right: 10, left: -20, bottom: 0 };
const EXAM_AXIS_TICK = { fontSize: 11 };

interface ExamTooltipPayloadItem {
    value?: number | string;
}

interface ExamTooltipProps {
    active?: boolean;
    payload?: ExamTooltipPayloadItem[];
    label?: string | number;
}

const ExamTrendTooltip: React.FC<ExamTooltipProps> = React.memo(({ active, payload, label }) => {
    if (!active || !payload || payload.length === 0) return null;
    const rawVal = payload[0]?.value;
    const numericVal = typeof rawVal === 'number' ? rawVal : Number(rawVal) || 0;
    return (
        <div className="bg-[var(--surface-elevated)] border border-[var(--border-subtle)] text-on-surface p-2.5 rounded-xl shadow-lg text-xs font-bold">
            <p className="text-[var(--text-secondary)] font-medium">{label}</p>
            <p className="text-primary mt-1 tabular-nums">تراز آزمون: {formatToPersianDigits(numericVal)}٪</p>
        </div>
    );
});
ExamTrendTooltip.displayName = 'ExamTrendTooltip';

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
    const [activeTab, setActiveTab] = useState<'performance' | 'advisor'>('performance');
    const [showExamEmptySection, setShowExamEmptySection] = useState(false);

    const currentStream = settings?.stream || 'life';
    const isAcademicStream = currentStream === 'riazi' || currentStream === 'tajrobi' || currentStream === 'ensani';

    const completedTasks = useMemo(() => tasks.filter((t) => t.isCompleted), [tasks]);
    const overallProgress = getProgress();

    const ratedTasks = useMemo(() => completedTasks.filter((t) => t.qualityRating), [completedTasks]);
    const averageQuality = useMemo(
        () =>
            ratedTasks.length > 0
                ? ratedTasks.reduce((acc, t) => acc + (t.qualityRating || 0), 0) / ratedTasks.length
                : 0,
        [ratedTasks]
    );

    const testedTasks = useMemo(
        () => completedTasks.filter((t) => t.testStats && t.testStats.total > 0),
        [completedTasks]
    );
    const { totalTests, accuracy } = useMemo(() => {
        const tests = testedTasks.reduce((acc, t) => acc + (t.testStats?.total || 0), 0);
        const correct = testedTasks.reduce((acc, t) => acc + (t.testStats?.correct || 0), 0);
        const wrong = testedTasks.reduce((acc, t) => acc + (t.testStats?.wrong || 0), 0);
        const acc = tests > 0 ? Math.round(((correct * 3 - wrong) / (tests * 3)) * 100) : 0;
        return { totalTests: tests, accuracy: acc };
    }, [testedTasks]);

    const examTrendData = useMemo(
        () =>
            completedTasks
                .filter((t) => t.studyType === 'exam' && t.testStats && t.testStats.total > 0)
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
                }),
        [completedTasks]
    );

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

    const avgDailyMinutes =
        weeklyDistribution.activeDays > 0
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

    const efficiencyIndex =
        ratedTasks.length > 0
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

    const quest1Done = todayStudyMins >= 180;
    const hasMoodToday = Boolean(moods?.[todayLogical] || moods?.[todayIso]);
    const todayScheduledTasksCount = tasks.filter(
        (t) => (t.date === todayLogical || t.date === todayIso) && Boolean(t.startTime)
    ).length;
    const quest3Done = todayScheduledTasksCount >= 3;
    const completedQuestsCount = [quest1Done, hasMoodToday, quest3Done].filter(Boolean).length;

    const performanceSubjects = useMemo(() => {
        if (subjects.length > 0) return subjects.slice(0, 4).map((s) => ({ name: s.name }));
        return Array.from(new Set(tasks.map((t) => t.subject).filter(Boolean)))
            .slice(0, 4)
            .map((name) => ({ name }));
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
                const variance =
                    countsBySubject.reduce((sum, c) => sum + Math.pow(c - mean, 2), 0) / countsBySubject.length;
                deviationPct = Math.min(100, Math.round((Math.sqrt(variance) / mean) * 100));
            }
        }
        const specializedCount = tasks.filter((t) => isSpecializedSubject(currentStream, t.subject)).length;
        const specPct = tasks.length > 0 ? Math.round((specializedCount / tasks.length) * 100) : 0;
        const genPct = tasks.length > 0 ? 100 - specPct : 0;
        return { activeCount, totalSubCount, deviationPct, specPct, genPct };
    }, [subjects, tasks, currentStream]);

    const showExamBlockProminently = isAcademicStream || examTrendData.length > 0;

    return (
        <div className="flex flex-col w-full">
            <CompactPageHero
                title="تحلیل و پیشرفت"
                subtitleBadge={
                    <span className="text-[11px] sm:text-xs bg-white/18 text-white px-2.5 py-0.5 rounded-full font-bold border border-white/20 tabular-nums">
                        ۷ روز اخیر · بازده {formatToPersianDigits(efficiencyIndex)}٪
                    </span>
                }
                bottomSlot={
                    <HeroSegmentedTabs
                        layoutId="analysis-tabs"
                        ariaLabel="بخش‌های تحلیل عملکرد"
                        value={activeTab}
                        onChange={setActiveTab}
                        items={[
                            { id: 'performance', label: 'عملکرد و تداوم', icon: BrainCircuit },
                            {
                                id: 'advisor',
                                label: showExamBlockProminently ? 'مشاور و آزمون' : 'مشاور هوشمند',
                                icon: Sparkles,
                            },
                        ]}
                    />
                }
            />

            <div className="flex flex-col w-full p-3 xs:p-4 sm:p-5 md:p-6 lg:p-8 pb-10 md:pb-8 max-app-container mx-auto gap-4 sm:gap-5">
                {isDemoActive && (
                    <div className="flex flex-wrap items-center justify-between gap-3 squircle-card px-4 py-2.5 bg-[var(--surface-elevated)] border border-[var(--border-subtle)] text-xs text-[var(--text-secondary)]">
                        <div className="flex items-center gap-2.5 min-w-0">
                            <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" aria-hidden="true" />
                            <span className="font-bold text-on-surface shrink-0">پیش‌نمایش نمونه</span>
                            <span aria-hidden="true" className="text-[var(--text-muted)]">·</span>
                            <span className="font-medium truncate sm:whitespace-normal">
                                تمامی نمودارها بر اساس داده‌های واقعی حساب شما محاسبه می‌شوند.
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

                {activeTab === 'performance' && (
                    <div className="flex flex-col gap-4 sm:gap-5">
                        {/* Compact 3-KPI Strip */}
                        <div className="grid grid-cols-3 gap-2 sm:gap-3">
                            <div className="bg-[var(--surface-elevated)] p-3 sm:p-4 squircle-md border border-[var(--border-subtle)] flex flex-col gap-0.5 shadow-xs">
                                <span className="text-[11px] sm:text-xs text-[var(--text-secondary)] font-semibold">
                                    میانگین تمرکز
                                </span>
                                <span className="text-base sm:text-xl font-black text-on-surface tabular-nums">
                                    {avgHoursFormatted}{' '}
                                    <span className="text-[11px] font-medium text-[var(--text-tertiary)]">س/روز</span>
                                </span>
                                <span className="text-[11px] text-secondary font-bold tabular-nums">
                                    {formatToPersianDigits(weeklyDistribution.activeDays)} روز فعال
                                </span>
                            </div>

                            <div className="bg-[var(--surface-elevated)] p-3 sm:p-4 squircle-md border border-[var(--border-subtle)] flex flex-col gap-0.5 shadow-xs">
                                <span className="text-[11px] sm:text-xs text-[var(--text-secondary)] font-semibold">
                                    زمان طلایی
                                </span>
                                <span className="text-base sm:text-xl font-black text-primary tabular-nums">
                                    {goldenHourWindow}
                                </span>
                                <span className="text-[11px] text-[var(--text-secondary)] truncate">
                                    {sessions.length > 0 ? 'اوج ثبت جلسات' : 'در انتظار ثبت'}
                                </span>
                            </div>

                            <div className="bg-[var(--surface-elevated)] p-3 sm:p-4 squircle-md border border-[var(--border-subtle)] flex flex-col gap-0.5 shadow-xs">
                                <span className="text-[11px] sm:text-xs text-[var(--text-secondary)] font-semibold">
                                    شاخص بازده
                                </span>
                                <span className="text-base sm:text-xl font-black text-secondary tabular-nums">
                                    {formatToPersianDigits(efficiencyIndex)}٪
                                </span>
                                <span className="text-[11px] text-secondary font-bold">
                                    {efficiencyIndex >= 80 ? 'عالی' : efficiencyIndex >= 50 ? 'متعادل' : 'در شروع مسیر'}
                                </span>
                            </div>
                        </div>

                        {/* Weekly Bar Chart + Compact Quests */}
                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-5 items-start">
                            <div className="lg:col-span-7 bg-[var(--surface-elevated)] squircle-lg p-4 sm:p-6 shadow-xs flex flex-col gap-4 border border-[var(--border-subtle)]">
                                <div className="flex items-center justify-between gap-2">
                                    <div className="flex items-center gap-2">
                                        <Activity size={20} className="text-secondary shrink-0" aria-hidden="true" />
                                        <h2 className="text-sm sm:text-base text-on-surface font-bold">
                                            توزیع زمانی هفته (شنبه تا جمعه)
                                        </h2>
                                    </div>
                                    <span className="text-xs text-tertiary bg-tertiary-fixed/40 px-2.5 py-0.5 rounded-full font-bold tabular-nums">
                                        مجموع: {formatToPersianDigits(weeklyDistribution.totalHours)} ساعت
                                    </span>
                                </div>

                                <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                                    {weeklyDistribution.totalHours > 0 ? (
                                        <>
                                            {weeklyDistribution.maxDay.full} با{' '}
                                            <strong className="text-on-surface font-bold tabular-nums">
                                                {formatToPersianDigits(weeklyDistribution.maxDay.hours)} ساعت
                                            </strong>{' '}
                                            پرتمرکزترین روز هفته شما بوده است.
                                        </>
                                    ) : (
                                        'هنوز ساعت مطالعه‌ای در این هفته ثبت نشده است. با اولین تایمر فوکوس یا تکمیل تسک، نمودار فعال می‌شود.'
                                    )}
                                </p>

                                <div className="w-full bg-surface-container-low rounded-2xl p-3.5 sm:p-4 flex flex-col gap-2.5 border border-[var(--border-subtle)]">
                                    <div className="h-40 w-full flex items-end justify-between gap-2 px-1 pt-5">
                                        {weeklyDistribution.days.map((d) => {
                                            const isPeak =
                                                weeklyDistribution.totalHours > 0 &&
                                                d.iso === weeklyDistribution.maxDay.iso;
                                            const maxVal = Math.max(1, weeklyDistribution.maxDay.hours);
                                            const heightPct =
                                                d.hours > 0 ? Math.max(12, Math.round((d.hours / maxVal) * 100)) : 5;

                                            return (
                                                <div
                                                    key={d.iso}
                                                    className="flex-1 flex flex-col items-center gap-1 h-full justify-end relative group"
                                                >
                                                    {isPeak && (
                                                        <div className="absolute -top-3 bg-secondary text-on-secondary text-[11px] px-1.5 py-0.5 rounded-md shadow-xs font-bold">
                                                            رکورد
                                                        </div>
                                                    )}
                                                    <span
                                                        className={`text-[11px] font-bold tabular-nums ${
                                                            isPeak ? 'text-secondary' : 'text-[var(--text-secondary)]'
                                                        }`}
                                                    >
                                                        {formatToPersianDigits(d.hours)}
                                                    </span>
                                                    <div
                                                        className={`w-full max-w-[26px] rounded-t-lg transition-all ${
                                                            isPeak
                                                                ? 'bg-secondary shadow-xs'
                                                                : d.hours > 0
                                                                  ? 'bg-primary/50 group-hover:bg-primary'
                                                                  : 'bg-outline-variant/30'
                                                        }`}
                                                        style={{ height: `${heightPct}%` }}
                                                        title={`${d.full}: ${d.hours} ساعت`}
                                                    />
                                                    <span
                                                        className={`text-[11px] font-bold ${
                                                            isPeak ? 'text-secondary' : 'text-[var(--text-secondary)]'
                                                        }`}
                                                    >
                                                        {d.short}
                                                    </span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                    <div className="flex items-center justify-between text-[11px] text-[var(--text-secondary)] tabular-nums">
                                        <span>
                                            کمترین: {weeklyDistribution.minDay.full} (
                                            {formatToPersianDigits(weeklyDistribution.minDay.hours)} س)
                                        </span>
                                        <span className="text-secondary font-bold">
                                            بیشترین: {weeklyDistribution.maxDay.full} (
                                            {formatToPersianDigits(weeklyDistribution.maxDay.hours)} س)
                                        </span>
                                    </div>
                                </div>

                                <div className="bg-surface-container-low rounded-xl px-3.5 py-2.5 flex items-center gap-2.5 border border-[var(--border-subtle)] text-xs text-on-surface">
                                    <Sparkles size={17} className="text-primary shrink-0" aria-hidden="true" />
                                    <p className="leading-relaxed tabular-nums">
                                        {totalTests > 0
                                            ? `میانگین تراز آزمون‌ها ${formatToPersianDigits(accuracy)}٪ و پیشرفت کلی تسک‌ها ${formatToPersianDigits(overallProgress)}٪ است.`
                                            : `پیشرفت کل تسک‌های برنامه‌ریزی‌شده تاکنون ${formatToPersianDigits(overallProgress)}٪ بوده است.`}
                                    </p>
                                </div>
                            </div>

                            {/* Compact Daily Quests (Without Duplicate SprintTimerPod) */}
                            <div className="lg:col-span-5 bg-[var(--surface-elevated)] squircle-lg p-4 sm:p-6 shadow-xs flex flex-col gap-3.5 border border-[var(--border-subtle)]">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <Target size={19} className="text-secondary" aria-hidden="true" />
                                        <h3 className="text-sm sm:text-base text-on-surface font-bold">
                                            ماموریت‌های امروز
                                        </h3>
                                    </div>
                                    <span className="text-xs bg-secondary-container text-on-secondary-container px-2.5 py-0.5 rounded-full font-bold tabular-nums">
                                        {formatToPersianDigits(completedQuestsCount)} از ۳
                                    </span>
                                </div>

                                <div className="flex flex-col gap-2">
                                    {[
                                        {
                                            done: quest1Done,
                                            title: '۳ ساعت تمرکز ثبت‌شده امروز',
                                            sub: `${formatToPersianDigits(todayStudyMins)} از ۱۸۰ دقیقه`,
                                            xp: '+۱۰۰ XP',
                                        },
                                        {
                                            done: hasMoodToday,
                                            title: 'ثبت مود و سطح انرژی امروز',
                                            sub: hasMoodToday ? 'ثبت شده' : 'از داشبورد وضعیت را ثبت کنید',
                                            xp: '+۳۰ XP',
                                        },
                                        {
                                            done: quest3Done,
                                            title: 'ثبت ۳ بلاک زمانی در تایم‌لاین',
                                            sub: `${formatToPersianDigits(Math.min(3, todayScheduledTasksCount))} از ۳ بلاک`,
                                            xp: '+۵۰ XP',
                                        },
                                    ].map((q, idx) => (
                                        <div
                                            key={idx}
                                            className="bg-surface-container-low p-3 rounded-xl flex items-center justify-between gap-2 border border-[var(--border-subtle)]"
                                        >
                                            <div className="flex items-center gap-2.5 min-w-0">
                                                <div
                                                    className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 ${
                                                        q.done
                                                            ? 'bg-secondary text-on-secondary'
                                                            : 'bg-surface-container-highest text-transparent'
                                                    }`}
                                                >
                                                    <Check size={14} />
                                                </div>
                                                <div className="flex flex-col min-w-0">
                                                    <span
                                                        className={`text-xs font-bold text-on-surface truncate ${
                                                            q.done ? 'line-through opacity-70' : ''
                                                        }`}
                                                    >
                                                        {q.title}
                                                    </span>
                                                    <span className="text-[11px] text-[var(--text-secondary)] tabular-nums truncate">
                                                        {q.sub}
                                                    </span>
                                                </div>
                                            </div>
                                            <span className="bg-primary-fixed text-on-primary-fixed text-[11px] px-2 py-0.5 rounded-md font-bold shrink-0 tabular-nums">
                                                <bdi>{q.xp}</bdi>
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Performance Details (MUST precede Study Balance) & Study Balance */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
                            <div className="bg-[var(--surface-elevated)] squircle-lg p-4 sm:p-6 shadow-xs border border-[var(--border-subtle)] flex flex-col gap-3.5">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <TrendingUp size={19} className="text-secondary" aria-hidden="true" />
                                        <h3 className="text-sm sm:text-base text-on-surface font-bold">جزئیات عملکرد</h3>
                                    </div>
                                    <span className="text-xs bg-secondary-container/50 text-secondary px-2.5 py-0.5 rounded-full font-bold">
                                        تراز کلی
                                    </span>
                                </div>
                                <div className="flex flex-col gap-2">
                                    {performanceSubjects.length === 0 ? (
                                        <p className="text-xs text-[var(--text-secondary)] py-4 text-center">
                                            هنوز حوزه یا درسی با تسک فعال ثبت نشده است.
                                        </p>
                                    ) : (
                                        performanceSubjects.map((sub) => {
                                            const subTasks = tasks.filter((t) => t.subject === sub.name);
                                            const subDone = subTasks.filter((t) => t.isCompleted).length;
                                            const pct =
                                                subTasks.length > 0 ? Math.round((subDone / subTasks.length) * 100) : 0;
                                            return (
                                                <div
                                                    key={sub.name}
                                                    className="flex flex-col gap-1.5 p-2.5 rounded-xl bg-surface-container-low border border-[var(--border-subtle)]"
                                                >
                                                    <div className="flex items-center justify-between text-xs font-bold text-on-surface">
                                                        <span className="truncate">{sub.name}</span>
                                                        <span className="text-secondary tabular-nums">
                                                            {formatToPersianDigits(pct)}٪
                                                        </span>
                                                    </div>
                                                    <div className="w-full h-1.5 rounded-full bg-surface-container-highest overflow-hidden">
                                                        <div
                                                            className="h-full bg-secondary rounded-full transition-all duration-500"
                                                            style={{ width: `${pct}%` }}
                                                        />
                                                    </div>
                                                </div>
                                            );
                                        })
                                    )}
                                </div>
                            </div>

                            <div className="bg-[var(--surface-elevated)] squircle-lg p-4 sm:p-6 shadow-xs border border-[var(--border-subtle)] flex flex-col gap-3.5">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <Activity size={19} className="text-primary" aria-hidden="true" />
                                        <h3 className="text-sm sm:text-base text-on-surface font-bold">تعادل مطالعاتی</h3>
                                    </div>
                                    <span className="text-xs bg-primary-fixed text-on-primary-fixed px-2.5 py-0.5 rounded-full font-bold">
                                        تنوع هفتگی
                                    </span>
                                </div>
                                <div className="flex flex-col gap-2">
                                    <div className="p-3 rounded-xl bg-surface-container-low border border-[var(--border-subtle)] flex items-center justify-between text-xs">
                                        <span className="text-[var(--text-secondary)] font-medium">پوشش حوزه‌های فعال:</span>
                                        <span className="font-bold text-primary tabular-nums">
                                            {formatToPersianDigits(balanceMetrics.activeCount)} از{' '}
                                            {formatToPersianDigits(balanceMetrics.totalSubCount)} حوزه
                                        </span>
                                    </div>
                                    <div className="p-3 rounded-xl bg-surface-container-low border border-[var(--border-subtle)] flex items-center justify-between text-xs">
                                        <span className="text-[var(--text-secondary)] font-medium">شاخص انحراف از هدف:</span>
                                        <span className="font-bold text-secondary tabular-nums">
                                            {formatToPersianDigits(balanceMetrics.deviationPct)}٪ (
                                            {balanceMetrics.deviationPct <= 20 ? 'تعادل مناسب' : 'نیاز به بالانس'})
                                        </span>
                                    </div>
                                    <div className="p-3 rounded-xl bg-surface-container-low border border-[var(--border-subtle)] flex items-center justify-between text-xs">
                                        <span className="text-[var(--text-secondary)] font-medium">سهم عمومی به تخصصی:</span>
                                        <span className="font-bold text-on-surface tabular-nums">
                                            {formatToPersianDigits(balanceMetrics.genPct)}٪ به{' '}
                                            {formatToPersianDigits(balanceMetrics.specPct)}٪
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Integrated Monthly + Annual Consistency Heatmap */}
                        <div className="bg-[var(--surface-elevated)] squircle-lg p-4 sm:p-6 shadow-xs border border-[var(--border-subtle)]">
                            <ActivityHeatmap />
                        </div>
                    </div>
                )}

                {activeTab === 'advisor' && (
                    <div className="flex flex-col gap-4 sm:gap-5">
                        {showExamBlockProminently ? (
                            <div className="bg-[var(--surface-elevated)] squircle-lg p-4 sm:p-6 shadow-xs border border-[var(--border-subtle)] flex flex-col gap-4">
                                <div className="flex items-center justify-between gap-2">
                                    <h2 className="text-sm sm:text-base text-on-surface font-bold flex items-center gap-2">
                                        <Activity size={20} className="text-primary" aria-hidden="true" />
                                        <span>روند درصد و تراز در آزمون‌ها</span>
                                    </h2>
                                    <span className="text-xs bg-primary-fixed text-on-primary-fixed px-3 py-0.5 rounded-full font-bold tabular-nums">
                                        {formatToPersianDigits(examTrendData.length)} آزمون
                                    </span>
                                </div>

                                {examTrendData.length === 0 ? (
                                    <div className="text-center py-8 text-[var(--text-secondary)] text-xs">
                                        هنوز آزمونی ثبت نشده است. هنگام افزودن تسک، نوع آن را «آزمون» انتخاب کنید.
                                    </div>
                                ) : (
                                    <div className="h-64 w-full pt-2" dir="ltr">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <AreaChart data={examTrendData} margin={EXAM_CHART_MARGIN}>
                                                <defs>
                                                    <linearGradient id="scoreColor" x1="0" y1="0" x2="0" y2="1">
                                                        <stop offset="5%" stopColor="var(--md-primary)" stopOpacity={0.35} />
                                                        <stop offset="95%" stopColor="var(--md-primary)" stopOpacity={0} />
                                                    </linearGradient>
                                                </defs>
                                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-subtle)" />
                                                <XAxis dataKey="shamsiDate" tick={EXAM_AXIS_TICK} />
                                                <YAxis domain={[0, 100]} tick={EXAM_AXIS_TICK} />
                                                <Tooltip content={<ExamTrendTooltip />} />
                                                <Area
                                                    type="monotone"
                                                    dataKey="score"
                                                    name="درصد تراز"
                                                    stroke="var(--md-primary)"
                                                    strokeWidth={2.5}
                                                    fillOpacity={1}
                                                    fill="url(#scoreColor)"
                                                    isAnimationActive={!prefersReducedMotion}
                                                />
                                            </AreaChart>
                                        </ResponsiveContainer>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="bg-[var(--surface-elevated)] squircle-md px-4 py-3 border border-[var(--border-subtle)] flex items-center justify-between gap-3">
                                <div className="text-xs text-[var(--text-secondary)]">
                                    بخش روند آزمون‌ها برای مسیرهای تحصیلی است؛ در صورت ثبت آزمون اینجا نمایش داده می‌شود.
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setShowExamEmptySection((v) => !v)}
                                    className="text-xs font-bold text-primary flex items-center gap-1 shrink-0 cursor-pointer"
                                >
                                    <span>{showExamEmptySection ? 'بستن' : 'نمایش نمودار'}</span>
                                    <ChevronDown size={14} className={showExamEmptySection ? 'rotate-180 transition-transform' : 'transition-transform'} />
                                </button>
                            </div>
                        )}

                        {!showExamBlockProminently && showExamEmptySection && (
                            <div className="bg-[var(--surface-elevated)] squircle-lg p-5 border border-[var(--border-subtle)] text-center text-xs text-[var(--text-secondary)]">
                                هنوز آزمونی ثبت نشده است.
                            </div>
                        )}

                        <SmartMacroPlanner />
                    </div>
                )}
            </div>
        </div>
    );
};

export default Analysis;
