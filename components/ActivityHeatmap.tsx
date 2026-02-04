
import React from 'react';
import { useStore } from '../context/StoreContext';
import { addDays, toIsoString, getShamsiDate } from '../utils';

const ActivityHeatmap = () => {
    const { tasks, getTasksByDate, moods } = useStore();

    // Mood Colors mapping
    const moodColors: Record<string, string> = {
        'happy': 'ring-emerald-400 dark:ring-emerald-400',
        'energetic': 'ring-amber-400 dark:ring-amber-400',
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

    // Generate last 30 days + today
    const days = [];
    const today = new Date();
    for (let i = 29; i >= 0; i--) {
        days.push(addDays(today, -i));
    }

    const getColor = (count: number) => {
        if (count === 0) return 'bg-gray-100 dark:bg-gray-800';
        if (count <= 2) return 'bg-indigo-200 dark:bg-indigo-900/40';
        if (count <= 4) return 'bg-indigo-400 dark:bg-indigo-700/60';
        if (count <= 6) return 'bg-indigo-600 dark:bg-indigo-600';
        return 'bg-indigo-800 dark:bg-indigo-400';
    };

    return (
        <div className="bg-white dark:bg-gray-800 p-5 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700">
            <h3 className="font-bold text-gray-800 dark:text-white mb-4 text-sm">فعالیت ۳۰ روز گذشته</h3>
            <div className="flex flex-wrap gap-1.5 justify-center sm:justify-start">
                {days.map((date, idx) => {
                    const iso = toIsoString(date);
                    const shamsi = getShamsiDate(iso);
                    const dailyTasks = getTasksByDate(iso);
                    const completed = dailyTasks.filter(t => t.isCompleted).length;

                    const mood = moods[iso]; // Get mood for this day
                    const moodRing = mood ? `ring-2 ${moodColors[mood] || 'ring-gray-200'}` : '';

                    return (
                        <div
                            key={idx}
                            title={`${shamsi}: ${completed} تسک${mood ? ` | حس: ${mood}` : ''}`}
                            className={`w-4 h-4 rounded-sm ${getColor(completed)} ${moodRing} transition-all hover:scale-125 hover:z-10 cursor-default`}
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

                {/* Activity Legend */}
                <div className="flex items-center gap-2 text-[10px] text-gray-400">
                    <span>کم</span>
                    <div className="flex gap-1">
                        <div className="w-3 h-3 bg-gray-100 dark:bg-gray-800 rounded-sm"></div>
                        <div className="w-3 h-3 bg-indigo-200 dark:bg-indigo-900/40 rounded-sm"></div>
                        <div className="w-3 h-3 bg-indigo-400 dark:bg-indigo-700/60 rounded-sm"></div>
                        <div className="w-3 h-3 bg-indigo-600 dark:bg-indigo-600 rounded-sm"></div>
                        <div className="w-3 h-3 bg-indigo-800 dark:bg-indigo-400 rounded-sm"></div>
                    </div>
                    <span>زیاد</span>
                </div>
            </div>
        </div>
    );
};

export default ActivityHeatmap;
