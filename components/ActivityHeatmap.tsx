
import React from 'react';
import { useStore } from '../context/StoreContext';
import { addDays, toIsoString } from '../utils';

const ActivityHeatmap = () => {
    const { tasks, getTasksByDate } = useStore();

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
                     const dailyTasks = getTasksByDate(iso);
                     const completed = dailyTasks.filter(t => t.isCompleted).length;
                     
                     return (
                         <div 
                            key={idx}
                            title={`${iso}: ${completed} تسک`}
                            className={`w-4 h-4 rounded-sm ${getColor(completed)} transition-all hover:scale-125 hover:ring-2 ring-offset-1 ring-indigo-300 cursor-default`}
                         ></div>
                     )
                 })}
             </div>
             <div className="flex items-center gap-2 mt-3 text-[10px] text-gray-400 justify-end">
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
    );
};

export default ActivityHeatmap;
