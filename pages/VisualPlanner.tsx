import React, { useState, useMemo } from 'react';
import { useStore } from '../context/StoreContext';
import { useUI } from '../context/UIContext';
import { SubjectTask } from '../types';
import { getLogicalDateKey } from '../utils/streakEngine';
import { addDays, toIsoString, getFullShamsiDate, getDiffDays, formatToPersianDigits } from '../utils';
import { DualColumn10MinuteGrid } from '../components/planner/DualColumn10MinuteGrid';
import { UnifiedTimeline } from '../components/planner/UnifiedTimeline';
import TaskModal from '../components/TaskModal';
import {
    CalendarClock,
    ChevronRight,
    ChevronLeft,
    Grid3X3,
    ListFilter,
    Sunrise,
    MoonStar,
    Sparkles,
    Plus,
} from 'lucide-react';

const VisualPlanner: React.FC = () => {
    const { tasks, sessions, subjects, settings, startDate, currentDay, addTask, updateTask } = useStore();
    const { setMorningModalOpen, setEveningModalOpen, setBrainDumpOpen } = useUI();

    const cutoffHour = settings.dayCutoffHour ?? 5;
    const todayLogical = useMemo(() => getLogicalDateKey(new Date(), cutoffHour), [cutoffHour]);

    const [selectedDate, setSelectedDate] = useState<string>(todayLogical);
    const [tab, setTab] = useState<'timeline' | 'grid'>('timeline');

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingTask, setEditingTask] = useState<SubjectTask | null>(null);
    const [slotTimeDefault, setSlotTimeDefault] = useState<string>('09:00');

    const weekStrip = useMemo(() => {
        return Array.from({ length: 7 }, (_, i) => {
            const iso = toIsoString(addDays(todayLogical, i - 1));
            const dayTasks = tasks.filter((t) => t.date === iso);
            const totalMins = dayTasks.reduce((sum, t) => sum + (t.durationMinutes ?? 60), 0);
            const doneCount = dayTasks.filter((t) => t.isCompleted).length;
            const dObj = new Date(iso + 'T12:00:00');
            const weekday = new Intl.DateTimeFormat('fa-IR', { weekday: 'short' }).format(dObj);
            const dayNum = new Intl.DateTimeFormat('fa-IR', { day: 'numeric', month: 'short' }).format(dObj);
            return {
                iso,
                weekday,
                dayNum,
                count: dayTasks.length,
                doneCount,
                hours: Math.round((totalMins / 60) * 10) / 10,
                isToday: iso === todayLogical,
            };
        });
    }, [todayLogical, tasks]);

    const handleOpenNewAtTime = (startTime: string) => {
        setEditingTask(null);
        setSlotTimeDefault(startTime);
        setIsModalOpen(true);
    };

    const handleEditTask = (task: SubjectTask) => {
        setEditingTask(task);
        setIsModalOpen(true);
    };

    const handleSaveTask = (taskData: Partial<SubjectTask>) => {
        if (editingTask) {
            updateTask({ ...editingTask, ...taskData } as SubjectTask);
        } else {
            const targetDate = taskData.date || selectedDate;
            const computedDayId = Math.max(1, getDiffDays(startDate, targetDate) + 1);
            const newTask: SubjectTask = {
                id: `task_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
                dayId: taskData.dayId || computedDayId,
                date: targetDate,
                subject: taskData.subject || subjects[0]?.name || 'شخصی',
                topic: taskData.topic || 'فعالیت زمان‌بندی‌شده',
                details: taskData.details || 'برنامه‌ریزی شده',
                isCompleted: !!taskData.isCompleted,
                status: taskData.status || 'todo',
                studyType: taskData.studyType || 'task',
                priority: taskData.priority || 'medium',
                startTime: taskData.startTime || slotTimeDefault,
                durationMinutes: taskData.durationMinutes ?? 60,
                isMIT: taskData.isMIT,
                blocks: taskData.blocks,
                testRange: taskData.testRange,
                isCustom: true,
            };
            addTask(newTask);
        }
    };

    return (
        <div className="p-4 md:p-6 pb-32 max-w-6xl mx-auto space-y-5">
            <TaskModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSave={handleSaveTask}
                initialData={
                    editingTask ||
                    ({
                        startTime: slotTimeDefault,
                        durationMinutes: 60,
                        date: selectedDate,
                    } as SubjectTask)
                }
                currentDayId={currentDay || 1}
                defaultDateStr={selectedDate}
            />

            {/* Header */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-indigo-600 to-cyan-600 text-white flex items-center justify-center shadow-md">
                        <CalendarClock size={22} />
                    </div>
                    <div>
                        <h1 className="text-xl md:text-2xl font-black text-gray-800 dark:text-white">
                            تایم‌لاین تعاملی و برنامه‌ریز ۲۴ ساعته
                        </h1>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                            چیدمان آزاد برای کار، پروژه‌ها، ورزش، زندگی و یادگیری (شروع روز از {String(cutoffHour).padStart(2, '0')}:۰۰ بامداد)
                        </p>
                    </div>
                </div>

                {/* Quick Ritual & Brain Dump Actions */}
                <div className="flex flex-wrap items-center gap-2">
                    <button
                        type="button"
                        onClick={() => setBrainDumpOpen(true)}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800/40 text-xs font-black hover:scale-[1.02] transition"
                    >
                        <Sparkles size={14} /> تخلیه ذهن (Brain Dump)
                    </button>
                    <button
                        type="button"
                        onClick={() => setMorningModalOpen(true)}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800/40 text-xs font-black hover:scale-[1.02] transition"
                    >
                        <Sunrise size={14} /> شروع صبح
                    </button>
                    <button
                        type="button"
                        onClick={() => setEveningModalOpen(true)}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800/40 text-xs font-black hover:scale-[1.02] transition"
                    >
                        <MoonStar size={14} /> جمع‌بندی شبانه
                    </button>
                    <button
                        type="button"
                        onClick={() => handleOpenNewAtTime('09:00')}
                        className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 text-white text-xs font-black hover:bg-indigo-700 transition"
                    >
                        <Plus size={14} /> بلوک زمانی جدید
                    </button>
                </div>
            </div>

            {/* 7-Day Interactive Week Strip */}
            <div className="grid grid-cols-7 gap-2 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-2 shadow-sm overflow-x-auto">
                {weekStrip.map((d) => {
                    const isSelected = d.iso === selectedDate;
                    return (
                        <button
                            key={d.iso}
                            type="button"
                            onClick={() => setSelectedDate(d.iso)}
                            className={`p-2 rounded-xl text-center transition border min-w-[68px] ${
                                isSelected
                                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                                    : d.isToday
                                      ? 'bg-indigo-50/70 dark:bg-indigo-950/30 border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-200'
                                      : 'bg-gray-50/70 dark:bg-gray-900/40 border-transparent text-gray-700 dark:text-gray-300 hover:border-gray-200'
                            }`}
                        >
                            <div className="text-[10px] font-bold opacity-80">{d.isToday ? 'امروز' : d.weekday}</div>
                            <div className="text-xs font-black mt-0.5">{d.dayNum}</div>
                            <div className={`text-[9px] mt-1 font-bold ${isSelected ? 'text-indigo-100' : 'text-gray-400'}`}>
                                {d.count > 0 ? `${formatToPersianDigits(d.doneCount)}/${formatToPersianDigits(d.count)} • ${formatToPersianDigits(d.hours)}h` : 'خالی'}
                            </div>
                        </button>
                    );
                })}
            </div>

            {/* Date Navigator & View Switcher */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-3 shadow-sm">
                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={() => setSelectedDate(toIsoString(addDays(selectedDate, -1)))}
                        className="p-2 rounded-xl bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-indigo-50"
                        title="روز قبل"
                    >
                        <ChevronRight size={16} />
                    </button>
                    <div className="px-3 text-center">
                        <div className="text-sm font-black text-gray-800 dark:text-white">
                            {getFullShamsiDate(selectedDate)}
                        </div>
                        <div className="text-[10px] font-mono text-gray-400">
                            {selectedDate} {selectedDate === todayLogical ? '• امروز (روز منطقی)' : ''}
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={() => setSelectedDate(toIsoString(addDays(selectedDate, 1)))}
                        className="p-2 rounded-xl bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-indigo-50"
                        title="روز بعد"
                    >
                        <ChevronLeft size={16} />
                    </button>
                    {selectedDate !== todayLogical && (
                        <button
                            type="button"
                            onClick={() => setSelectedDate(todayLogical)}
                            className="px-3 py-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-300 text-xs font-bold"
                        >
                            امروز
                        </button>
                    )}
                </div>

                <div className="flex items-center bg-gray-100 dark:bg-gray-900 rounded-xl p-1 gap-1">
                    <button
                        type="button"
                        onClick={() => setTab('timeline')}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                            tab === 'timeline'
                                ? 'bg-white dark:bg-gray-700 text-indigo-600 dark:text-indigo-300 shadow-sm'
                                : 'text-gray-500'
                        }`}
                    >
                        <ListFilter size={14} /> تایم‌لاین تعاملی ۲۴ ساعته
                    </button>
                    <button
                        type="button"
                        onClick={() => setTab('grid')}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                            tab === 'grid'
                                ? 'bg-white dark:bg-gray-700 text-indigo-600 dark:text-indigo-300 shadow-sm'
                                : 'text-gray-500'
                        }`}
                    >
                        <Grid3X3 size={14} /> گرید ۱۰ دقیقه‌ای (YPT)
                    </button>
                </div>
            </div>

            {/* Active View */}
            {tab === 'timeline' ? (
                <UnifiedTimeline
                    logicalDate={selectedDate}
                    tasks={tasks}
                    sessions={sessions}
                    cutoffHour={cutoffHour}
                    onAddAtHour={handleOpenNewAtTime}
                    onEditTask={handleEditTask}
                />
            ) : (
                <DualColumn10MinuteGrid
                    logicalDate={selectedDate}
                    tasks={tasks}
                    sessions={sessions}
                    subjects={subjects}
                    cutoffHour={cutoffHour}
                    onSelectSlotTime={handleOpenNewAtTime}
                    onSelectTask={handleEditTask}
                />
            )}
        </div>
    );
};

export default VisualPlanner;
