import React, { useState, useMemo, useEffect } from 'react';
import { useStore } from '../context/StoreContext';
import {
    BarChart,
    Bar,
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
    Award,
    Target,
    Zap,
    Activity,
    FileText,
    BrainCircuit,
    Play,
    Pause,
    Check,
    Flame,
    Gift,
    Sparkles,
    Calendar,
    ChevronLeft
} from 'lucide-react';
import ActivityHeatmap from '../components/ActivityHeatmap';
import SmartMacroPlanner from '../components/SmartMacroPlanner';
import { formatToPersianDigits } from '../utils';

export const Analysis = () => {
    const { tasks, getProgress, subjects, xp, showToast } = useStore();

    // Tab state: 'cognitive' (Bento Concept 3) | 'exam' | 'macro'
    const [activeTab, setActiveTab] = useState<'cognitive' | 'exam' | 'macro'>('cognitive');

    // Sprint interactive state
    const [isSprintRunning, setIsSprintRunning] = useState(false);
    const [sprintSeconds, setSprintSeconds] = useState(45 * 60);
    const [quest3Completed, setQuest3Completed] = useState(false);

    useEffect(() => {
        let interval: any = null;
        if (isSprintRunning) {
            interval = setInterval(() => {
                setSprintSeconds((prev) => {
                    if (prev <= 1) {
                        setIsSprintRunning(false);
                        showToast('اسپرینت فوکوس ۴۵ دقیقه‌ای با موفقیت تکمیل شد! +۷۵ XP 🌟', 'success');
                        return 45 * 60;
                    }
                    return prev - 1;
                });
            }, 1000);
        } else {
            clearInterval(interval);
        }
        return () => clearInterval(interval);
    }, [isSprintRunning, showToast]);

    const formatSprintTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        const faMins = formatToPersianDigits(mins);
        const faSecs = secs < 10 ? '۰' + formatToPersianDigits(secs) : formatToPersianDigits(secs);
        return `${faMins}:${faSecs}`;
    };

    // --- 1. Basic Stats ---
    const totalTasks = tasks.length;
    const completedTasks = tasks.filter((t) => t.isCompleted);
    const completedCount = completedTasks.length;
    const overallProgress = getProgress();

    // Duration
    const totalDurationMinutes = completedTasks.reduce((acc, t) => acc + (t.actualDuration || 0), 0);
    const totalDurationHours = Math.round((totalDurationMinutes / 60) * 10) / 10;

    // Quality (Average 1-5)
    const ratedTasks = completedTasks.filter((t) => t.qualityRating);
    const averageQuality =
        ratedTasks.length > 0
            ? Math.round((ratedTasks.reduce((acc, t) => acc + (t.qualityRating || 0), 0) / ratedTasks.length) * 10) / 10
            : 0;

    // Test Accuracy
    const testedTasks = completedTasks.filter((t) => t.testStats && t.testStats.total > 0);
    const totalTests = testedTasks.reduce((acc, t) => acc + (t.testStats?.total || 0), 0);
    const totalCorrect = testedTasks.reduce((acc, t) => acc + (t.testStats?.correct || 0), 0);
    const totalWrong = testedTasks.reduce((acc, t) => acc + (t.testStats?.wrong || 0), 0);

    const accuracy =
        totalTests > 0 ? Math.round(((totalCorrect * 3 - totalWrong) / (totalTests * 3)) * 100) : 0;

    // Exam trend
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

    return (
        <div className="flex flex-col w-full p-3 xs:p-4 sm:p-5 md:p-6 lg:p-8 max-app-container gap-4 sm:gap-6">
            {/* Header & Sub-Navigation Tabs */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-surface-container-lowest p-4 sm:p-5 rounded-2xl shadow-sm border border-outline-variant/30">
                <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-primary text-on-primary flex items-center justify-center shadow-md shrink-0">
                        <span className="material-symbols-outlined text-[26px]">insights</span>
                    </div>
                    <div>
                        <h1 className="font-headline-lg text-lg xs:text-xl md:text-2xl font-bold text-on-surface tracking-tight">
                            آنالیتیکس و هوش شناختی
                        </h1>
                        <p className="font-body-sm text-xs sm:text-sm text-on-surface-variant">
                            تحلیل عمیق ریتم زیستی، تمرکز ادراکی و تراز پیشرفت تحصیلی
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-1.5 p-1 bg-surface-container-low rounded-xl overflow-x-auto no-scrollbar max-w-full">
                    <button
                        onClick={() => setActiveTab('cognitive')}
                        className={`touch-target flex items-center gap-1.5 px-3 xs:px-4 py-2 rounded-lg text-label-sm font-label-sm transition-all whitespace-nowrap active:scale-95 ${
                            activeTab === 'cognitive'
                                ? 'bg-primary text-on-primary font-bold shadow-xs'
                                : 'text-on-surface-variant hover:text-on-surface'
                        }`}
                    >
                        <span className="material-symbols-outlined text-[18px]">psychology</span>
                        <span>کارایی شناختی و اسپرینت</span>
                    </button>
                    <button
                        onClick={() => setActiveTab('exam')}
                        className={`touch-target flex items-center gap-1.5 px-3 xs:px-4 py-2 rounded-lg text-label-sm font-label-sm transition-all whitespace-nowrap active:scale-95 ${
                            activeTab === 'exam'
                                ? 'bg-primary text-on-primary font-bold shadow-xs'
                                : 'text-on-surface-variant hover:text-on-surface'
                        }`}
                    >
                        <span className="material-symbols-outlined text-[18px]">query_stats</span>
                        <span>روند آزمون‌ها و تراز</span>
                    </button>
                    <button
                        onClick={() => setActiveTab('macro')}
                        className={`touch-target flex items-center gap-1.5 px-3 xs:px-4 py-2 rounded-lg text-label-sm font-label-sm transition-all whitespace-nowrap active:scale-95 ${
                            activeTab === 'macro'
                                ? 'bg-primary text-on-primary font-bold shadow-xs'
                                : 'text-on-surface-variant hover:text-on-surface'
                        }`}
                    >
                        <span className="material-symbols-outlined text-[18px]">timeline</span>
                        <span>ماکروپلنر و هیت‌مپ</span>
                    </button>
                </div>
            </div>

            {/* TAB 1: COGNITIVE PERFORMANCE & BENTO GRID */}
            {activeTab === 'cognitive' && (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6 items-start">
                    {/* LEFT COLUMN: Cognitive Metrics & Weekly Distribution (Span 7) */}
                    <div className="lg:col-span-7 flex flex-col gap-4 sm:gap-6">
                        {/* Key Cognitive Metrics Bento */}
                        <div className="bg-surface-container-lowest rounded-2xl p-4 sm:p-6 shadow-sm flex flex-col gap-4 border border-outline-variant/30 bento-card-interactive">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <span className="material-symbols-outlined text-primary text-[24px]">psychology</span>
                                    <h2 className="text-base sm:text-lg text-on-surface font-bold">
                                        تحلیل کارایی عصبی-شناختی
                                    </h2>
                                </div>
                                <span className="bg-surface-container-high text-on-surface-variant font-label-sm text-xs px-2.5 py-0.5 rounded-full font-bold">
                                    ۷ روز اخیر
                                </span>
                            </div>

                            {/* Metric Cards */}
                            <div className="grid grid-cols-1 xs:grid-cols-3 gap-2.5 pt-1">
                                <div className="bg-surface-container-low p-space-sm rounded-xl flex flex-col gap-1 items-start border border-outline-variant/20">
                                    <span className="font-label-sm text-label-sm text-on-surface-variant font-medium">میانگین تمرکز</span>
                                    <span className="font-headline-md text-headline-md text-on-surface font-bold">
                                        {formatToPersianDigits('۴:۱۵')}{' '}
                                        <span className="font-label-sm text-label-sm font-normal text-on-surface-variant">ساعت</span>
                                    </span>
                                    <span className="font-label-sm text-label-sm text-secondary font-bold flex items-center gap-0.5">
                                        <span className="material-symbols-outlined text-[14px]">trending_up</span>+۱۸٪
                                    </span>
                                </div>

                                <div className="bg-surface-container-low p-space-sm rounded-xl flex flex-col gap-1 items-start border border-outline-variant/20">
                                    <span className="font-label-sm text-label-sm text-on-surface-variant font-medium">زمان طلایی</span>
                                    <span className="font-headline-md text-headline-md text-primary font-bold">
                                        {formatToPersianDigits('۹-۱۱')}{' '}
                                        <span className="font-label-sm text-label-sm font-normal text-on-surface-variant">صبح</span>
                                    </span>
                                    <span className="font-label-sm text-label-sm text-on-surface-variant font-medium">اوج آلفا مغزی</span>
                                </div>

                                <div className="bg-surface-container-low p-space-sm rounded-xl flex flex-col gap-1 items-start border border-outline-variant/20">
                                    <span className="font-label-sm text-label-sm text-on-surface-variant font-medium">شاخص بازده</span>
                                    <span className="font-headline-md text-headline-md text-secondary font-bold">
                                        {formatToPersianDigits('۹۴')}٪
                                    </span>
                                    <span className="font-label-sm text-label-sm text-secondary font-bold">عالی (Zone A)</span>
                                </div>
                            </div>
                        </div>

                        {/* Weekly Study Distribution Bar Chart Bento */}
                        <div className="bg-surface-container-lowest rounded-2xl p-space-lg shadow-sm flex flex-col gap-space-md border border-outline-variant/30">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-space-xs">
                                    <span className="material-symbols-outlined text-secondary text-[24px]">bar_chart</span>
                                    <h3 className="font-headline-md text-headline-md text-on-surface font-bold">
                                        توزیع زمانی هفته (شنبه تا جمعه)
                                    </h3>
                                </div>
                                <span className="font-label-sm text-label-sm text-tertiary bg-tertiary-fixed/30 px-space-xs py-0.5 rounded-full font-bold">
                                    مجموع: {formatToPersianDigits('۳۲.۴')} ساعت
                                </span>
                            </div>
                            <p className="font-body-sm text-body-sm text-on-surface-variant leading-relaxed">
                                دوشنبه با <strong className="text-on-surface font-semibold">{formatToPersianDigits('۶.۸')} ساعت</strong> رکورد
                                هفتگی شما بوده است. استمرار ریتم صبحگاهی موجب کاهش خستگی ادراکی شد.
                            </p>

                            {/* Dynamic Inline SVG Bar Chart */}
                            <div className="w-full bg-surface-container-low rounded-xl p-space-md flex flex-col gap-space-sm border border-outline-variant/20">
                                <div className="h-44 w-full flex items-end justify-between gap-2 px-1 pt-6">
                                    {/* شنبه: 4.2h */}
                                    <div className="flex-1 flex flex-col items-center gap-space-xs h-full justify-end group cursor-pointer">
                                        <span className="font-label-sm text-label-sm text-on-surface-variant group-hover:text-primary transition-colors font-bold">
                                            {formatToPersianDigits('۴.۲')}
                                        </span>
                                        <div
                                            className="w-full max-w-[28px] bg-primary/30 rounded-t-lg transition-all group-hover:bg-primary"
                                            style={{ height: '61%' }}
                                        ></div>
                                        <span className="font-label-sm text-label-sm text-on-surface-variant font-bold">ش</span>
                                    </div>

                                    {/* یکشنبه: 3.5h */}
                                    <div className="flex-1 flex flex-col items-center gap-space-xs h-full justify-end group cursor-pointer">
                                        <span className="font-label-sm text-label-sm text-on-surface-variant group-hover:text-primary transition-colors font-bold">
                                            {formatToPersianDigits('۳.۵')}
                                        </span>
                                        <div
                                            className="w-full max-w-[28px] bg-primary/30 rounded-t-lg transition-all group-hover:bg-primary"
                                            style={{ height: '51%' }}
                                        ></div>
                                        <span className="font-label-sm text-label-sm text-on-surface-variant font-bold">ی</span>
                                    </div>

                                    {/* دوشنبه: Peak 6.8h (Highlighted) */}
                                    <div className="flex-1 flex flex-col items-center gap-space-xs h-full justify-end relative group cursor-pointer">
                                        <div className="absolute -top-3 bg-secondary text-on-secondary font-label-sm text-label-sm px-1.5 py-0.5 rounded-md shadow-xs animate-bounce font-bold">
                                            رکورد
                                        </div>
                                        <span className="font-label-sm text-label-sm text-secondary font-bold">
                                            {formatToPersianDigits('۶.۸')}
                                        </span>
                                        <div
                                            className="w-full max-w-[28px] bg-secondary rounded-t-lg shadow-sm"
                                            style={{ height: '100%' }}
                                        ></div>
                                        <span className="font-label-sm text-label-sm text-secondary font-bold">د</span>
                                    </div>

                                    {/* سه‌شنبه: 5.1h */}
                                    <div className="flex-1 flex flex-col items-center gap-space-xs h-full justify-end group cursor-pointer">
                                        <span className="font-label-sm text-label-sm text-on-surface-variant group-hover:text-primary transition-colors font-bold">
                                            {formatToPersianDigits('۵.۱')}
                                        </span>
                                        <div
                                            className="w-full max-w-[28px] bg-primary/40 rounded-t-lg transition-all group-hover:bg-primary"
                                            style={{ height: '75%' }}
                                        ></div>
                                        <span className="font-label-sm text-label-sm text-on-surface-variant font-bold">س</span>
                                    </div>

                                    {/* چهارشنبه: 4.8h */}
                                    <div className="flex-1 flex flex-col items-center gap-space-xs h-full justify-end group cursor-pointer">
                                        <span className="font-label-sm text-label-sm text-on-surface-variant group-hover:text-primary transition-colors font-bold">
                                            {formatToPersianDigits('۴.۸')}
                                        </span>
                                        <div
                                            className="w-full max-w-[28px] bg-primary/35 rounded-t-lg transition-all group-hover:bg-primary"
                                            style={{ height: '70%' }}
                                        ></div>
                                        <span className="font-label-sm text-label-sm text-on-surface-variant font-bold">چ</span>
                                    </div>

                                    {/* پنج‌شنبه: 5.5h */}
                                    <div className="flex-1 flex flex-col items-center gap-space-xs h-full justify-end group cursor-pointer">
                                        <span className="font-label-sm text-label-sm text-on-surface-variant group-hover:text-primary transition-colors font-bold">
                                            {formatToPersianDigits('۵.۵')}
                                        </span>
                                        <div
                                            className="w-full max-w-[28px] bg-primary/50 rounded-t-lg transition-all group-hover:bg-primary"
                                            style={{ height: '80%' }}
                                        ></div>
                                        <span className="font-label-sm text-label-sm text-on-surface-variant font-bold">پ</span>
                                    </div>

                                    {/* جمعه: 2.5h */}
                                    <div className="flex-1 flex flex-col items-center gap-space-xs h-full justify-end group cursor-pointer">
                                        <span className="font-label-sm text-label-sm text-on-surface-variant group-hover:text-primary transition-colors font-bold">
                                            {formatToPersianDigits('۲.۵')}
                                        </span>
                                        <div
                                            className="w-full max-w-[28px] bg-primary/20 rounded-t-lg transition-all group-hover:bg-primary"
                                            style={{ height: '36%' }}
                                        ></div>
                                        <span className="font-label-sm text-label-sm text-on-surface-variant font-bold">ج</span>
                                    </div>
                                </div>
                                <div className="flex items-center justify-between pt-space-xs font-label-sm text-label-sm text-on-surface-variant">
                                    <span>کمترین: جمعه ({formatToPersianDigits('۲.۵')} ساعت)</span>
                                    <span className="text-secondary font-bold">بیشترین: دوشنبه ({formatToPersianDigits('۶.۸')} ساعت)</span>
                                </div>
                            </div>

                            {/* Analytical takeaway callout */}
                            <div className="bg-surface-container rounded-xl p-space-sm flex items-center gap-space-sm border border-outline-variant/20">
                                <span className="material-symbols-outlined text-primary text-[22px]">insights</span>
                                <p className="font-body-sm text-body-sm text-on-surface leading-normal">
                                    همگامی فعالیت با ریتم شبانه‌روزی (Circadian) کیفیت تست‌زنی را تا{' '}
                                    <span className="font-bold text-primary">{formatToPersianDigits('۲۳')}٪</span> بهبود بخشیده است.
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* RIGHT COLUMN: Focus Sprint Pod & Daily Productivity Quests (Span 5) */}
                    <div className="lg:col-span-5 flex flex-col gap-space-lg">
                        {/* Big Focus Sprint Pod */}
                        <div className="bg-surface-container-lowest rounded-2xl p-space-lg shadow-sm flex flex-col gap-space-md relative overflow-hidden border border-outline-variant/30">
                            {/* Accent Glow */}
                            <div className="absolute -top-12 -left-12 w-40 h-40 bg-primary/10 rounded-full blur-2xl pointer-events-none"></div>

                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-space-xs">
                                    <span className="material-symbols-outlined text-primary text-[24px]">timer</span>
                                    <h2 className="font-headline-md text-headline-md text-on-surface font-bold">
                                        فوکوس اسپرینت هوشمند
                                    </h2>
                                </div>
                                <span className="font-label-sm text-label-sm bg-primary-fixed text-on-primary-fixed-variant px-space-xs py-0.5 rounded-full font-bold">
                                    تکنیک پومودورو پلاس
                                </span>
                            </div>

                            <div className="bg-surface-container-low rounded-xl p-space-md flex flex-col items-center justify-center text-center gap-space-sm border border-outline-variant/20">
                                {/* Visual Circular Gauge (SVG) */}
                                <div className="relative w-36 h-36 flex items-center justify-center">
                                    <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                                        <circle
                                            className="text-surface-container-highest"
                                            cx="50"
                                            cy="50"
                                            fill="none"
                                            r="42"
                                            stroke="currentColor"
                                            strokeWidth="8"
                                        ></circle>
                                        <circle
                                            className="text-primary transition-all duration-1000"
                                            cx="50"
                                            cy="50"
                                            fill="none"
                                            r="42"
                                            stroke="currentColor"
                                            strokeDasharray="264"
                                            strokeDashoffset={isSprintRunning ? 66 : 130}
                                            strokeLinecap="round"
                                            strokeWidth="8"
                                        ></circle>
                                    </svg>
                                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                                        <span className="font-display-lg text-headline-lg font-bold text-on-surface tracking-tight" dir="ltr">
                                            {formatSprintTime(sprintSeconds)}
                                        </span>
                                        <span className="font-label-sm text-label-sm text-on-surface-variant font-medium">
                                            دقیقه غوطه‌وری عمیق
                                        </span>
                                    </div>
                                </div>

                                <div className="flex flex-col gap-0.5">
                                    <span className="font-label-md text-label-md font-bold text-on-surface">
                                        آماده برای شروع اسپرینت ۴۵ دقیقه‌ای؟
                                    </span>
                                    <p className="font-body-sm text-body-sm text-on-surface-variant">
                                        سکوت مطلق، خاموشی اعلان‌ها و مسدودسازی وب‌سایت‌های حواس‌پرت‌کن.
                                    </p>
                                </div>

                                {/* Big Action Button */}
                                <button
                                    onClick={() => setIsSprintRunning(!isSprintRunning)}
                                    className={`touch-target w-full mt-2 py-3 px-4 rounded-xl font-medium text-sm font-bold shadow-md transition-all active:scale-[0.98] flex items-center justify-center gap-2 cursor-pointer ${
                                        isSprintRunning
                                            ? 'bg-tertiary text-on-tertiary'
                                            : 'bg-primary hover:bg-primary-container text-on-primary'
                                    }`}
                                >
                                    <span className="material-symbols-outlined text-[20px]">
                                        {isSprintRunning ? 'pause_circle' : 'play_circle'}
                                    </span>
                                    <span>
                                        {isSprintRunning ? 'توقف موقت اسپرینت' : 'شروع اسپرینت فوکوس (+۷۵ XP)'}
                                    </span>
                                </button>
                            </div>

                            <div className="flex items-center justify-between text-on-surface-variant font-body-sm text-xs sm:text-sm px-1">
                                <span className="flex items-center gap-1 font-medium">
                                    <span className="material-symbols-outlined text-[16px] text-secondary">check_circle</span>
                                    ۳ از ۴ اسپرینت انجام شد
                                </span>
                                <span className="font-bold text-primary">۱ اسپرینت تا تکمیل هدف روز</span>
                            </div>
                        </div>

                        {/* Daily Productivity Quests Bento */}
                        <div className="bg-surface-container-lowest rounded-2xl p-4 sm:p-6 shadow-sm flex flex-col gap-4 border border-outline-variant/30 bento-card-interactive">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <span className="material-symbols-outlined text-secondary text-[24px]">flag_circle</span>
                                    <h3 className="text-base sm:text-lg text-on-surface font-bold">
                                        ماموریت‌های فعال امروز
                                    </h3>
                                </div>
                                <span className="font-label-sm text-xs bg-secondary-container text-on-secondary-container px-2.5 py-0.5 rounded-full font-bold">
                                    {quest3Completed ? '۳ از ۳ تکمیل' : '۲ از ۳ تکمیل'}
                                </span>
                            </div>

                            <div className="flex flex-col gap-2">
                                {/* Quest 1: Completed */}
                                <div className="bg-surface-container-low p-3 sm:p-4 rounded-xl flex items-center justify-between transition-colors border border-outline-variant/20">
                                    <div className="flex items-center gap-3">
                                        <div className="w-7 h-7 rounded-lg bg-secondary text-on-secondary flex items-center justify-center shadow-xs shrink-0">
                                            <span className="material-symbols-outlined text-[18px]">check</span>
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="font-label-md text-sm text-on-surface font-semibold line-through opacity-75">
                                                ۳ ساعت مطالعه مداوم
                                            </span>
                                            <span className="font-label-sm text-xs text-secondary font-medium">
                                                انجام شد در نوبت صبح
                                            </span>
                                        </div>
                                    </div>
                                    <span className="bg-secondary-fixed text-on-secondary-fixed font-label-sm text-xs px-2 py-0.5 rounded-md font-bold shrink-0">
                                        +۱۰۰ XP
                                    </span>
                                </div>

                                {/* Quest 2: Completed */}
                                <div className="bg-surface-container-low p-3 sm:p-4 rounded-xl flex items-center justify-between transition-colors border border-outline-variant/20">
                                    <div className="flex items-center gap-3">
                                        <div className="w-7 h-7 rounded-lg bg-secondary text-on-secondary flex items-center justify-center shadow-xs shrink-0">
                                            <span className="material-symbols-outlined text-[18px]">check</span>
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="font-label-md text-sm text-on-surface font-semibold line-through opacity-75">
                                                چک‌این روحی و ذهنی
                                            </span>
                                            <span className="font-label-sm text-xs text-secondary font-medium">
                                                ثبت سطح انرژی: ۸ از ۱۰
                                            </span>
                                        </div>
                                    </div>
                                    <span className="bg-secondary-fixed text-on-secondary-fixed font-label-sm text-xs px-2 py-0.5 rounded-md font-bold shrink-0">
                                        +۳۰ XP
                                    </span>
                                </div>

                                {/* Quest 3: Actionable Toggle */}
                                <div className="bg-surface-container-low p-3 sm:p-4 rounded-xl flex items-center justify-between transition-colors border border-outline-variant/20">
                                    <div className="flex items-center gap-3">
                                        <button
                                            onClick={() => setQuest3Completed(!quest3Completed)}
                                            className={`touch-target w-8 h-8 rounded-lg flex items-center justify-center transition-all shrink-0 ${
                                                quest3Completed
                                                    ? 'bg-secondary text-on-secondary'
                                                    : 'bg-surface-container-highest text-transparent hover:text-on-surface-variant'
                                            }`}
                                        >
                                            <span className="material-symbols-outlined text-[18px]">check</span>
                                        </button>
                                        <div className="flex flex-col">
                                            <span
                                                className={`font-label-md text-sm font-semibold ${
                                                    quest3Completed ? 'line-through opacity-75' : 'text-on-surface'
                                                }`}
                                            >
                                                ثبت ۳ بلاک زمانی در تایم‌لاین
                                            </span>
                                            <span className="font-label-sm text-xs text-on-surface-variant font-medium">
                                                {quest3Completed ? 'تکمیل شد!' : 'پیشرفت فعلی: ۲ از ۳ بلاک'}
                                            </span>
                                        </div>
                                    </div>
                                    <span className="bg-primary-fixed text-on-primary-fixed-variant font-label-sm text-label-sm px-space-xs py-0.5 rounded-md font-bold">
                                        +۵۰ XP
                                    </span>
                                </div>
                            </div>

                            {/* Weekly Bonus Chest Info */}
                            <div className="bg-tertiary-fixed/30 p-space-sm rounded-xl flex items-center gap-space-sm border border-tertiary/20">
                                <span className="material-symbols-outlined text-tertiary text-[26px]">redeem</span>
                                <div className="flex flex-col">
                                    <span className="font-label-sm text-label-sm text-tertiary font-bold">صندوق گنجینه هفتگی</span>
                                    <span className="font-body-sm text-body-sm text-on-surface font-medium">
                                        با اتمام ماموریت امشب، صندوق الماس با ۳۰۰ XP آزاد می‌شود.
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* TAB 2: EXAM TRENDS */}
            {activeTab === 'exam' && (
                <div className="flex flex-col gap-space-lg">
                    <div className="bg-surface-container-lowest rounded-2xl p-space-lg shadow-sm border border-outline-variant/30 flex flex-col gap-4">
                        <div className="flex items-center justify-between">
                            <h2 className="font-headline-md text-headline-md text-on-surface font-bold flex items-center gap-2">
                                <span className="material-symbols-outlined text-primary text-[24px]">query_stats</span>
                                <span>روند درصد و تراز در آزمون‌های آزمایشی</span>
                            </h2>
                            <span className="text-label-sm font-label-sm bg-primary-fixed text-on-primary-fixed-variant px-3 py-1 rounded-full font-bold">
                                {formatToPersianDigits(examTrendData.length)} آزمون ثبت‌شده
                            </span>
                        </div>

                        {examTrendData.length === 0 ? (
                            <div className="text-center py-12 text-on-surface-variant font-medium text-body-md">
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
                                            contentStyle={{
                                                backgroundColor: '#f8f9ff',
                                                borderRadius: '12px',
                                                border: '1px solid #c7c4d7',
                                                textAlign: 'right',
                                                fontFamily: 'Vazirmatn'
                                            }}
                                        />
                                        <Area
                                            type="monotone"
                                            dataKey="score"
                                            name="درصد تراز"
                                            stroke="#4648d4"
                                            strokeWidth={3}
                                            fillOpacity={1}
                                            fill="url(#scoreColor)"
                                        />
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
                    <div className="bg-surface-container-lowest rounded-2xl p-space-lg shadow-sm border border-outline-variant/30">
                        <ActivityHeatmap />
                    </div>

                    <div className="bg-surface-container-lowest rounded-2xl p-space-lg shadow-sm border border-outline-variant/30">
                        <SmartMacroPlanner />
                    </div>
                </div>
            )}
        </div>
    );
};

export default Analysis;