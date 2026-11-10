import React, { useState } from 'react';
import { SubjectTask, getSubjectStyle } from '../../types';
import { useStore } from '../../context/StoreContext';
import { toJalaali, toGregorian, toIsoString } from '../../utils';
import { ChevronRight, ChevronLeft, Plus } from 'lucide-react';
import WeeklyView from '../WeeklyView';

interface MonthlyCalendarViewProps {
    tasks: SubjectTask[];
    onEdit: (e: React.MouseEvent, task: SubjectTask) => void;
    onAddOnDate: (isoDate: string) => void;
}

const JALALI_MONTHS = [
    'فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور',
    'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند',
];
const WEEKDAYS = ['شنبه', 'یکشنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنج‌شنبه', 'جمعه'];

export const MonthlyCalendarView: React.FC<MonthlyCalendarViewProps> = ({ tasks, onEdit, onAddOnDate }) => {
    const { moveTaskToDate } = useStore();
    const nowJ = toJalaali(new Date().getFullYear(), new Date().getMonth() + 1, new Date().getDate());
    const [jy, setJy] = useState(nowJ.jy);
    const [jm, setJm] = useState(nowJ.jm);
    const [dragTaskId, setDragTaskId] = useState<string | null>(null);

    const daysInMonth = jm <= 6 ? 31 : jm <= 11 ? 30 : jy % 4 === 3 ? 30 : 29;
    const firstGDate = toGregorian(jy, jm, 1);
    const startOffset = (firstGDate.getDay() + 1) % 7; // Saturday = 0
    const totalCells = Math.ceil((startOffset + daysInMonth) / 7) * 7;
    const todayIso = toIsoString(new Date());

    const prevMonth = () => {
        if (jm === 1) {
            setJy(jy - 1);
            setJm(12);
        } else {
            setJm(jm - 1);
        }
    };

    const nextMonth = () => {
        if (jm === 12) {
            setJy(jy + 1);
            setJm(1);
        } else {
            setJm(jm + 1);
        }
    };

    return (
        <div className="space-y-6">
            {/* Wire the previously orphaned WeeklyView cleanly at top */}
            <WeeklyView />

            <div className="bg-white dark:bg-gray-800 rounded-3xl p-5 border border-gray-100 dark:border-gray-700 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="font-black text-base text-gray-800 dark:text-white">
                        تقویم ماهانه شمسی — {JALALI_MONTHS[jm - 1]} {jy}
                    </h2>
                    <div className="flex items-center gap-1.5">
                        <button onClick={prevMonth} className="p-2 rounded-xl bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 transition">
                            <ChevronRight size={16} />
                        </button>
                        <button
                            onClick={() => {
                                setJy(nowJ.jy);
                                setJm(nowJ.jm);
                            }}
                            className="px-3 py-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-300 text-xs font-bold"
                        >
                            امروز
                        </button>
                        <button onClick={nextMonth} className="p-2 rounded-xl bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 transition">
                            <ChevronLeft size={16} />
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-7 gap-1.5 mb-2 text-center text-[11px] font-bold text-gray-400">
                    {WEEKDAYS.map((d) => (
                        <div key={d} className="py-1">{d}</div>
                    ))}
                </div>

                <div className="grid grid-cols-7 gap-1.5">
                    {Array.from({ length: totalCells }, (_, idx) => {
                        const dayNum = idx - startOffset + 1;
                        if (dayNum < 1 || dayNum > daysInMonth) {
                            return <div key={idx} className="min-h-[84px] rounded-2xl bg-gray-50/40 dark:bg-gray-900/20" />;
                        }

                        const gDate = toGregorian(jy, jm, dayNum);
                        const iso = toIsoString(gDate);
                        const dayTasks = tasks.filter((t) => t.date === iso);
                        const isToday = iso === todayIso;

                        return (
                            <div
                                key={iso}
                                onDragOver={(e) => e.preventDefault()}
                                onDrop={() => {
                                    if (dragTaskId) {
                                        moveTaskToDate(dragTaskId, iso);
                                        setDragTaskId(null);
                                    }
                                }}
                                className={`group min-h-[90px] rounded-2xl p-1.5 border flex flex-col gap-1 transition ${
                                    isToday
                                        ? 'border-indigo-400 bg-indigo-50/50 dark:bg-indigo-950/25'
                                        : 'border-gray-100 dark:border-gray-700/60 bg-gray-50/50 dark:bg-gray-900/30 hover:border-indigo-200'
                                }`}
                            >
                                <div className="flex items-center justify-between px-1">
                                    <span className={`text-[11px] font-black ${isToday ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-600 dark:text-gray-300'}`}>
                                        {dayNum}
                                    </span>
                                    <button
                                        onClick={() => onAddOnDate(iso)}
                                        className="opacity-0 group-hover:opacity-100 p-0.5 rounded bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-300 transition"
                                        title="افزودن تسک در این روز"
                                    >
                                        <Plus size={10} />
                                    </button>
                                </div>
                                <div className="space-y-1 overflow-y-auto max-h-16 no-scrollbar">
                                    {dayTasks.map((t) => {
                                        const st = getSubjectStyle(t.subject);
                                        return (
                                            <div
                                                key={t.id}
                                                draggable
                                                onDragStart={() => setDragTaskId(t.id)}
                                                onClick={(e) => onEdit(e, t)}
                                                className={`text-[9px] px-1.5 py-0.5 rounded-md truncate cursor-pointer font-bold ${
                                                    t.isCompleted
                                                        ? 'bg-emerald-100/70 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 line-through'
                                                        : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 border border-gray-200/50 dark:border-gray-700'
                                                }`}
                                                title={`${t.subject}: ${t.topic}`}
                                            >
                                                {st.icon} {t.topic}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};
