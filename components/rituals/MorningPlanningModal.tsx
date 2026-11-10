import React, { useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useStore } from '../../context/StoreContext';
import { useFocus } from '../../context/FocusContext';
import { useUI } from '../../context/UIContext';
import { getLogicalDateKey } from '../../utils/streakEngine';
import { getFullShamsiDate, formatToPersianDigits } from '../../utils';
import { getSubjectStyle } from '../../types';
import { Sunrise, X, Star, Play, AlertTriangle, CheckCircle2 } from 'lucide-react';

export const MorningPlanningModal: React.FC = () => {
    const { tasks, settings, toggleTaskMIT, moveTaskToDate } = useStore();
    const { startFocusForTask } = useFocus();
    const { isMorningModalOpen, setMorningModalOpen, showToast } = useUI();

    const cutoffHour = settings.dayCutoffHour ?? 5;
    const todayLogical = useMemo(() => getLogicalDateKey(new Date(), cutoffHour), [cutoffHour]);
    const dailyCapacity = settings.dailyCapacityMinutes ?? 360;

    const todayTasks = useMemo(
        () => tasks.filter((t) => t.date === todayLogical && !t.isCompleted),
        [tasks, todayLogical]
    );

    const overdueTasks = useMemo(
        () => tasks.filter((t) => t.date < todayLogical && !t.isCompleted).slice(0, 6),
        [tasks, todayLogical]
    );

    const mitCount = useMemo(() => todayTasks.filter((t) => t.isMIT).length, [todayTasks]);

    const totalPlannedMinutes = useMemo(
        () => todayTasks.reduce((sum, t) => sum + (t.durationMinutes ?? 60), 0),
        [todayTasks]
    );

    const capacityRatio = Math.min(100, Math.round((totalPlannedMinutes / Math.max(60, dailyCapacity)) * 100));
    const isOverloaded = totalPlannedMinutes > dailyCapacity;
    const firstMit = todayTasks.find((t) => t.isMIT) || todayTasks[0];

    if (!isMorningModalOpen) return null;

    const handleToggleMit = (taskId: string, currentlyMit?: boolean) => {
        if (!currentlyMit && mitCount >= 3) {
            showToast('حداکثر ۳ اولویت طلایی (MIT) برای هر روز توصیه می‌شود!', 'warning');
            return;
        }
        toggleTaskMIT(taskId);
    };

    return createPortal(
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 backdrop-blur-sm p-4"
            onClick={() => setMorningModalOpen(false)}
        >
            <div
                onClick={(e) => e.stopPropagation()}
                className="bg-white dark:bg-gray-900 rounded-3xl max-w-2xl w-full max-h-[88vh] flex flex-col overflow-hidden border border-sky-200/70 dark:border-gray-700 shadow-2xl"
            >
                {/* Header */}
                <div className="p-5 bg-gradient-to-l from-sky-500 to-indigo-600 text-white flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-2xl bg-white/20 flex items-center justify-center">
                            <Sunrise size={24} />
                        </div>
                        <div>
                            <h2 className="text-lg font-black">آیین شروع صبح و انتخاب ۳ اولویت طلایی</h2>
                            <p className="text-xs text-sky-100">{getFullShamsiDate(todayLogical)}</p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={() => setMorningModalOpen(false)}
                        className="p-2 rounded-xl hover:bg-white/20 transition"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Body */}
                <div className="p-5 overflow-y-auto space-y-5 flex-1">
                    {/* Capacity gauge */}
                    <div
                        className={`p-4 rounded-2xl border ${
                            isOverloaded
                                ? 'bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-800/50'
                                : 'bg-sky-50 dark:bg-sky-950/20 border-sky-200 dark:border-sky-800/40'
                        }`}
                    >
                        <div className="flex items-center justify-between text-xs font-black mb-2">
                            <span className="flex items-center gap-1.5 text-gray-800 dark:text-gray-100">
                                {isOverloaded && <AlertTriangle size={15} className="text-rose-500" />}
                                ظرفیت برنامه‌ریزی امروز
                            </span>
                            <span className={isOverloaded ? 'text-rose-600 dark:text-rose-400' : 'text-indigo-600 dark:text-indigo-300'}>
                                {formatToPersianDigits(totalPlannedMinutes)} / {formatToPersianDigits(dailyCapacity)} دقیقه
                            </span>
                        </div>
                        <div className="h-2.5 rounded-full bg-white dark:bg-gray-800 overflow-hidden">
                            <div
                                className={`h-full transition-all duration-500 ${isOverloaded ? 'bg-rose-500' : 'bg-indigo-600'}`}
                                style={{ width: `${capacityRatio}%` }}
                            />
                        </div>
                        {isOverloaded && (
                            <p className="text-[11px] text-rose-600 dark:text-rose-300 font-bold mt-2">
                                حجم تسک‌های امروز از ظرفیت هدف روزانه شما بیشتر است؛ ۳ تسک کلیدی را ستاره‌دار کنید و بقیه را در صورت نیاز جابه‌جا کنید.
                            </p>
                        )}
                    </div>

                    {/* Today tasks MIT selection */}
                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <h3 className="text-xs font-black text-gray-700 dark:text-gray-200">
                                تسک‌های امروز ({formatToPersianDigits(todayTasks.length)}) — انتخاب ستاره MIT ({formatToPersianDigits(mitCount)}/۳)
                            </h3>
                        </div>

                        {todayTasks.length === 0 ? (
                            <div className="text-center py-8 bg-gray-50 dark:bg-gray-800/60 rounded-2xl text-xs text-gray-400 font-bold">
                                برای امروز تسک معلقی ثبت نشده است! می‌توانید از بخش تخلیه ذهن یا برنامه دروس اضافه کنید.
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {todayTasks.map((t) => {
                                    const st = getSubjectStyle(t.subject);
                                    return (
                                        <div
                                            key={t.id}
                                            className={`flex items-center justify-between p-3 rounded-2xl border transition ${
                                                t.isMIT
                                                    ? 'bg-amber-50/70 dark:bg-amber-950/20 border-amber-300 dark:border-amber-700/50'
                                                    : 'bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700'
                                            }`}
                                        >
                                            <div className="flex items-center gap-2.5 min-w-0">
                                                <span className="text-lg">{st.icon}</span>
                                                <div className="min-w-0">
                                                    <div className="text-xs font-black text-gray-800 dark:text-white truncate">
                                                        {t.topic}
                                                    </div>
                                                    <div className="text-[10px] text-gray-400">
                                                        {t.subject} • {formatToPersianDigits(t.durationMinutes ?? 60)} دقیقه
                                                        {t.startTime ? ` • ساعت ${t.startTime}` : ''}
                                                    </div>
                                                </div>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => handleToggleMit(t.id, t.isMIT)}
                                                className={`p-2 rounded-xl transition ${
                                                    t.isMIT
                                                        ? 'bg-amber-400 text-amber-950 shadow-sm'
                                                        : 'bg-gray-100 dark:bg-gray-700 text-gray-400 hover:text-amber-500'
                                                }`}
                                                title="انتخاب به عنوان اولویت طلایی"
                                            >
                                                <Star size={16} fill={t.isMIT ? 'currentColor' : 'none'} />
                                            </button>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {/* Overdue quick pull */}
                    {overdueTasks.length > 0 && (
                        <div>
                            <h3 className="text-xs font-black text-amber-600 dark:text-amber-400 mb-2">
                                تسک‌های جاافتاده روزهای قبل (برای آوردن به امروز کلیک کنید)
                            </h3>
                            <div className="flex flex-wrap gap-2">
                                {overdueTasks.map((t) => (
                                    <button
                                        key={t.id}
                                        type="button"
                                        onClick={() => {
                                            moveTaskToDate(t.id, todayLogical);
                                            showToast(`«${t.topic}» به امروز منتقل شد.`, 'success');
                                        }}
                                        className="text-[11px] font-bold px-3 py-1.5 rounded-xl bg-amber-50 dark:bg-amber-950/30 text-amber-800 dark:text-amber-200 border border-amber-200 dark:border-amber-800/40 hover:bg-amber-100 transition"
                                    >
                                        + {t.subject}: {t.topic}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 flex items-center justify-between gap-3">
                    <button
                        type="button"
                        onClick={() => setMorningModalOpen(false)}
                        className="px-4 py-2.5 rounded-xl bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 text-xs font-bold border border-gray-200 dark:border-gray-700 flex items-center gap-1.5"
                    >
                        <CheckCircle2 size={15} /> آماده شروعم
                    </button>

                    {firstMit && (
                        <button
                            type="button"
                            onClick={() => {
                                setMorningModalOpen(false);
                                startFocusForTask(firstMit);
                            }}
                            className="flex-1 sm:flex-none px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black flex items-center justify-center gap-2 shadow-md transition"
                        >
                            <Play size={15} fill="currentColor" />
                            شروع تمرکز روی «{firstMit.topic}»
                        </button>
                    )}
                </div>
            </div>
        </div>,
        document.body
    );
};
