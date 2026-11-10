import React, { useMemo, useState } from 'react';
import { useStore } from '../context/StoreContext';
import { generateHeatmapSeries } from '../utils/streakEngine';
import { formatToPersianDigits, getFullShamsiDate } from '../utils';
import { Flame, Trophy, Calendar } from 'lucide-react';

const LEVEL_CLASSES: Record<0 | 1 | 2 | 3 | 4, string> = {
    0: 'bg-gray-100 dark:bg-gray-800/80 border-gray-200/40 dark:border-gray-700/40',
    1: 'bg-emerald-200 dark:bg-emerald-900/50 border-emerald-300/30',
    2: 'bg-emerald-400 dark:bg-emerald-700/70 border-emerald-500/30',
    3: 'bg-emerald-500 dark:bg-emerald-500 border-emerald-600/30',
    4: 'bg-emerald-700 dark:bg-emerald-400 border-emerald-800/30',
};

export const AnnualStudyHeatmap: React.FC = () => {
    const { studyMinutesByDate, streakStats, settings } = useStore();
    const cutoffHour = settings.dayCutoffHour ?? 5;
    const [hoveredInfo, setHoveredInfo] = useState<{ date: string; minutes: number } | null>(null);

    const series = useMemo(
        () => generateHeatmapSeries(studyMinutesByDate, 364, new Date(), cutoffHour),
        [studyMinutesByDate, cutoffHour]
    );

    const weeks = useMemo(() => {
        const cols: typeof series[] = [];
        for (let i = 0; i < series.length; i += 7) {
            cols.push(series.slice(i, i + 7));
        }
        return cols;
    }, [series]);

    const totalActiveDays = useMemo(() => series.filter((d) => d.totalMinutes > 0).length, [series]);
    const totalHours = useMemo(
        () => Math.round((series.reduce((sum, d) => sum + d.totalMinutes, 0) / 60) * 10) / 10,
        [series]
    );

    return (
        <div className="mt-6 pt-5 border-t border-gray-100 dark:border-gray-700/70 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                    <h3 className="text-sm font-black text-gray-800 dark:text-white flex items-center gap-2">
                        <Calendar size={16} className="text-emerald-500" />
                        نقشه پیوستگی ۵۲ هفته اخیر (بر اساس ساعت مبنای {String(cutoffHour).padStart(2, '0')}:۰۰ بامداد)
                    </h3>
                    <p className="text-[11px] text-gray-400 mt-0.5">
                        {formatToPersianDigits(totalActiveDays)} روز فعال • مجموع {formatToPersianDigits(totalHours)} ساعت مطالعه ثبت‌شده
                    </p>
                </div>

                <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200/70 dark:border-amber-800/40 text-xs font-black text-amber-700 dark:text-amber-300">
                        <Flame size={15} className="text-amber-500" />
                        استریک فعلی: {formatToPersianDigits(streakStats.currentStreak)} روز
                    </div>
                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-200/70 dark:border-indigo-800/40 text-xs font-black text-indigo-700 dark:text-indigo-300">
                        <Trophy size={14} className="text-indigo-500" />
                        رکورد: {formatToPersianDigits(streakStats.longestStreak)} روز
                    </div>
                </div>
            </div>

            {/* 52 columns x 7 rows */}
            <div className="overflow-x-auto pb-2 custom-scrollbar">
                <div className="inline-flex gap-1 min-w-max" dir="ltr">
                    {weeks.map((week, wIdx) => (
                        <div key={wIdx} className="flex flex-col gap-1">
                            {week.map((day) => (
                                <button
                                    key={day.date}
                                    type="button"
                                    onMouseEnter={() => setHoveredInfo({ date: day.date, minutes: day.totalMinutes })}
                                    onMouseLeave={() => setHoveredInfo(null)}
                                    title={`${getFullShamsiDate(day.date)}: ${day.totalMinutes} دقیقه مطالعه`}
                                    className={`w-3 h-3 rounded-[3px] border transition-transform hover:scale-125 ${LEVEL_CLASSES[day.intensityLevel]}`}
                                />
                            ))}
                        </div>
                    ))}
                </div>
            </div>

            {/* Footer / hover detail */}
            <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-gray-500 dark:text-gray-400">
                <span>
                    {hoveredInfo
                        ? `${getFullShamsiDate(hoveredInfo.date)} — ${formatToPersianDigits(hoveredInfo.minutes)} دقیقه مطالعه`
                        : 'روی هر مربع بروید تا جزئیات آن روز را ببینید.'}
                </span>

                <div className="flex items-center gap-1.5">
                    <span>کم</span>
                    {([0, 1, 2, 3, 4] as const).map((lvl) => (
                        <span key={lvl} className={`w-3 h-3 rounded-[3px] border ${LEVEL_CLASSES[lvl]}`} />
                    ))}
                    <span>زیاد</span>
                </div>
            </div>
        </div>
    );
};
