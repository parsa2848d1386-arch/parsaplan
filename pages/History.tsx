import React from 'react';
import { useStore } from '../context/StoreContext';
import { History as HistoryIcon, Calendar, CheckCircle2, Trash2, ChevronLeft, Target, BookOpen, Clock, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getShamsiDate } from '../utils';

const History = () => {
    const { archivedPlans, deleteArchivedPlan, userName } = useStore();
    const navigate = useNavigate();

    return (
        <div className="max-w-4xl mx-auto p-4 md:p-6 pb-24 space-y-6">
            <div className="flex items-center gap-4">
                <button
                    onClick={() => navigate(-1)}
                    className="p-2 bg-white dark:bg-gray-800 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition border border-gray-100 dark:border-gray-700"
                >
                    <ArrowRight size={20} className="text-gray-500" />
                </button>
                <div>
                    <h1 className="text-2xl font-black text-gray-800 dark:text-white flex items-center gap-2">
                        <HistoryIcon className="text-indigo-600" />
                        آرشیو و تاریخچه برنامه‌ها
                    </h1>
                    <p className="text-gray-500 dark:text-gray-400 text-xs mt-1">برنامه‌های قبلی {userName} در یک نگاه</p>
                </div>
            </div>

            {archivedPlans.length === 0 ? (
                <div className="bg-white dark:bg-gray-800 p-12 rounded-3xl border-2 border-dashed border-gray-100 dark:border-gray-700 text-center space-y-4">
                    <HistoryIcon size={64} className="mx-auto text-gray-200 dark:text-gray-700" />
                    <p className="text-gray-500 font-bold">هنوز هیچ برنامه‌ای آرشیو نشده است.</p>
                    <p className="text-gray-400 text-xs">پس از پایان هر دوره، می‌توانید آن را در بخش تنظیمات آرشیو کنید.</p>
                </div>
            ) : (
                <div className="grid gap-4">
                    {archivedPlans.map((plan) => (
                        <div
                            key={plan.id}
                            className="bg-white dark:bg-gray-800 p-5 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 group hover:border-indigo-200 dark:hover:border-indigo-800 transition-all"
                        >
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <h3 className="font-black text-lg text-gray-800 dark:text-white mb-1">{plan.title}</h3>
                                    <div className="flex items-center gap-3 text-[10px] text-gray-400 font-mono">
                                        <span className="flex items-center gap-1"><Calendar size={12} /> {getShamsiDate(plan.startDate)}</span>
                                        <span>تا</span>
                                        <span className="flex items-center gap-1"><Calendar size={12} /> {getShamsiDate(plan.endDate)}</span>
                                    </div>
                                </div>
                                <button
                                    onClick={() => {
                                        if (window.confirm('آیا مطمئن هستید که این برنامه از تاریخچه حذف شود؟')) {
                                            deleteArchivedPlan(plan.id);
                                        }
                                    }}
                                    className="p-2 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-xl transition opacity-0 group-hover:opacity-100"
                                >
                                    <Trash2 size={18} />
                                </button>
                            </div>

                            <div className="grid grid-cols-3 gap-3 mb-4">
                                <div className="bg-indigo-50 dark:bg-indigo-900/20 p-3 rounded-2xl flex flex-col items-center justify-center border border-indigo-100 dark:border-indigo-800">
                                    <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-bold mb-1">کل تسک‌ها</span>
                                    <span className="text-lg font-black text-indigo-700 dark:text-indigo-300">{plan.totalTasks}</span>
                                </div>
                                <div className="bg-emerald-50 dark:bg-emerald-900/20 p-3 rounded-2xl flex flex-col items-center justify-center border border-emerald-100 dark:border-emerald-800">
                                    <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold mb-1">انجام شده</span>
                                    <span className="text-lg font-black text-emerald-700 dark:text-emerald-300">{plan.completedTasks}</span>
                                    <span className="text-[8px] text-emerald-500 font-bold">({Math.round((plan.completedTasks / plan.totalTasks) * 100)}%)</span>
                                </div>
                                <div className="bg-amber-50 dark:bg-amber-900/20 p-3 rounded-2xl flex flex-col items-center justify-center border border-amber-100 dark:border-amber-800">
                                    <span className="text-[10px] text-amber-600 dark:text-amber-400 font-bold mb-1">رشته</span>
                                    <span className="text-[10px] font-black text-amber-700 dark:text-amber-300">
                                        {plan.stream === 'riazi' ? 'ریاضی' : plan.stream === 'tajrobi' ? 'تجربی' : plan.stream === 'ensani' ? 'انسانی' : 'عمومی'}
                                    </span>
                                </div>
                            </div>

                            {/* Mini Task Flow */}
                            <div className="space-y-2 max-h-40 overflow-y-auto pr-2 custom-scrollbar border-t border-gray-50 dark:border-gray-700/50 pt-3">
                                {plan.tasks.slice(0, 10).map((task, i) => (
                                    <div key={i} className="flex items-center justify-between text-[10px] text-gray-500 bg-gray-50 dark:bg-gray-900/50 p-2 rounded-lg">
                                        <div className="flex items-center gap-2">
                                            {task.isCompleted ? <CheckCircle2 size={12} className="text-emerald-500" /> : <Clock size={12} />}
                                            <span className="font-bold">{task.subject}</span>
                                            <span className="opacity-50">-</span>
                                            <span className="truncate max-w-[100px]">{task.topic}</span>
                                        </div>
                                        <span className="font-mono text-[8px]">{getShamsiDate(task.date)}</span>
                                    </div>
                                ))}
                                {plan.tasks.length > 10 && (
                                    <div className="text-[8px] text-center text-gray-400 mt-2">
                                        + {plan.tasks.length - 10} تسک دیگر در این برنامه
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default History;
