import React, { useEffect, useRef, useState } from 'react';
import { useStore } from '../context/StoreContext';
import { addDays, getShamsiDate, parseDate, toIsoString } from '../utils';
import { ChevronRight, ChevronLeft, Calendar } from 'lucide-react';

const PERSIAN_WEEKDAYS = ['شنبه', 'یکشنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنج‌شنبه', 'جمعه'] as const;

const WeeklyView = () => {
    const { currentDay, getTasksByDate, getDayDate } = useStore();
    const scrollRef = useRef<HTMLDivElement>(null);
    const [weekOffset, setWeekOffset] = useState(0);

    const todayIso = toIsoString(new Date());
    const activeIso = getDayDate(currentDay) || todayIso;

    useEffect(() => {
        setWeekOffset(0);
    }, [currentDay]);

    // Calculate exact Saturday → Friday Persian calendar week
    const anchorDate = addDays(parseDate(activeIso), weekOffset * 7);
    const daysSinceSaturday = (anchorDate.getDay() + 1) % 7;
    const weekSaturday = addDays(anchorDate, -daysSinceSaturday);

    const weekDays = Array.from({ length: 7 }, (_, i) => {
        const dObj = addDays(weekSaturday, i);
        const dateIso = toIsoString(dObj);
        return {
            index: i,
            weekdayName: PERSIAN_WEEKDAYS[i],
            dateIso,
            dateShamsi: getShamsiDate(dateIso),
            isToday: dateIso === todayIso,
            isSelected: dateIso === activeIso,
        };
    });

    // Center active/today card smoothly inside horizontal scroller
    useEffect(() => {
        if (!scrollRef.current) return;
        const targetId = `day-element-${activeIso}`;
        const el = document.getElementById(targetId);
        if (el) {
            const container = scrollRef.current;
            const scrollLeft = el.offsetLeft - container.offsetWidth / 2 + el.offsetWidth / 2;
            if (typeof container.scrollTo === 'function') {
                container.scrollTo({ left: scrollLeft, behavior: 'smooth' });
            }
        }
    }, [activeIso, weekOffset]);

    return (
        <div className="bg-white dark:bg-gray-800 rounded-[2.5rem] p-5 shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
            <div className="flex flex-wrap justify-between items-center gap-3 mb-4">
                <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400">
                    <Calendar size={20} />
                    <div>
                        <h2 className="font-bold text-sm md:text-base">
                            نمای هفته ({weekDays[0].dateShamsi} تا {weekDays[6].dateShamsi})
                        </h2>
                    </div>
                </div>

                <div className="flex items-center gap-1.5">
                    {weekOffset !== 0 && (
                        <button
                            type="button"
                            onClick={() => setWeekOffset(0)}
                            className="px-3 py-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-300 text-xs font-black transition"
                        >
                            هفته جاری
                        </button>
                    )}
                    <button
                        type="button"
                        onClick={() => setWeekOffset((w) => w - 1)}
                        aria-label="هفته قبل"
                        className="p-2 rounded-xl bg-gray-100 dark:bg-gray-700 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 text-gray-600 dark:text-gray-200 transition"
                    >
                        <ChevronRight size={16} />
                    </button>
                    <button
                        type="button"
                        onClick={() => setWeekOffset((w) => w + 1)}
                        aria-label="هفته بعد"
                        className="p-2 rounded-xl bg-gray-100 dark:bg-gray-700 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 text-gray-600 dark:text-gray-200 transition"
                    >
                        <ChevronLeft size={16} />
                    </button>
                </div>
            </div>

            <div className="flex gap-3 overflow-x-auto pb-4 px-1 custom-scrollbar snap-x snap-mandatory" ref={scrollRef}>
                {weekDays.map((day) => {
                    const tasks = getTasksByDate(day.dateIso);
                    const doneCount = tasks.filter((t) => t.isCompleted).length;

                    return (
                        <div
                            key={day.dateIso}
                            id={`day-element-${day.dateIso}`}
                            className={`min-w-[240px] sm:min-w-[200px] md:min-w-[220px] lg:min-w-0 lg:flex-1 p-3 rounded-2xl border ${
                                day.isToday
                                    ? 'bg-indigo-50 dark:bg-indigo-500/10 border-indigo-200 dark:border-indigo-500/30 ring-1 ring-indigo-200 dark:ring-indigo-500/30'
                                    : day.isSelected
                                      ? 'bg-slate-50 dark:bg-gray-800/80 border-indigo-200/70 dark:border-indigo-700/50'
                                      : 'bg-gray-50 dark:bg-gray-800 border-gray-100 dark:border-gray-700'
                            } flex flex-col gap-2 snap-center transition-all duration-300`}
                        >
                            <div className="flex justify-between items-center border-b border-gray-200 dark:border-gray-700 pb-2">
                                <div className="flex items-center gap-1.5">
                                    <span
                                        className={`text-xs font-black ${
                                            day.isToday ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-700 dark:text-gray-200'
                                        }`}
                                    >
                                        {day.weekdayName}
                                    </span>
                                    {day.isToday && (
                                        <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-indigo-600 text-white font-black">
                                            امروز
                                        </span>
                                    )}
                                </div>
                                <span className="text-[10px] font-bold text-gray-400">{day.dateShamsi}</span>
                            </div>

                            <div className="flex-1 space-y-1.5 min-h-[140px] max-h-[200px] overflow-y-auto custom-scrollbar pr-1">
                                {tasks.length > 0 ? (
                                    tasks.map((t) => (
                                        <div
                                            key={t.id}
                                            className="bg-white dark:bg-gray-700/50 p-2 rounded-xl border border-gray-100 dark:border-gray-600/50 shadow-sm text-[10px] flex items-start gap-2 group hover:border-indigo-200 dark:hover:border-indigo-500/50 transition-colors"
                                        >
                                            <div
                                                className={`w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0 ${
                                                    t.isCompleted ? 'bg-green-500' : 'bg-gray-300'
                                                }`}
                                            />
                                            <div className="min-w-0">
                                                <span className="font-bold block truncate text-gray-800 dark:text-gray-200 mb-0.5">
                                                    {t.subject}
                                                </span>
                                                <p className="text-gray-500 dark:text-gray-400 truncate leading-relaxed">{t.topic}</p>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="h-full flex flex-col items-center justify-center text-gray-300 gap-2 py-8">
                                        <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                                            <Calendar size={14} />
                                        </div>
                                        <span className="text-[10px] italic">بدون برنامه</span>
                                    </div>
                                )}
                            </div>

                            <div className="pt-2 text-center flex justify-between items-center text-[10px] text-gray-400 font-bold border-t border-gray-200 dark:border-gray-700">
                                <span>پیشرفت:</span>
                                <span
                                    className={
                                        doneCount === tasks.length && tasks.length > 0
                                            ? 'text-green-600 dark:text-green-400'
                                            : ''
                                    }
                                >
                                    {doneCount} / {tasks.length}
                                </span>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default WeeklyView;
