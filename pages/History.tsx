import React from 'react';
import { useStore } from '../context/StoreContext';
import { History as HistoryIcon, Calendar, CheckCircle2, Trash2, Clock, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getShamsiDate, formatToPersianDigits } from '../utils';

const History = () => {
    const { archivedPlans, deleteArchivedPlan, userName, askConfirm } = useStore();
    const navigate = useNavigate();

    return (
        <div className="max-w-5xl mx-auto p-4 sm:p-6 md:p-8 max-app-container space-y-6">
            <div className="flex items-center gap-3.5">
                <button
                    type="button"
                    aria-label="بازگشت"
                    onClick={() => navigate(-1)}
                    className="hidden md:inline-flex w-11 h-11 items-center justify-center bg-[var(--surface-elevated)] rounded-xl hover:bg-surface-container transition border border-[var(--border-subtle)] cursor-pointer"
                >
                    <ArrowRight size={20} className="text-[var(--text-secondary)]" />
                </button>
                <div>
                    <h1 className="text-xl sm:text-2xl font-extrabold text-[var(--text-primary)] flex items-center gap-2">
                        <HistoryIcon className="text-primary" size={22} aria-hidden="true" />
                        آرشیو و تاریخچه برنامه‌ها
                    </h1>
                    <p className="text-[var(--text-secondary)] text-xs mt-1">
                        برنامه‌های قبلی {userName || 'شما'} در یک نگاه
                    </p>
                </div>
            </div>

            {archivedPlans.length === 0 ? (
                <div className="bg-[var(--surface-elevated)] p-10 squircle-lg border border-dashed border-[var(--border-strong)] text-center space-y-3">
                    <HistoryIcon size={52} className="mx-auto text-[var(--text-muted)] opacity-40" aria-hidden="true" />
                    <p className="text-[var(--text-primary)] font-bold text-sm">هنوز هیچ برنامه‌ای آرشیو نشده است.</p>
                    <p className="text-[var(--text-secondary)] text-xs max-w-sm mx-auto leading-relaxed">
                        پس از پایان هر دوره، می‌توانید از بخش تنظیمات برنامه فعلی را آرشیو کنید تا تاریخچه پیشرفت شما ثبت بماند.
                    </p>
                </div>
            ) : (
                <div className="grid gap-4">
                    {archivedPlans.map((plan) => {
                        const pct = plan.totalTasks > 0 ? Math.round((plan.completedTasks / plan.totalTasks) * 100) : 0;
                        return (
                            <div
                                key={plan.id}
                                className="bg-[var(--surface-elevated)] p-5 squircle-lg border border-[var(--border-subtle)] group hover:border-primary/40 transition-colors"
                            >
                                <div className="flex justify-between items-start gap-3 mb-4">
                                    <div className="min-w-0">
                                        <h3 className="font-extrabold text-base sm:text-lg text-[var(--text-primary)] mb-1">
                                            {plan.title}
                                        </h3>
                                        <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--text-secondary)] tabular-nums">
                                            <span className="flex items-center gap-1">
                                                <Calendar size={13} aria-hidden="true" /> {getShamsiDate(plan.startDate)}
                                            </span>
                                            <span>تا</span>
                                            <span className="flex items-center gap-1">
                                                <Calendar size={13} aria-hidden="true" /> {getShamsiDate(plan.endDate)}
                                            </span>
                                        </div>
                                    </div>
                                    <button
                                        type="button"
                                        aria-label="حذف برنامه آرشیوشده"
                                        onClick={() => {
                                            askConfirm(
                                                'حذف از تاریخچه',
                                                'آیا مطمئن هستید که این برنامه از تاریخچه حذف شود؟',
                                                () => deleteArchivedPlan(plan.id),
                                                'danger'
                                            );
                                        }}
                                        className="w-10 h-10 flex items-center justify-center text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl transition cursor-pointer shrink-0"
                                    >
                                        <Trash2 size={18} />
                                    </button>
                                </div>

                                <div className="grid grid-cols-3 gap-2.5 sm:gap-3 mb-4">
                                    <div className="bg-primary-container/50 p-3 squircle-sm flex flex-col items-center justify-center">
                                        <span className="text-xs text-on-primary-container font-semibold mb-1">کل تسک‌ها</span>
                                        <span className="text-lg font-extrabold text-primary tabular-nums">
                                            {formatToPersianDigits(plan.totalTasks)}
                                        </span>
                                    </div>
                                    <div className="bg-emerald-50 dark:bg-emerald-950/30 p-3 squircle-sm flex flex-col items-center justify-center">
                                        <span className="text-xs text-emerald-700 dark:text-emerald-300 font-semibold mb-1">انجام شده</span>
                                        <span className="text-lg font-extrabold text-emerald-700 dark:text-emerald-300 tabular-nums">
                                            {formatToPersianDigits(plan.completedTasks)}
                                        </span>
                                        <span className="text-xs text-emerald-600 dark:text-emerald-400 font-bold tabular-nums">
                                            ({formatToPersianDigits(pct)}٪)
                                        </span>
                                    </div>
                                    <div className="bg-amber-50 dark:bg-amber-950/30 p-3 squircle-sm flex flex-col items-center justify-center">
                                        <span className="text-xs text-amber-800 dark:text-amber-300 font-semibold mb-1">حوزه</span>
                                        <span className="text-xs font-extrabold text-amber-900 dark:text-amber-200">
                                            {plan.stream === 'riazi'
                                                ? 'ریاضی'
                                                : plan.stream === 'tajrobi'
                                                  ? 'تجربی'
                                                  : plan.stream === 'ensani'
                                                    ? 'انسانی'
                                                    : 'عمومی'}
                                        </span>
                                    </div>
                                </div>

                                {/* Mini Task Flow */}
                                <div className="space-y-2 max-h-44 overflow-y-auto pr-1 custom-scrollbar border-t border-[var(--border-subtle)] pt-3">
                                    {plan.tasks.slice(0, 10).map((task, i) => (
                                        <div
                                            key={task.id || i}
                                            className="flex items-center justify-between gap-2 text-xs text-[var(--text-secondary)] bg-surface-container-low dark:bg-slate-900/50 px-3 py-2 rounded-xl"
                                        >
                                            <div className="flex items-center gap-2 min-w-0">
                                                {task.isCompleted ? (
                                                    <CheckCircle2 size={14} className="text-emerald-500 shrink-0" aria-hidden="true" />
                                                ) : (
                                                    <Clock size={14} className="shrink-0" aria-hidden="true" />
                                                )}
                                                <span className="font-bold text-[var(--text-primary)] shrink-0">{task.subject}</span>
                                                <span className="opacity-50">-</span>
                                                <span className="truncate">{task.topic}</span>
                                            </div>
                                            <span className="text-xs tabular-nums shrink-0">{getShamsiDate(task.date)}</span>
                                        </div>
                                    ))}
                                    {plan.tasks.length > 10 && (
                                        <div className="text-xs text-center text-[var(--text-muted)] pt-1 tabular-nums">
                                            + {formatToPersianDigits(plan.tasks.length - 10)} تسک دیگر در این برنامه
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default History;
