import React, { useState } from 'react';
import { useStore } from '../context/StoreContext';
import { addDays, toIsoString, getShamsiDate, toJalaali, toGregorian } from '../utils';

const ActivityHeatmap = () => {
    const { tasks, getTasksByDate, moods, studyHoursLog, routineTemplate, isRoutineSlotCompleted, currentDay } = useStore();

    // Custom Tooltip State
    const [hoveredDay, setHoveredDay] = useState<{
        shamsi: string;
        hours: number;
        label: string;
        mood?: string;
    } | null>(null);
    const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });

    // Mood Colors mapping
    const moodColors: Record<string, string> = {
        'happy': 'ring-emerald-400 dark:ring-emerald-400',
        'energetic': 'ring-violet-400 dark:ring-violet-400',
        'neutral': 'ring-gray-300 dark:ring-gray-500',
        'tired': 'ring-orange-400 dark:ring-orange-400',
        'sad': 'ring-rose-400 dark:ring-rose-400',
    };

    const moodLabels: Record<string, string> = {
        'happy': 'خوشحال',
        'energetic': 'پرانرژی',
        'neutral': 'معمولی',
        'tired': 'خسته',
        'sad': 'ناراحت',
    };

    // Generate Current Shamsi Month Days
    const today = new Date();
    const { jy, jm } = toJalaali(today.getFullYear(), today.getMonth() + 1, today.getDate());
    const daysInMonth = jm <= 6 ? 31 : (jm <= 11 ? 30 : (jy % 4 === 3 ? 30 : 29));

    const days = [];
    for (let d = 1; d <= daysInMonth; d++) {
        const gDate = toGregorian(jy, jm, d);
        days.push(gDate);
    }

    // === محاسبه ساعات مطالعه ===
    const getStudyHours = (iso: string): number => {
        // ساعات واقعی ثبت‌شده
        const loggedHours = studyHoursLog?.[iso];
        if (loggedHours !== undefined && loggedHours >= 0) return loggedHours;

        // fallback: تخمین از تسک‌ها
        const dailyTasks = getTasksByDate(iso);
        let hours = 0;
        dailyTasks.forEach(t => {
            if (t.isCompleted) {
                if (t.studyType === 'exam' || t.studyType === 'analysis') hours += 1.5;
                else hours += 1;
            }
        });
        return hours;
    };

    // === رنگ‌بندی بر اساس ساعات مطالعه ===
    const getColor = (hours: number) => {
        if (hours === 0) return 'bg-gray-100 dark:bg-gray-800';
        if (hours <= 2) return 'bg-indigo-200 dark:bg-indigo-900/40';
        if (hours <= 4) return 'bg-indigo-300 dark:bg-indigo-800/50';
        if (hours <= 6) return 'bg-indigo-400 dark:bg-indigo-700/60';
        if (hours <= 8) return 'bg-indigo-500 dark:bg-indigo-600/70';
        return 'bg-indigo-700 dark:bg-indigo-400';
    };

    // === توضیح ساعات برای tooltip ===
    const getLabel = (hours: number, iso: string): string => {
        const isLogged = studyHoursLog?.[iso] !== undefined && studyHoursLog?.[iso] >= 0;
        const prefix = isLogged ? 'ثبت‌شده' : 'تخمینی';
        if (hours === 0) return `${prefix}: بدون فعالیت`;
        if (hours <= 2) return `${prefix}: کم`;
        if (hours <= 4) return `${prefix}: متوسط`;
        if (hours <= 6) return `${prefix}: خوب`;
        if (hours <= 8) return `${prefix}: خیلی خوب`;
        return `${prefix}: عالی 🔥`;
    };

    const handleMouseEnter = (e: React.MouseEvent, shamsi: string, hours: number, label: string, mood?: string) => {
        const rect = e.currentTarget.getBoundingClientRect();
        // پیدا کردن پوزیشن والد برای موقعیت‌یابی مطلق صحیح تول‌تیپ محلی
        const element = e.currentTarget as HTMLElement;
        const parent = element.offsetParent as HTMLElement;
        if (parent) {
            const parentRect = parent.getBoundingClientRect();
            setTooltipPos({
                x: rect.left - parentRect.left + rect.width / 2,
                y: rect.top - parentRect.top - 8
            });
        }
        setHoveredDay({ shamsi, hours, label, mood });
    };

    const handleMouseLeave = () => {
        setHoveredDay(null);
    };

    return (
        <div className="bg-white dark:bg-gray-800 p-5 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 relative">
            <h3 className="font-bold text-gray-800 dark:text-white mb-4 text-sm">فعالیت ماه جاری</h3>
            
            <div className="flex flex-wrap gap-1.5 justify-center sm:justify-start">
                {days.map((date, idx) => {
                    const iso = toIsoString(date);
                    const shamsi = getShamsiDate(iso);
                    const hours = getStudyHours(iso);
                    const mood = moods[iso];
                    const moodRing = mood ? `ring-2 ${moodColors[mood] || 'ring-gray-200'}` : '';
                    const label = getLabel(hours, iso);

                    return (
                        <div
                            key={idx}
                            onMouseEnter={(e) => handleMouseEnter(e, shamsi, hours, label, mood)}
                            onMouseLeave={handleMouseLeave}
                            className={`w-4 h-4 rounded-sm ${getColor(hours)} ${moodRing} transition-all hover:scale-125 hover:z-10 cursor-pointer`}
                        ></div>
                    )
                })}
            </div>

            {/* Custom Tooltip Container inside Relative Parent */}
            {hoveredDay && (
                <div 
                    className="absolute z-50 pointer-events-none transform -translate-x-1/2 -translate-y-full bg-slate-900/95 dark:bg-gray-950/95 backdrop-blur-md text-white text-[10px] font-bold p-2.5 rounded-xl border border-white/10 shadow-2xl flex flex-col gap-1 transition-all duration-150 animate-in fade-in zoom-in-95"
                    style={{ left: `${tooltipPos.x}px`, top: `${tooltipPos.y}px` }}
                    dir="rtl"
                >
                    <div className="flex justify-between items-center border-b border-white/10 pb-1 gap-4">
                        <span className="text-amber-400 font-extrabold">{hoveredDay.shamsi}</span>
                        <span className="text-gray-300 font-medium text-[8px]">{hoveredDay.label}</span>
                    </div>
                    <div className="flex items-center gap-1.5 mt-1">
                        <span className="text-gray-400 font-semibold">مطالعه:</span>
                        <span className="text-indigo-300 font-extrabold">{hoveredDay.hours.toFixed(1)} ساعت</span>
                    </div>
                    {hoveredDay.mood && (
                        <div className="flex items-center gap-1.5">
                            <span className="text-gray-400 font-semibold">احساس:</span>
                            <span className="text-teal-300 font-extrabold">{moodLabels[hoveredDay.mood]}</span>
                        </div>
                    )}
                </div>
            )}

            {/* Legends */}
            <div className="flex flex-col sm:flex-row justify-between items-end sm:items-center mt-4 gap-3">
                <div className="flex items-center gap-2 text-[10px] text-gray-500 dark:text-gray-400 flex-wrap">
                    <span className="ml-1">حس روز:</span>
                    {Object.entries(moodColors).map(([m, color]) => (
                        <div key={m} className="flex items-center gap-1">
                            <div className={`w-2 h-2 rounded-full ring-1 ${color}`}></div>
                            <span>{moodLabels[m]}</span>
                        </div>
                    ))}
                </div>
                <div className="flex items-center gap-2 text-[10px] text-gray-400">
                    <span>0h</span>
                    <div className="flex gap-1">
                        <div className="w-3 h-3 bg-gray-100 dark:bg-gray-800 rounded-sm" title="0 ساعت"></div>
                        <div className="w-3 h-3 bg-indigo-200 dark:bg-indigo-900/40 rounded-sm" title="1-2 ساعت"></div>
                        <div className="w-3 h-3 bg-indigo-300 dark:bg-indigo-800/50 rounded-sm" title="3-4 ساعت"></div>
                        <div className="w-3 h-3 bg-indigo-400 dark:bg-indigo-700/60 rounded-sm" title="5-6 ساعت"></div>
                        <div className="w-3 h-3 bg-indigo-500 dark:bg-indigo-600/70 rounded-sm" title="7-8 ساعت"></div>
                        <div className="w-3 h-3 bg-indigo-700 dark:bg-indigo-400 rounded-sm" title="10+ ساعت"></div>
                    </div>
                    <span>10h+</span>
                </div>
            </div>
        </div>
    );
};

export default ActivityHeatmap;
