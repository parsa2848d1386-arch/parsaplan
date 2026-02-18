import React, { useState } from 'react';
import { useStore } from '../context/StoreContext';
import {
    Plus, Target, Clock, CalendarDays,
    Clipboard, Sparkles, Pencil,
    ArrowDownToLine
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getShamsiDate, toIsoString, addDays } from '../utils';
import { TaskCard } from '../components/TaskCard';
import TaskModal from '../components/TaskModal';
import { SubjectTask } from '../types';

/* ===== داشبورد اصلی =====
   ۱. خوش‌آمدگویی با نام کاربر
   ۲. سه کارت آماری افقی با Progress Bar
   ۳. تسک‌های امروز (واقعی از StoreContext)
   ۴. تقویم کوچک ماهانه با نقاط رنگی رویداد
*/



const Dashboard = () => {
    const {
        userName, currentDay, getProgress, getTasksByDate, getDayDate,
        tasks: allTasks, totalDays, setIsTimerOpen, level,
        toggleTask, updateTask, deleteTask, moveTaskToDate, viewMode
    } = useStore();

    const navigate = useNavigate();
    const overallProgress = getProgress();

    // تاریخ فعلی
    const activeDateIso = getDayDate(currentDay);
    const dailyTasks = getTasksByDate(activeDateIso);
    const completedDailyTasks = dailyTasks.filter(t => t.isCompleted).length;
    const daysLeft = Math.max(0, totalDays - currentDay);

    // === Task Modal State ===
    const [editingTask, setEditingTask] = useState<SubjectTask | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

    // === تسک‌های عقب‌افتاده ===
    const todayIso = toIsoString(new Date());
    const overdueTasks = allTasks.filter(t => t.date < todayIso && !t.isCompleted && t.date !== activeDateIso);

    // ===== تبدیل ساعت به سلام =====
    const getGreeting = () => {
        const hour = new Date().getHours();
        if (hour < 12) return 'صبح بخیر';
        if (hour < 17) return 'ظهر بخیر';
        return 'عصر بخیر';
    };

    const handleEdit = (e: React.MouseEvent, task: SubjectTask) => {
        e.stopPropagation();
        setEditingTask(task);
        setIsModalOpen(true);
    };

    const handleDelete = (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        deleteTask(id);
    };

    const handleSaveTask = (taskData: Partial<SubjectTask>) => {
        if (editingTask) updateTask({ ...editingTask, ...taskData } as SubjectTask);
        setIsModalOpen(false);
        setEditingTask(null);
    };

    const handleMoveToToday = (taskId: string) => {
        moveTaskToDate(taskId, todayIso);
    };

    return (
        <div className="p-4 md:p-6 space-y-6 animate-page-enter">

            {/* ===== بخش خوش‌آمدگویی ===== */}
            <div>
                <h1 className="text-2xl md:text-3xl font-black text-gray-800 dark:text-white tracking-tight leading-tight">
                    {getGreeting()}، {userName || 'کاربر'} 👋
                </h1>
                <p className="text-sm text-gray-400 dark:text-gray-500 mt-1.5 font-medium">
                    روز {currentDay} از {totalDays} — {daysLeft} روز مانده
                </p>
            </div>

            {/* ===== ۳ کارت آماری افقی ===== */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

                {/* کارت ۱: وضعیت پیشرفت */}
                <div className="bg-white dark:bg-gray-800/80 rounded-3xl p-5 shadow-[0_4px_20px_rgba(0,0,0,0.03)] border border-gray-100/80 dark:border-gray-700/50 animate-card-enter hover:shadow-md transition-shadow duration-300">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2.5">
                            <div className="w-9 h-9 rounded-xl bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
                                <Target size={18} className="text-orange-500" />
                            </div>
                            <span className="text-sm font-extrabold text-gray-700 dark:text-gray-200">پیشرفت کل</span>
                        </div>
                    </div>
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-bold text-gray-600 dark:text-gray-300">تسک‌های انجام شده</span>
                        <span className="text-sm font-extrabold text-gray-800 dark:text-white">{overallProgress}%</span>
                    </div>
                    <div className="w-full bg-gray-100 dark:bg-gray-700 h-2.5 rounded-full overflow-hidden">
                        <div
                            className="bg-gradient-to-l from-orange-400 to-orange-500 h-full rounded-full transition-all duration-1000 ease-out"
                            style={{ width: `${overallProgress}%` }}
                        />
                    </div>
                </div>

                {/* کارت ۲: تسک‌های امروز */}
                <div className="bg-white dark:bg-gray-800/80 rounded-3xl p-5 shadow-[0_4px_20px_rgba(0,0,0,0.03)] border border-gray-100/80 dark:border-gray-700/50 animate-card-enter hover:shadow-md transition-shadow duration-300">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2.5">
                            <div className="w-9 h-9 rounded-xl bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center">
                                <Clock size={18} className="text-indigo-500" />
                            </div>
                            <span className="text-sm font-extrabold text-gray-700 dark:text-gray-200">تسک‌های امروز</span>
                        </div>
                    </div>
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-bold text-gray-600 dark:text-gray-300">تکمیل شده</span>
                        <span className="text-sm font-extrabold text-gray-800 dark:text-white">{completedDailyTasks} / {dailyTasks.length}</span>
                    </div>
                    <div className="w-full bg-gray-100 dark:bg-gray-700 h-2.5 rounded-full overflow-hidden">
                        <div
                            className="bg-gradient-to-l from-indigo-400 to-blue-500 h-full rounded-full transition-all duration-1000 ease-out"
                            style={{ width: dailyTasks.length > 0 ? `${(completedDailyTasks / dailyTasks.length) * 100}%` : '0%' }}
                        />
                    </div>
                </div>

                {/* کارت ۳: روزهای باقیمانده */}
                <div className="bg-white dark:bg-gray-800/80 rounded-3xl p-5 shadow-[0_4px_20px_rgba(0,0,0,0.03)] border border-gray-100/80 dark:border-gray-700/50 animate-card-enter hover:shadow-md transition-shadow duration-300">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2.5">
                            <div className="w-9 h-9 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                                <CalendarDays size={18} className="text-emerald-500" />
                            </div>
                            <span className="text-sm font-extrabold text-gray-700 dark:text-gray-200">وضعیت دوره</span>
                        </div>
                    </div>
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-bold text-gray-600 dark:text-gray-300">روز باقیمانده</span>
                        <span className="text-sm font-extrabold text-gray-800 dark:text-white">{daysLeft} روز</span>
                    </div>
                    <div className="w-full bg-gray-100 dark:bg-gray-700 h-2.5 rounded-full overflow-hidden">
                        <div
                            className="bg-gradient-to-l from-emerald-400 to-teal-500 h-full rounded-full transition-all duration-1000 ease-out"
                            style={{ width: `${((totalDays - daysLeft) / totalDays) * 100}%` }}
                        />
                    </div>
                </div>
            </div>

            {/* ===== تسک‌های امروز ===== */}
            <div>
                <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-extrabold text-gray-700 dark:text-gray-200">
                        تسک‌های امروز ({getShamsiDate(activeDateIso)})
                    </h3>
                    <button
                        onClick={() => { setEditingTask(null); setIsModalOpen(true); }}
                        className="text-[11px] text-indigo-500 font-bold hover:text-indigo-600 transition flex items-center gap-1"
                    >
                        <Plus size={13} />
                        افزودن تسک
                    </button>
                </div>

                {dailyTasks.length > 0 ? (
                    <div className="space-y-3">
                        {dailyTasks.map(task => (
                            <TaskCard
                                key={task.id}
                                task={task}
                                viewMode={viewMode}
                                onToggle={toggleTask}
                                onEdit={handleEdit}
                                onDelete={handleDelete}
                            />
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-10 bg-white dark:bg-gray-800/60 rounded-2xl border border-gray-100/80 dark:border-gray-700/50 border-dashed">
                        <Clipboard size={32} className="mx-auto mb-3 text-gray-300 dark:text-gray-600" />
                        <p className="text-sm text-gray-400 font-medium">تسکی برای امروز وجود ندارد</p>
                        <button
                            onClick={() => { setEditingTask(null); setIsModalOpen(true); }}
                            className="mt-3 text-xs text-indigo-500 font-bold hover:text-indigo-600"
                        >
                            + افزودن تسک جدید
                        </button>
                    </div>
                )}
            </div>

            {/* ===== تسک‌های عقب‌افتاده ===== */}
            {overdueTasks.length > 0 && (
                <div>
                    <h3 className="text-sm font-extrabold text-amber-600 dark:text-amber-400 mb-3 flex items-center gap-1.5">
                        <ArrowDownToLine size={14} />
                        تسک‌های عقب‌افتاده ({overdueTasks.length})
                    </h3>
                    <div className="space-y-3">
                        {overdueTasks.map(task => (
                            <TaskCard
                                key={task.id}
                                task={task}
                                isOverdue
                                viewMode={viewMode}
                                onToggle={toggleTask}
                                onEdit={handleEdit}
                                onDelete={handleDelete}
                                onMoveToToday={handleMoveToToday}
                            />
                        ))}
                    </div>
                </div>
            )}



            {/* ===== Task Modal ===== */}
            {isModalOpen && (
                <TaskModal
                    isOpen={isModalOpen}
                    onClose={() => { setIsModalOpen(false); setEditingTask(null); }}
                    onSave={handleSaveTask}
                    initialData={editingTask}
                    currentDayId={currentDay}
                    defaultDateStr={activeDateIso}
                />
            )}
        </div>
    );
};

export default Dashboard;
