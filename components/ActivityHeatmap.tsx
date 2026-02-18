
import React from 'react';
import { useStore } from '../context/StoreContext';
import { addDays, toIsoString, getShamsiDate, toJalaali, toGregorian } from '../utils';

const ActivityHeatmap = () => {
    const { tasks, getTasksByDate, moods, routineTemplate, isRoutineSlotCompleted, currentDay } = useStore();

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

    // Determine days in current Shamsi month
    const daysInMonth = jm <= 6 ? 31 : (jm <= 11 ? 30 : (jy % 4 === 3 ? 30 : 29));

    const days = [];
    for (let d = 1; d <= daysInMonth; d++) {
        const gDate = toGregorian(jy, jm, d);
        days.push(gDate);
    }

    // === محاسبه ساعات مطالعه تخمینی ===
    // هر تسک تکمیل‌شده ≈ 1 ساعت (با وزن‌دهی بر اساس نوع تسک)
    const getStudyHours = (iso: string): number => {
        const dailyTasks = getTasksByDate(iso);
        let hours = 0;
        dailyTasks.forEach(t => {
            if (t.isCompleted) {
                // تسک‌های آزمون/تحلیل = 1.5 ساعت، بقیه = 1 ساعت
                if (t.studyType === 'exam' || t.studyType === 'analysis') hours += 1.5;
                else hours += 1;
            }
        });
        return hours;
    };

    // === رنگ‌بندی بر اساس ساعات مطالعه ===
    // 10 ساعت = عالی (حداکثر رنگ)
    const getColor = (hours: number) => {
        if (hours === 0) return 'bg-gray-100 dark:bg-gray-800';
        if (hours <= 2) return 'bg-indigo-200 dark:bg-indigo-900/40';    // کم
        if (hours <= 4) return 'bg-indigo-300 dark:bg-indigo-800/50';    // متوسط
        if (hours <= 6) return 'bg-indigo-400 dark:bg-indigo-700/60';    // خوب
        if (hours <= 8) return 'bg-indigo-500 dark:bg-indigo-600/70';    // خیلی خوب
        return 'bg-indigo-700 dark:bg-indigo-400';                        // عالی (10+ ساعت)
    };

    // === توضیح ساعات برای tooltip ===
    const getLabel = (hours: number): string => {
        if (hours === 0) return 'بدون فعالیت';
        if (hours <= 2) return 'کم';
        if (hours <= 4) return 'متوسط';
        if (hours <= 6) return 'خوب';
        if (hours <= 8) return 'خیلی خوب';
        return 'عالی 🔥';
    };

    return (
        <div className="bg-white dark:bg-gray-800 p-5 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700">
            <h3 className="font-bold text-gray-800 dark:text-white mb-4 text-sm">فعالیت ماه جاری</h3>
            <div className="flex flex-wrap gap-1.5 justify-center sm:justify-start">
                {days.map((date, idx) => {
                    const iso = toIsoString(date);
                    const shamsi = getShamsiDate(iso);
                    const hours = getStudyHours(iso);

                    const mood = moods[iso];
                    const moodRing = mood ? `ring-2 ${moodColors[mood] || 'ring-gray-200'}` : '';

                    return (
                        <div
                            key={idx}
                            title={`${shamsi}: ${hours.toFixed(1)} ساعت (${getLabel(hours)})${mood ? ` | حس: ${moodLabels[mood]}` : ''}`}
                            className={`w-4 h-4 rounded-sm ${getColor(hours)} ${moodRing} transition-all hover:scale-125 hover:z-10 cursor-default`}
                        ></div>
                    )
                })}
            </div>

            {/* Legends */}
            <div className="flex flex-col sm:flex-row justify-between items-end sm:items-center mt-4 gap-3">

                {/* Mood Legend */}
                <div className="flex items-center gap-2 text-[10px] text-gray-500 dark:text-gray-400 flex-wrap">
                    <span className="ml-1">حس روز:</span>
                    {Object.entries(moodColors).map(([m, color]) => (
                        <div key={m} className="flex items-center gap-1">
                            <div className={`w-2 h-2 rounded-full ring-1 ${color}`}></div>
                            <span>{moodLabels[m]}</span>
                        </div>
                    ))}
                </div>

                {/* Activity Legend — بر اساس ساعت */}
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
