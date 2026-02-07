import React, { useRef } from 'react';
import { useStore } from '../context/StoreContext';
import { getShamsiDate, toIsoString } from '../utils';
import { SubjectTask, Subject } from '../types';
import { ChevronRight, ChevronLeft, Calendar } from 'lucide-react';

const WeeklyView = () => {
    const { currentDay, totalDays, getTasksByDate, startDate, goToToday } = useStore();
    const scrollRef = useRef<HTMLDivElement>(null);

    // Calculate Week Range (e.g., current week involves currentDay)
    // Actually user wants a general "Weekly View". Let's show current week (7 days) starting from today or start of week?
    // Let's show 7 days starting from currentDay (or clamped).

    // Or better: Show ALL weeks in a horizontal scroll or grid.
    // User asked for "Professional Weekly Overview".
    // Let's render 7 columns for the "Current Week" of the plan.

    const currentWeekStart = Math.floor((currentDay - 1) / 7) * 7 + 1;
    const currentWeekEnd = Math.min(currentWeekStart + 6, totalDays);
    const weekDays = Array.from({ length: currentWeekEnd - currentWeekStart + 1 }, (_, i) => currentWeekStart + i);

    return (
        <div className="bg-white dark:bg-gray-800 rounded-[2.5rem] p-5 shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
            <div className="flex justify-between items-center mb-4">
                <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400">
                    <Calendar size={20} />
                    <h2 className="font-bold">نمای هفته (روز {currentWeekStart} تا {currentWeekEnd})</h2>
                </div>
            </div>

            <div className="flex gap-3 overflow-x-auto pb-4 px-1 custom-scrollbar snap-x snap-mandatory" ref={scrollRef}>
                {weekDays.map(dayId => {
                    const dateIso = toIsoString(new Date(new Date(startDate).getTime() + (dayId - 1) * 86400000));
                    const tasks = getTasksByDate(dateIso);
                    const isToday = dayId === currentDay;
                    const dateShamsi = getShamsiDate(dateIso);

                    return (
                        <div key={dayId} className={`min-w-[280px] sm:min-w-[200px] md:min-w-[250px] lg:min-w-0 lg:flex-1 p-3 rounded-2xl border ${isToday ? 'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-200 dark:border-indigo-800 ring-1 ring-indigo-200 dark:ring-indigo-800' : 'bg-gray-50 dark:bg-gray-900/50 border-gray-100 dark:border-gray-700'} flex flex-col gap-2 snap-center transition-all duration-300`}>
                            <div className="flex justify-between items-center border-b border-gray-200 dark:border-gray-700 pb-2">
                                <div className="flex items-center gap-2">
                                    <span className={`text-sm font-black ${isToday ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-700 dark:text-gray-200'}`}>
                                        روز {dayId}
                                    </span>
                                    {isToday && <span className="flex w-2 h-2 bg-indigo-500 rounded-full animate-pulse"></span>}
                                </div>
                                <span className="text-[10px] text-gray-400">{dateShamsi.split(' ')[0]} {dateShamsi.split(' ')[1]}</span>
                            </div>

                            <div className="flex-1 space-y-1.5 min-h-[140px] max-h-[200px] overflow-y-auto custom-scrollbar pr-1">
                                {tasks.length > 0 ? tasks.map(t => (
                                    <div key={t.id} className="bg-white dark:bg-gray-800 p-2 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm text-[10px] flex items-start gap-2 group hover:border-indigo-200 dark:hover:border-indigo-800 transition-colors">
                                        <div className={`w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0 ${t.isCompleted ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                                        <div className="min-w-0">
                                            <span className="font-bold block truncate text-gray-800 dark:text-gray-200 mb-0.5">{t.subject}</span>
                                            <p className="text-gray-500 dark:text-gray-400 truncate leading-relaxed">{t.topic}</p>
                                        </div>
                                    </div>
                                )) : (
                                    <div className="h-full flex flex-col items-center justify-center text-gray-300 gap-2">
                                        <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                                            <Calendar size={14} />
                                        </div>
                                        <span className="text-[10px] italic">بدون برنامه</span>
                                    </div>
                                )}
                            </div>
                            <div className="pt-2 text-center flex justify-between items-center text-[10px] text-gray-400 font-bold border-t border-gray-200 dark:border-gray-700">
                                <span>پیشرفت:</span>
                                <span className={tasks.filter(t => t.isCompleted).length === tasks.length && tasks.length > 0 ? 'text-green-600 dark:text-green-400' : ''}>
                                    {tasks.filter(t => t.isCompleted).length} / {tasks.length}
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
