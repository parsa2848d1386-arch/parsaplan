import React, { useState } from 'react';
import { useStore } from '../context/StoreContext';
import { toIsoString, getShamsiDate, toJalaali, toGregorian, formatToPersianDigits } from '../utils';
import { AnnualStudyHeatmap } from './AnnualStudyHeatmap';

const ActivityHeatmap = () => {
    const { getTasksByDate, moods, studyHoursLog, studyMinutesByDate } = useStore();

    const [hoveredDay, setHoveredDay] = useState<{
        shamsi: string;
        hours: number;
        label: string;
        mood?: string;
    } | null>(null);
    const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });

    const moodColors: Record<string, string> = {
        'excellent': 'ring-emerald-400 dark:ring-emerald-400',
        'high-energy': 'ring-violet-400 dark:ring-violet-400',
        'normal': 'ring-gray-300 dark:ring-gray-500',
        'tired': 'ring-orange-400 dark:ring-orange-400',
        'exhausted': 'ring-rose-400 dark:ring-rose-400',
        // Legacy mood keys
        'happy': 'ring-emerald-400 dark:ring-emerald-400',
        'energetic': 'ring-violet-400 dark:ring-violet-400',
        'neutral': 'ring-gray-300 dark:ring-gray-500',
        'sad': 'ring-rose-400 dark:ring-rose-400',
    };

    const moodLabels: Record<string, string> = {
        'excellent': 'عالی',
        'high-energy': 'پرانرژی',
        'normal': 'معمولی',
        'tired': 'خسته',
        'exhausted': 'فرسوده',
        'happy': 'خوشحال',
        'energetic': 'پرانرژی',
        'neutral': 'معمولی',
        'sad': 'ناراحت',
    };

    const legendMoods: Array<[string, string]> = [
        ['excellent', 'عالی'],
        ['high-energy', 'پرانرژی'],
        ['normal', 'معمولی'],
        ['tired', 'خسته'],
        ['exhausted', 'فرسوده'],
    ];

    const today = new Date();
    const { jy, jm } = toJalaali(today.getFullYear(), today.getMonth() + 1, today.getDate());
    const daysInMonth = jm <= 6 ? 31 : (jm <= 11 ? 30 : (jy % 4 === 3 ? 30 : 29));

    const days = [];
    for (let d = 1; d <= daysInMonth; d++) {
        const gDate = toGregorian(jy, jm, d);
        days.push(gDate);
    }

    const getStudyHours = (iso: string): { hours: number; isLogged: boolean } => {
        const mins = studyMinutesByDate?.[iso];
        if (typeof mins === 'number' && mins > 0) {
            return { hours: Math.round((mins / 60) * 10) / 10, isLogged: true };
        }
        const loggedHours = studyHoursLog?.[iso];
        if (loggedHours !== undefined && loggedHours > 0) {
            return { hours: loggedHours, isLogged: true };
        }

        const dailyTasks = getTasksByDate ? getTasksByDate(iso) : [];
        let fallbackHours = 0;
        dailyTasks.forEach((t) => {
            if (t.isCompleted) {
                if (t.actualDuration && t.actualDuration > 0) {
                    fallbackHours += t.actualDuration / 60;
                } else if (t.durationMinutes && t.durationMinutes > 0) {
                    fallbackHours += t.durationMinutes / 60;
                } else if (t.studyType === 'exam' || t.studyType === 'analysis') {
                    fallbackHours += 1.5;
                } else {
                    fallbackHours += 1;
                }
            }
        });
        return { hours: Math.round(fallbackHours * 10) / 10, isLogged: fallbackHours > 0 };
    };

    const getColor = (hours: number) => {
        if (hours === 0) return 'bg-gray-100 dark:bg-gray-800';
        if (hours <= 2) return 'bg-indigo-200 dark:bg-indigo-900/40';
        if (hours <= 4) return 'bg-indigo-300 dark:bg-indigo-800/50';
        if (hours <= 6) return 'bg-indigo-400 dark:bg-indigo-700/60';
        if (hours <= 8) return 'bg-indigo-500 dark:bg-indigo-600/70';
        return 'bg-indigo-700 dark:bg-indigo-400';
    };

    const getLabel = (hours: number, isLogged: boolean): string => {
        const prefix = isLogged ? 'ثبت‌شده' : 'تخمینی';
        if (hours === 0) return 'بدون فعالیت';
        if (hours <= 2) return `${prefix}: کم`;
        if (hours <= 4) return `${prefix}: متوسط`;
        if (hours <= 6) return `${prefix}: خوب`;
        if (hours <= 8) return `${prefix}: خیلی خوب`;
        return `${prefix}: عالی`;
    };

    const handleMouseEnter = (e: React.MouseEvent, shamsi: string, hours: number, label: string, mood?: string) => {
        const rect = e.currentTarget.getBoundingClientRect();
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
        <div className="relative w-full">
            <h3 className="font-headline-md font-bold text-slate-800 dark:text-white mb-4 text-sm sm:text-base">فعالیت ماه جاری</h3>
            
            <div className="flex flex-wrap gap-1.5 justify-center sm:justify-start">
                {days.map((date, idx) => {
                    const iso = toIsoString(date);
                    const shamsi = getShamsiDate(iso);
                    const { hours, isLogged } = getStudyHours(iso);
                    const mood = moods?.[iso];
                    const moodRing = mood ? `ring-2 ${moodColors[mood] || 'ring-gray-200 dark:ring-gray-600'}` : '';
                    const label = getLabel(hours, isLogged);

                    return (
                        <button
                            key={idx}
                            type="button"
                            onMouseEnter={(e) => handleMouseEnter(e, shamsi, hours, label, mood)}
                            onMouseLeave={handleMouseLeave}
                            aria-label={`${shamsi}: ${hours.toFixed(1)} ساعت`}
                            className={`w-4 h-4 rounded-sm ${getColor(hours)} ${moodRing} transition-all hover:scale-125 hover:z-10 cursor-pointer`}
                        />
                    );
                })}
            </div>

            {hoveredDay && (
                <div 
                    className="absolute z-50 pointer-events-none transform -translate-x-1/2 -translate-y-full bg-slate-900/95 dark:bg-gray-950/95 backdrop-blur-md text-white text-[11px] font-bold p-2.5 rounded-xl border border-white/10 shadow-2xl flex flex-col gap-1 transition-all duration-150"
                    style={{ left: `${tooltipPos.x}px`, top: `${tooltipPos.y}px` }}
                    dir="rtl"
                >
                    <div className="flex justify-between items-center border-b border-white/10 pb-1 gap-4">
                        <span className="text-amber-400 font-extrabold">{hoveredDay.shamsi}</span>
                        <span className="text-gray-300 font-medium text-[11px]">{hoveredDay.label}</span>
                    </div>
                    <div className="flex items-center gap-1.5 mt-1">
                        <span className="text-[var(--text-tertiary)] font-semibold">مطالعه:</span>
                        <span className="text-indigo-300 font-extrabold">{hoveredDay.hours.toFixed(1)} ساعت</span>
                    </div>
                    {hoveredDay.mood && (
                        <div className="flex items-center gap-1.5">
                            <span className="text-[var(--text-tertiary)] font-semibold">احساس:</span>
                            <span className="text-teal-300 font-extrabold">{moodLabels[hoveredDay.mood] || hoveredDay.mood}</span>
                        </div>
                    )}
                </div>
            )}

            <div className="flex flex-col sm:flex-row justify-between items-end sm:items-center mt-4 gap-3">
                <div className="flex items-center gap-2 text-[11px] text-[var(--text-secondary)] flex-wrap">
                    <span className="ms-1">حس روز:</span>
                    {legendMoods.map(([m, label]) => (
                        <div key={m} className="flex items-center gap-1">
                            <div className={`w-2 h-2 rounded-full ring-1 ${moodColors[m]}`}></div>
                            <span>{label}</span>
                        </div>
                    ))}
                </div>
                <div className="flex items-center gap-2 text-[11px] text-[var(--text-tertiary)] tabular-nums">
                    <span>۰ ساعت</span>
                    <div className="flex gap-1">
                        <div className="w-3 h-3 bg-surface-container-high rounded-sm" title="۰ ساعت"></div>
                        <div className="w-3 h-3 bg-indigo-200 dark:bg-indigo-900/40 rounded-sm" title="۱ تا ۲ ساعت"></div>
                        <div className="w-3 h-3 bg-indigo-300 dark:bg-indigo-800/50 rounded-sm" title="۳ تا ۴ ساعت"></div>
                        <div className="w-3 h-3 bg-indigo-400 dark:bg-indigo-700/60 rounded-sm" title="۵ تا ۶ ساعت"></div>
                        <div className="w-3 h-3 bg-indigo-500 dark:bg-indigo-600/70 rounded-sm" title="۷ تا ۸ ساعت"></div>
                        <div className="w-3 h-3 bg-indigo-700 dark:bg-indigo-400 rounded-sm" title="۱۰+ ساعت"></div>
                    </div>
                    <span>{formatToPersianDigits(10)}+ ساعت</span>
                </div>
            </div>

            <div className="deferred-section mt-4">
                <AnnualStudyHeatmap />
            </div>
        </div>
    );
};

export default ActivityHeatmap;
