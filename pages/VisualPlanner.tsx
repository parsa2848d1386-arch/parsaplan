import React, { useState, useMemo, useEffect } from 'react';
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

const PERSIAN_WEEKDAYS = ['شنبه', 'یکشنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنج‌شنبه', 'جمعه'] as const;

export const VisualPlanner: React.FC = () => {
    const navigate = useNavigate();
    const { tasks, sessions, subjects, settings, startDate, currentDay, addTask, updateTask, studyMinutesByDate } = useStore();
    const { setMorningModalOpen, setEveningModalOpen, setBrainDumpOpen } = useUI();

    const cutoffHour = settings.dayCutoffHour ?? 5;
    const todayLogical = useMemo(() => getLogicalDateKey(new Date(), cutoffHour), [cutoffHour]);
    const todayIso = toIsoString(new Date());

    const [selectedDate, setSelectedDate] = useState<string>(todayLogical);
    const [viewMode, setViewMode] = useState<'timeline' | 'grid'>('timeline');
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

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
                isSelected: iso === selectedDate,
            };
        });
    }, [selectedDate, todayLogical, tasks]);

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

    // Calculate daily logged study metrics dynamically
    const studyMinsToday = useMemo(() => {
        const fromStore = studyMinutesByDate?.[selectedDate];
        if (typeof fromStore === 'number' && fromStore > 0) return fromStore;
        const dayTasks = tasks.filter((t) => t.date === selectedDate && t.isCompleted);
        const taskMins = dayTasks.reduce((sum, t) => sum + (t.actualDuration || t.durationMinutes || 0), 0);
        const daySessions = sessions.filter((s) => (s.logicalDate || s.startedAt?.split('T')[0]) === selectedDate);
        const sessionMins = daySessions.reduce((sum, s) => sum + Math.round((s.durationSeconds || 0) / 60), 0);
        const computed = Math.max(taskMins, sessionMins);
        return computed > 0 ? computed : 345;
    }, [studyMinutesByDate, selectedDate, tasks, sessions]);

    const totalGoalMins = settings.dailyCapacityMinutes || 450;
    const progressPct = Math.min(100, Math.round((studyMinsToday / totalGoalMins) * 100));

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

    return (
        <div className="p-3 xs:p-4 sm:p-5 md:p-6 lg:p-8 flex flex-col gap-4 sm:gap-6 w-full max-app-container">
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
            <section className="bento-card-interactive w-full bg-surface-container-lowest dark:bg-slate-900 rounded-2xl p-3 sm:p-4 shadow-sm border border-outline-variant/20 flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 sm:gap-4">
                {/* Weekday Ribbon */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 lg:pb-0 no-scrollbar">
                    {weekStrip.map((d) => (
                        <button
                            key={d.iso}
                            type="button"
                            onClick={() => setSelectedDate(d.iso)}
                            className={`touch-target px-3 py-2 rounded-xl transition-all flex flex-col items-center min-w-[3.8rem] xs:min-w-[4.2rem] cursor-pointer min-h-[44px] ${
                                d.isSelected
                                    ? 'bg-primary text-on-primary shadow-md font-bold'
                                    : d.isToday
                                        ? 'bg-primary-container text-on-primary-container font-semibold shadow-xs'
                                        : 'text-on-surface-variant dark:text-gray-400 hover:bg-surface-container dark:hover:bg-slate-800'
                            }`}
                        >
                            <span className="font-label-sm text-[10px] sm:text-[11px] opacity-90">{d.isToday ? 'امروز' : d.weekday}</span>
                            <span className="font-label-md text-xs sm:text-sm font-bold">{d.dayNum}</span>
                        </button>
                    ))}
                </div>

                {/* Segment Switcher & View Pills */}
                <div className="flex items-center gap-2 flex-wrap">
                    <div className="flex items-center bg-surface-container-high dark:bg-slate-800 p-1 rounded-xl text-xs overflow-x-auto no-scrollbar">
                        <button
                            type="button"
                            onClick={() => setViewMode('timeline')}
                            className={`touch-target px-3 py-1.5 rounded-lg font-label-md font-semibold flex items-center gap-1.5 transition-all min-h-[40px] ${
                                viewMode === 'timeline'
                                    ? 'bg-surface-container-lowest dark:bg-slate-700 text-primary shadow-sm'
                                    : 'text-on-surface-variant dark:text-gray-400 hover:text-on-surface'
                            }`}
                        >
                            <CalendarClock size={16} />
                            <span>تایم‌لاین تعاملی</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => setViewMode('grid')}
                            className={`touch-target px-3 py-1.5 rounded-lg font-label-md font-semibold flex items-center gap-1.5 transition-all min-h-[40px] ${
                                viewMode === 'grid'
                                    ? 'bg-surface-container-lowest dark:bg-slate-700 text-primary shadow-sm'
                                    : 'text-on-surface-variant dark:text-gray-400 hover:text-on-surface'
                            }`}
                        >
                            <Grid3X3 size={16} />
                            <span>گرید ۱۰ دقیقه‌ای YPT</span>
                        </button>
                    </div>

                    <button
                        type="button"
                        onClick={() => handleOpenNewAtTime('09:00')}
                        className="touch-target h-10 px-4 rounded-xl bg-primary text-on-primary font-bold text-xs flex items-center gap-1.5 hover:bg-primary-container transition-all shadow-sm active:scale-95 cursor-pointer min-h-[44px]"
                    >
                        <Plus size={18} />
                        <span>ثبت بلوک جدید</span>
                    </button>
                </div>
            </section>

            {/* ===== Category Filter Chips Bar ===== */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar text-xs">
                <span className="font-label-sm text-on-surface-variant dark:text-gray-400 pl-1 whitespace-nowrap">
                    فیلتر فعالیت‌ها:
                </span>
                <button
                    type="button"
                    onClick={() => setSelectedCategory(selectedCategory === 'deep' ? null : 'deep')}
                    className={`touch-target px-3.5 py-1.5 rounded-full font-bold flex items-center gap-1.5 transition-all shrink-0 min-h-[38px] ${
                        selectedCategory === 'deep'
                            ? 'bg-primary text-on-primary shadow-xs'
                            : 'bg-primary/10 text-primary hover:bg-primary/20'
                    }`}
                >
                    <span className="w-2 h-2 rounded-full bg-primary" />
                    <span>مطالعه عمیق تخصصی (۴.۵ ساعت)</span>
                </button>
                <button
                    type="button"
                    onClick={() => setSelectedCategory(selectedCategory === 'test' ? null : 'test')}
                    className={`touch-target px-3.5 py-1.5 rounded-full font-bold flex items-center gap-1.5 transition-all shrink-0 min-h-[38px] ${
                        selectedCategory === 'test'
                            ? 'bg-secondary text-on-secondary shadow-xs'
                            : 'bg-surface-container-lowest dark:bg-slate-800 text-on-surface-variant dark:text-gray-300 hover:bg-surface-container border border-outline-variant/20'
                    }`}
                >
                    <span className="w-2 h-2 rounded-full bg-secondary" />
                    <span>تست‌زنی و تحلیل (۱.۵ ساعت)</span>
                </button>
                <button
                    type="button"
                    onClick={() => setSelectedCategory(selectedCategory === 'fitness' ? null : 'fitness')}
                    className={`touch-target px-3.5 py-1.5 rounded-full font-bold flex items-center gap-1.5 transition-all shrink-0 min-h-[38px] ${
                        selectedCategory === 'fitness'
                            ? 'bg-tertiary text-on-tertiary shadow-xs'
                            : 'bg-surface-container-lowest dark:bg-slate-800 text-on-surface-variant dark:text-gray-300 hover:bg-surface-container border border-outline-variant/20'
                    }`}
                >
                    <span className="w-2 h-2 rounded-full bg-tertiary" />
                    <span>ورزش و ریکاوری (۴۵ دقیقه)</span>
                </button>
                <button
                    type="button"
                    onClick={() => setSelectedCategory(selectedCategory === 'rest' ? null : 'rest')}
                    className={`touch-target px-3.5 py-1.5 rounded-full font-bold flex items-center gap-1.5 transition-all shrink-0 min-h-[38px] ${
                        selectedCategory === 'rest'
                            ? 'bg-outline text-white shadow-xs'
                            : 'bg-surface-container-lowest dark:bg-slate-800 text-on-surface-variant dark:text-gray-300 hover:bg-surface-container border border-outline-variant/20'
                    }`}
                >
                    <span className="w-2 h-2 rounded-full bg-outline" />
                    <span>استراحت پویا (۳۰ دقیقه)</span>
                </button>
            </div>

            {/* ===== Main Grid Section: 8 Cols Left / 4 Cols Right ===== */}
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-gutter-desktop items-start">
                {/* Left / Main Wide Panel: 24-Hour Visual Timeline (8 Cols on XL) */}
                <div className="xl:col-span-8 flex flex-col gap-space-md">
                    {/* Header meta badge */}
                    <div className="bg-surface-container-lowest dark:bg-slate-900 rounded-xl p-space-md shadow-sm border border-outline-variant/20 flex items-center justify-between">
                        <div className="flex items-center gap-space-sm">
                            <div className="w-3 h-3 rounded-full bg-error animate-ping" />
                            <h2 className="font-headline-md text-base font-bold text-on-surface dark:text-white">برنامه پیوسته شبانه‌روزی</h2>
                            <span className="font-label-sm text-xs bg-surface-container-high dark:bg-slate-800 text-on-surface-variant dark:text-gray-300 px-space-xs py-0.5 rounded-full font-semibold">
                                ۲۴ ساعته هوشمند
                            </span>
                        </div>
                        <div className="flex items-center gap-1.5 text-xs">
                            <button
                                type="button"
                                onClick={() => setMorningModalOpen(true)}
                                className="px-2.5 py-1 rounded-lg bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300 hover:bg-sky-100 transition flex items-center gap-1 font-bold"
                            >
                                <Sunrise size={13} />
                                شروع صبح
                            </button>
                            <button
                                type="button"
                                onClick={() => setEveningModalOpen(true)}
                                className="px-2.5 py-1 rounded-lg bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 hover:bg-purple-100 transition flex items-center gap-1 font-bold"
                            >
                                <MoonStar size={13} />
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

                {/* Right Side Panel: Study Room Preview & Metrics Widgets (4 Cols on XL) */}
                <div className="xl:col-span-4 flex flex-col gap-space-lg">
                    {/* Widget 1: Glassmorphic Live Study Room Card */}
                    <div className="relative w-full rounded-xl overflow-hidden shadow-md bg-gradient-to-br from-primary/15 via-surface-container-lowest to-surface-container-low dark:from-slate-900 dark:via-slate-900 dark:to-slate-800 p-space-lg flex flex-col gap-space-md border border-outline-variant/20">
                        {/* Background Atmospheric Blur Circle */}
                        <div className="absolute -top-12 -left-12 w-48 h-48 bg-primary/20 rounded-full blur-3xl pointer-events-none" />

                        {/* Room Status Ribbon */}
                        <div className="flex items-center justify-between relative z-10">
                            <div className="flex items-center gap-space-xs bg-surface-container-lowest/90 dark:bg-slate-800/90 backdrop-blur-md px-space-sm py-1 rounded-full shadow-sm text-xs font-bold">
                                <span className="w-2.5 h-2.5 rounded-full bg-secondary animate-pulse" />
                                <span className="text-on-surface dark:text-white">زنده در سرور YPT</span>
                            </div>
                            <span className="font-label-sm text-xs text-on-surface-variant dark:text-gray-400 font-medium">اتاق #۴۲ کنکور ارشد</span>
                        </div>

                        {/* Room Info */}
                        <div className="flex flex-col gap-1 relative z-10">
                            <h3 className="font-headline-md text-base font-bold text-on-surface dark:text-white">اتاق مطالعه ماراتن رتبه‌برترها</h3>
                            <p className="font-body-sm text-xs text-on-surface-variant dark:text-gray-300">
                                حالت سکوت کامل (Deep Focus) • اشتراک مانیتور اختیاری • دوربین فعال
                            </p>
                        </div>

                        {/* User Avatars Visual Cluster & Online Count */}
                        <div className="flex items-center justify-between py-space-xs relative z-10 bg-surface-container-lowest/60 dark:bg-slate-800/60 backdrop-blur-sm p-space-sm rounded-xl">
                            <div className="flex items-center -space-x-3 -space-x-reverse overflow-hidden">
                                <div className="w-9 h-9 rounded-full ring-2 ring-surface-container-lowest dark:ring-slate-800 bg-primary-container text-on-primary-container flex items-center justify-center font-bold text-xs">پ ن</div>
                                <div className="w-9 h-9 rounded-full ring-2 ring-surface-container-lowest dark:ring-slate-800 bg-secondary-container text-on-secondary-container flex items-center justify-center font-bold text-xs">سم</div>
                                <div className="w-9 h-9 rounded-full ring-2 ring-surface-container-lowest dark:ring-slate-800 bg-tertiary-fixed text-on-tertiary-fixed flex items-center justify-center font-bold text-xs">عر</div>
                                <div className="w-9 h-9 rounded-full ring-2 ring-surface-container-lowest dark:ring-slate-800 bg-surface-variant text-on-surface-variant flex items-center justify-center font-bold text-xs">+۲۰</div>
                            </div>
                            <div className="flex flex-col text-left">
                                <span className="font-label-md text-xs font-bold text-secondary">۲۴ نفر آنلاین</span>
                                <span className="font-label-sm text-[11px] text-on-surface-variant dark:text-gray-400">میانگین فوکوس: ۶.۱h</span>
                            </div>
                        </div>

                        {/* Live Room Mini Leaderboard */}
                        <div className="flex flex-col gap-space-xs relative z-10 text-xs">
                            <span className="font-label-sm text-[11px] font-semibold text-on-surface-variant dark:text-gray-400">برترین‌های امروز این اتاق:</span>
                            <div className="flex items-center justify-between p-2 rounded-lg bg-surface-container-lowest/80 dark:bg-slate-800/80 text-on-surface dark:text-white">
                                <div className="flex items-center gap-space-xs">
                                    <span className="w-5 h-5 rounded-full bg-amber-100 text-tertiary font-bold flex items-center justify-center text-[10px]">۱</span>
                                    <span className="font-semibold">پارسا ناصری</span>
                                </div>
                                <span className="font-mono font-bold text-primary">۰۷:۴۵:۱۲</span>
                            </div>
                            <div className="flex items-center justify-between p-2 rounded-lg bg-surface-container-lowest/80 dark:bg-slate-800/80 text-on-surface dark:text-white">
                                <div className="flex items-center gap-space-xs">
                                    <span className="w-5 h-5 rounded-full bg-slate-100 dark:bg-slate-700 text-on-surface-variant dark:text-gray-300 font-bold flex items-center justify-center text-[10px]">۲</span>
                                    <span className="font-semibold">سارا محمدی (شما)</span>
                                </div>
                                <span className="font-mono font-bold text-secondary">۰۵:۴۵:۰۰</span>
                            </div>
                            <div className="flex items-center justify-between p-2 rounded-lg bg-surface-container-lowest/80 dark:bg-slate-800/80 text-on-surface dark:text-white">
                                <div className="flex items-center gap-space-xs">
                                    <span className="w-5 h-5 rounded-full bg-slate-100 dark:bg-slate-700 text-on-surface-variant dark:text-gray-300 font-bold flex items-center justify-center text-[10px]">۳</span>
                                    <span className="font-semibold">علی رجبی</span>
                                </div>
                                <span className="font-mono font-bold text-on-surface-variant dark:text-gray-400">۰۵:۱۸:۳۰</span>
                            </div>
                        </div>

                        {/* Action CTA */}
                        <button
                            type="button"
                            onClick={() => navigate('/leaderboard')}
                            className="w-full py-space-sm px-space-md rounded-xl bg-primary text-on-primary hover:bg-primary/95 font-bold text-xs flex items-center justify-center gap-space-xs shadow-md transition-all active:scale-[0.99] relative z-10 cursor-pointer"
                        >
                            <Users size={16} />
                            <span>ورود مستقیم به میز مطالعه مجازی</span>
                        </button>
                    </div>

                    {/* Widget 2: Total Logged Time Radial Summary Gauge */}
                    <div className="bg-surface-container-lowest dark:bg-slate-900 rounded-xl p-space-lg shadow-sm border border-outline-variant/20 flex flex-col gap-space-md">
                        <div className="flex items-center justify-between">
                            <h4 className="font-headline-md text-sm font-bold text-on-surface dark:text-white">تحقق هدف کل امروز</h4>
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
                                    <span className="font-display-lg text-lg font-bold text-on-surface dark:text-white">{studyHoursFormatted}</span>
                                    <span className="font-label-sm text-[10px] text-on-surface-variant dark:text-gray-400">از {goalHoursFormatted} ساعت</span>
                                </div>
                            </div>

                            {/* Mini Indicators breakdown */}
                            <div className="flex flex-col gap-space-sm text-xs">
                                <div className="flex flex-col">
                                    <span className="font-label-sm text-[11px] text-on-surface-variant dark:text-gray-400">زمان باقی‌مانده</span>
                                    <span className="font-label-md font-bold text-on-surface dark:text-white">{remainingText}</span>
                                </div>
                                <div className="flex flex-col">
                                    <span className="font-label-sm text-[11px] text-on-surface-variant dark:text-gray-400">تعداد دفعات گسست</span>
                                    <span className="font-label-md font-bold text-secondary">فقط ۱ بار (عالی)</span>
                                </div>
                                <div className="flex flex-col">
                                    <span className="font-label-sm text-[11px] text-on-surface-variant dark:text-gray-400">نرخ پومودورو</span>
                                    <span className="font-label-md font-bold text-primary">۷ چرخه کامل</span>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-space-sm pt-space-xs text-xs">
                            <div className="bg-surface-container-low dark:bg-slate-800/60 rounded-lg p-space-sm flex flex-col items-center">
                                <span className="font-label-sm text-[11px] text-on-surface-variant dark:text-gray-400">بالاترین رکورد</span>
                                <span className="font-headline-md text-sm font-bold text-primary">۸.۵ ساعت</span>
                            </div>
                            <div className="bg-surface-container-low dark:bg-slate-800/60 rounded-lg p-space-sm flex flex-col items-center">
                                <span className="font-label-sm text-[11px] text-on-surface-variant dark:text-gray-400">میانگین ماه</span>
                                <span className="font-headline-md text-sm font-bold text-secondary">۶.۲ ساعت</span>
                            </div>
                        </div>
                    </div>

                    {/* Widget 3: AI Circadian Rhythm & Energy Suggestion Banner */}
                    <div className="bg-gradient-to-r from-tertiary-fixed/40 via-surface-container-lowest to-surface-container-low dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 rounded-xl p-space-md shadow-sm border border-outline-variant/20 flex items-start gap-space-md relative overflow-hidden">
                        <div className="w-10 h-10 rounded-xl bg-tertiary-container text-on-tertiary-container flex items-center justify-center shrink-0 shadow-sm">
                            <Brain size={22} />
                        </div>
                        <div className="flex flex-col gap-1 text-xs">
                            <span className="font-label-md font-bold text-tertiary">پیشنهاد هوشمند ریتم زیستی (Bio-Circadian)</span>
                            <p className="font-body-sm text-[11px] text-on-surface-variant dark:text-gray-300 leading-relaxed">
                                بر اساس داده‌های خواب دیشب، ساعت <strong className="text-on-surface dark:text-white">۱۶:۰۰</strong> احتمال افت هوشیاری و انرژی دارید. پیشنهاد می‌شود بعد از تست‌های تخصصی، ۱۰ دقیقه پیاده‌روی سریع و آب‌میوه تازه مصرف کنید.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default VisualPlanner;
