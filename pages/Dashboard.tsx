import React, { useState, useEffect } from 'react';
import { useStore } from '../context/StoreContext';
import {
    ChevronLeft, ChevronRight, Plus, Target, Clock, Users,
    Clipboard, CalendarDays, Sparkles, GraduationCap, Pencil,
    BookOpen, ChevronDown, ArrowLeft, ArrowRight, Globe, Lock,
    Newspaper, FileText
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getShamsiDate, toIsoString } from '../utils';

/* ===== داشبورد اصلی =====
   این صفحه شامل بخش‌های زیر است:
   ۱. خوش‌آمدگویی با نام کاربر و Breadcrumb
   ۲. سه کارت آماری افقی با Progress Bar
   ۳. لینک‌های سریع (تکالیف، رویدادها، اخبار، امتحانات)
   ۴. تقویم کوچک ماهانه با نقاط رنگی رویداد
   ۵. لیست امتحانات آتی با نوار پیشرفت روزهای مانده
*/

// ===== داده‌های نمونه برای امتحانات آتی =====
const SAMPLE_EXAMS = [
    {
        id: '1',
        title: 'امتحان ریاضی',
        date: '14',
        month: 'اسفند',
        daysRemaining: 5,
        totalDays: 14,
        type: 'private' as const,
        color: 'blue',
    },
    {
        id: '2',
        title: 'فصل جدید علوم',
        date: '19',
        month: 'اسفند',
        daysRemaining: 10,
        totalDays: 20,
        type: 'public' as const,
        color: 'orange',
    },
    {
        id: '3',
        title: 'امتحان انگلیسی',
        date: '22',
        month: 'اسفند',
        daysRemaining: 12,
        totalDays: 25,
        type: 'public' as const,
        color: 'purple',
    },
    {
        id: '4',
        title: 'آزمون علوم',
        date: '25',
        month: 'اسفند',
        daysRemaining: 15,
        totalDays: 30,
        type: 'private' as const,
        color: 'green',
    },
];

// ===== رنگ‌های پاستل برای امتحانات =====
const EXAM_COLORS: Record<string, { dot: string; bar: string; bg: string }> = {
    blue: { dot: 'bg-blue-400', bar: 'bg-blue-500', bg: 'bg-blue-50' },
    orange: { dot: 'bg-orange-400', bar: 'bg-orange-500', bg: 'bg-orange-50' },
    purple: { dot: 'bg-purple-400', bar: 'bg-purple-500', bg: 'bg-purple-50' },
    green: { dot: 'bg-emerald-400', bar: 'bg-emerald-500', bg: 'bg-emerald-50' },
};

// ===== داده‌های تقویم شمسی (اسفند ۱۴۰۴) =====
const CALENDAR_DAYS = [
    // ردیف اول (قبل از ماه)
    { day: 0, empty: true }, { day: 0, empty: true }, { day: 0, empty: true },
    { day: 0, empty: true }, { day: 1 }, { day: 2 }, { day: 3 },
    // ردیف‌های بعدی
    { day: 4 }, { day: 5, hasEvent: true, eventColor: 'purple' },
    { day: 6 }, { day: 7 }, { day: 8 }, { day: 9, hasEvent: true, eventColor: 'orange' },
    { day: 10 },
    { day: 11 }, { day: 12 }, { day: 13 },
    { day: 14, isToday: true, hasEvent: true, eventColor: 'blue' },
    { day: 15 }, { day: 16 }, { day: 17 },
    { day: 18 }, { day: 19, hasEvent: true, eventColor: 'orange' },
    { day: 20 }, { day: 21 }, { day: 22 }, { day: 23 }, { day: 24 },
    { day: 25, hasEvent: true, eventColor: 'green' },
    { day: 26, hasEvent: true, eventColor: 'orange' },
    { day: 27 }, { day: 28 },
    { day: 29, hasEvent: true, eventColor: 'orange' },
    { day: 30, hasEvent: true, eventColor: 'purple' },
];

const WEEKDAYS = ['ش', 'ی', 'د', 'س', 'چ', 'پ', 'ج'];

const Dashboard = () => {
    const {
        userName, currentDay, getProgress, getTasksByDate, getDayDate,
        tasks: allTasks, totalDays, setIsTimerOpen, level
    } = useStore();

    const navigate = useNavigate();
    const overallProgress = getProgress();

    // تاریخ فعلی
    const activeDateIso = getDayDate(currentDay);
    const dailyTasks = getTasksByDate(activeDateIso);
    const completedDailyTasks = dailyTasks.filter(t => t.isCompleted).length;
    const daysLeft = Math.max(0, totalDays - currentDay);

    // ===== تبدیل ساعت به سلام =====
    const getGreeting = () => {
        const hour = new Date().getHours();
        if (hour < 12) return 'صبح بخیر';
        if (hour < 17) return 'ظهر بخیر';
        return 'عصر بخیر';
    };

    return (
        <div className="p-4 md:p-6 space-y-6 animate-page-enter">

            {/* ===== بخش خوش‌آمدگویی ===== */}
            <div>
                <h1 className="text-2xl md:text-3xl font-black text-gray-800 dark:text-white tracking-tight leading-tight">
                    {getGreeting()}، {userName || 'کاربر'} 👋
                </h1>
                <p className="text-sm text-gray-400 dark:text-gray-500 mt-1.5 font-medium">
                    بیا نگاهی به عملکرد و آمار تحصیلیت بندازیم.
                </p>
            </div>

            {/* ===== ۳ کارت آماری افقی ===== */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

                {/* کارت ۱: وضعیت پیشرفت */}
                <div className="bg-white dark:bg-gray-800/80 rounded-3xl p-5 shadow-[0_4px_20px_rgba(0,0,0,0.03)] border border-gray-100/80 dark:border-gray-700/50 animate-card-enter hover:shadow-md transition-shadow duration-300">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2.5">
                            <div className="w-9 h-9 rounded-xl bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
                                <Target size={18} className="text-orange-500" />
                            </div>
                            <span className="text-sm font-extrabold text-gray-700 dark:text-gray-200">وضعیت پیشرفت</span>
                        </div>
                        <button className="text-[11px] text-indigo-500 font-bold hover:text-indigo-600 transition">
                            مدیریت اهداف
                        </button>
                    </div>
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-bold text-gray-600 dark:text-gray-300">اهداف</span>
                        <span className="text-sm font-extrabold text-gray-800 dark:text-white">{overallProgress}%</span>
                    </div>
                    <div className="w-full bg-gray-100 dark:bg-gray-700 h-2.5 rounded-full overflow-hidden">
                        <div
                            className="bg-gradient-to-l from-orange-400 to-orange-500 h-full rounded-full transition-all duration-1000 ease-out"
                            style={{ width: `${overallProgress}%` }}
                        />
                    </div>
                </div>

                {/* کارت ۲: کلاس بعدی */}
                <div className="bg-white dark:bg-gray-800/80 rounded-3xl p-5 shadow-[0_4px_20px_rgba(0,0,0,0.03)] border border-gray-100/80 dark:border-gray-700/50 animate-card-enter hover:shadow-md transition-shadow duration-300">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2.5">
                            <div className="w-9 h-9 rounded-xl bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center">
                                <Clock size={18} className="text-indigo-500" />
                            </div>
                            <span className="text-sm font-extrabold text-gray-700 dark:text-gray-200">کلاس‌های آتی</span>
                        </div>
                        <button className="text-[11px] text-indigo-500 font-bold hover:text-indigo-600 transition">
                            مدیریت کلاس‌ها
                        </button>
                    </div>
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-bold text-gray-600 dark:text-gray-300">کلاس بعدی</span>
                        <span className="text-sm font-extrabold text-gray-800 dark:text-white">40 دقیقه</span>
                    </div>
                    <div className="w-full bg-gray-100 dark:bg-gray-700 h-2.5 rounded-full overflow-hidden">
                        <div
                            className="bg-gradient-to-l from-indigo-400 to-blue-500 h-full rounded-full transition-all duration-1000 ease-out"
                            style={{ width: '65%' }}
                        />
                    </div>
                </div>

                {/* کارت ۳: دانش‌آموزان حاضر */}
                <div className="bg-white dark:bg-gray-800/80 rounded-3xl p-5 shadow-[0_4px_20px_rgba(0,0,0,0.03)] border border-gray-100/80 dark:border-gray-700/50 animate-card-enter hover:shadow-md transition-shadow duration-300">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2.5">
                            <div className="w-9 h-9 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                                <Users size={18} className="text-emerald-500" />
                            </div>
                            <span className="text-sm font-extrabold text-gray-700 dark:text-gray-200">دانش‌آموزان</span>
                        </div>
                        <button className="text-[11px] text-indigo-500 font-bold hover:text-indigo-600 transition">
                            مدیریت دانش‌آموزان
                        </button>
                    </div>
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-bold text-gray-600 dark:text-gray-300">دانش‌آموزان حاضر</span>
                        <span className="text-sm font-extrabold text-gray-800 dark:text-white">21 / 25</span>
                    </div>
                    <div className="w-full bg-gray-100 dark:bg-gray-700 h-2.5 rounded-full overflow-hidden">
                        <div
                            className="bg-gradient-to-l from-emerald-400 to-teal-500 h-full rounded-full transition-all duration-1000 ease-out"
                            style={{ width: '84%' }}
                        />
                    </div>
                </div>
            </div>

            {/* ===== لینک‌های سریع (Assignments) ===== */}
            <div>
                <h3 className="text-sm font-extrabold text-gray-700 dark:text-gray-200 mb-3">تکالیف و رویدادها</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {[
                        { icon: Clipboard, label: 'تکالیف', count: 4, color: 'text-purple-600 bg-purple-50 dark:bg-purple-900/30', iconColor: 'text-purple-500' },
                        { icon: CalendarDays, label: 'رویدادهای جدید', count: 3, color: 'text-orange-600 bg-orange-50 dark:bg-orange-900/30', iconColor: 'text-orange-500' },
                        { icon: Sparkles, label: 'اخبار مدرسه', count: 12, color: 'text-amber-600 bg-amber-50 dark:bg-amber-900/30', iconColor: 'text-amber-500' },
                        { icon: GraduationCap, label: 'امتحانات', count: 8, color: 'text-green-600 bg-green-50 dark:bg-green-900/30', iconColor: 'text-green-500' },
                    ].map((item) => (
                        <button
                            key={item.label}
                            className="bg-white dark:bg-gray-800/80 rounded-2xl p-4 shadow-[0_4px_20px_rgba(0,0,0,0.03)] border border-gray-100/80 dark:border-gray-700/50 flex items-center gap-3 hover:shadow-md transition-all active:scale-[0.98] group"
                        >
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${item.color}`}>
                                <item.icon size={18} className={item.iconColor} />
                            </div>
                            <div className="text-right flex-1">
                                <p className="text-xl font-black text-gray-800 dark:text-white">{item.count}</p>
                                <p className="text-[11px] text-gray-400 dark:text-gray-500 font-medium">{item.label}</p>
                            </div>
                            <ChevronLeft size={16} className="text-gray-300 dark:text-gray-600 group-hover:text-gray-500 transition" />
                        </button>
                    ))}
                </div>
            </div>

            {/* ===== بخش تقویم + امتحانات ===== */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

                {/* ===== تقویم کوچک ماهانه ===== */}
                <div className="bg-white dark:bg-gray-800/80 rounded-3xl p-5 shadow-[0_4px_20px_rgba(0,0,0,0.03)] border border-gray-100/80 dark:border-gray-700/50">
                    <h3 className="text-sm font-extrabold text-gray-700 dark:text-gray-200 mb-4">برنامه</h3>

                    {/* هدر ماه با ناوبری */}
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                            {WEEKDAYS.map((d) => (
                                <span key={d} className="w-8 h-6 text-center text-[11px] font-bold text-gray-400 dark:text-gray-500">
                                    {d}
                                </span>
                            ))}
                        </div>
                    </div>

                    {/* گرید تقویم */}
                    <div className="grid grid-cols-7 gap-1">
                        {CALENDAR_DAYS.map((item, index) => (
                            <div
                                key={index}
                                className={`relative w-8 h-8 mx-auto flex flex-col items-center justify-center rounded-xl text-xs font-bold transition-all cursor-pointer
                  ${item.empty ? 'opacity-0 pointer-events-none' : ''}
                  ${item.isToday
                                        ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200/50 dark:shadow-none'
                                        : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                                    }
                `}
                            >
                                <span>{item.day || ''}</span>
                                {/* نقطه رنگی رویداد */}
                                {item.hasEvent && !item.isToday && (
                                    <div className={`absolute -bottom-0.5 w-1 h-1 rounded-full ${item.eventColor === 'purple' ? 'bg-purple-400' :
                                        item.eventColor === 'orange' ? 'bg-orange-400' :
                                            item.eventColor === 'blue' ? 'bg-blue-400' :
                                                'bg-emerald-400'
                                        }`} />
                                )}
                                {item.hasEvent && item.isToday && (
                                    <div className="absolute -bottom-0.5 w-1 h-1 rounded-full bg-white" />
                                )}
                            </div>
                        ))}
                    </div>
                </div>

                {/* ===== لیست امتحانات آتی ===== */}
                <div className="space-y-3">
                    <div className="flex items-center justify-between">
                        <h3 className="text-sm font-extrabold text-gray-700 dark:text-gray-200">امتحانات آتی</h3>
                        <button className="text-[11px] text-indigo-500 font-bold hover:text-indigo-600 transition flex items-center gap-1">
                            <Plus size={13} />
                            افزودن امتحان
                        </button>
                    </div>

                    {/* کارت‌های امتحان */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {SAMPLE_EXAMS.map((exam) => {
                            const colors = EXAM_COLORS[exam.color] || EXAM_COLORS.blue;
                            const progress = ((exam.totalDays - exam.daysRemaining) / exam.totalDays) * 100;

                            return (
                                <div
                                    key={exam.id}
                                    className="bg-white dark:bg-gray-800/80 rounded-2xl p-4 shadow-[0_4px_20px_rgba(0,0,0,0.03)] border border-gray-100/80 dark:border-gray-700/50 hover:shadow-md transition-all group"
                                >
                                    {/* هدر کارت امتحان */}
                                    <div className="flex items-center justify-between mb-2.5">
                                        <div className="flex items-center gap-2">
                                            <div className={`w-2.5 h-2.5 rounded-full ${colors.dot}`} />
                                            <span className="text-sm font-extrabold text-gray-700 dark:text-gray-200">{exam.title}</span>
                                        </div>
                                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${exam.type === 'private'
                                            ? 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-600'
                                            : 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800'
                                            }`}>
                                            {exam.type === 'private' ? 'خصوصی' : 'عمومی'}
                                        </span>
                                    </div>

                                    {/* تاریخ */}
                                    <div className="mb-3">
                                        <span className="text-2xl font-black text-gray-800 dark:text-white">{exam.date}</span>
                                        <span className="text-sm text-gray-400 dark:text-gray-500 mr-1.5 font-medium">{exam.month}</span>
                                    </div>

                                    {/* نوار پیشرفت روزهای باقیمانده */}
                                    <div>
                                        <div className="flex items-center justify-between mb-1.5">
                                            <span className="text-[11px] font-bold text-gray-400 dark:text-gray-500">روز باقیمانده</span>
                                            <span className="text-[11px] font-extrabold text-gray-600 dark:text-gray-300">{exam.daysRemaining} روز</span>
                                        </div>
                                        <div className="w-full bg-gray-100 dark:bg-gray-700 h-1.5 rounded-full overflow-hidden">
                                            <div
                                                className={`${colors.bar} h-full rounded-full transition-all duration-1000 ease-out`}
                                                style={{ width: `${progress}%` }}
                                            />
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* حالت خالی — اگر امتحانی نبود */}
                    {SAMPLE_EXAMS.length === 0 && (
                        <div className="text-center py-10 bg-white dark:bg-gray-800/60 rounded-2xl border border-gray-100/80 dark:border-gray-700/50 border-dashed">
                            <GraduationCap size={32} className="mx-auto mb-3 text-gray-300 dark:text-gray-600" />
                            <p className="text-sm text-gray-400 font-medium">امتحانی برای نمایش وجود ندارد</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
