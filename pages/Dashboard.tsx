import React, { useState, useEffect } from 'react';
import { useStore } from '../context/StoreContext';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { ChevronLeft, ChevronRight, CheckCircle2, Circle, Trash2, Pencil, Plus, Search, AlertTriangle, ArrowDownToLine, X, Calendar, SlidersHorizontal, BookOpen, Clock, Zap, StickyNote, Save, Quote, Trophy, ArrowRightCircle, Target, Bot } from 'lucide-react';

import ProgressBar from '../components/ProgressBar';
import { Subject, SubjectTask, SUBJECT_LISTS, getSubjectStyle } from '../types';
import TaskModal from '../components/TaskModal';
import { TaskCard } from '../components/TaskCard';
import MoodTracker from '../components/MoodTracker';
import { getShamsiDate, toIsoString, isHoliday, parseTestCount } from '../utils';
import { useNavigate } from 'react-router-dom';

const Dashboard = () => {
    const {
        userName, currentDay, setCurrentDay, goToToday, todayDayId,
        getProgress, getTasksByDate, getDayDate,
        toggleTask, deleteTask, addTask, updateTask, moveTaskToDate,
        tasks: allTasks,
        getDailyNote, saveDailyNote,
        viewMode, setIsTimerOpen,
        level, xp, currentLevelXp, xpForNextLevel, progressPercent, dailyQuote, shiftIncompleteTasks,
        totalDays, showQuotes, settings, subjects
    } = useStore();

    const navigate = useNavigate();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingTask, setEditingTask] = useState<SubjectTask | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [showFilters, setShowFilters] = useState(false);
    const [filterSubject, setFilterSubject] = useState<string>('ALL');
    const [noteExpanded, setNoteExpanded] = useState(false);
    const [currentNote, setCurrentNote] = useState('');

    const overallProgress = getProgress();

    // Dates
    const activeDateIso = getDayDate(currentDay);
    const activeDateShamsi = getShamsiDate(activeDateIso);
    const todayIso = toIsoString(new Date());
    const isDayHoliday = isHoliday(activeDateIso);

    const isTodayView = currentDay === todayDayId;

    useEffect(() => {
        setCurrentNote(getDailyNote(activeDateIso));
    }, [activeDateIso]);

    const handleSaveNote = () => {
        saveDailyNote(activeDateIso, currentNote);
        setNoteExpanded(false);
    };

    // --- Logic for Filtering Tasks ---
    const currentStream = settings?.stream || 'general';
    const streamSubjects = SUBJECT_LISTS[currentStream] || [];

    // Filter tasks based on Stream + Search + Category
    let processedTasks = searchQuery.length > 0 ? allTasks : getTasksByDate(activeDateIso);

    // Filter by Stream (Hide tasks from other streams, unless Custom)
    processedTasks = processedTasks.filter(t => {
        if (t.isCustom) return true;
        // Check if subject exists in current stream or if it's a general subject
        // For simplicity, we just check if it's in the list. 
        // Note: Global "Custom" logic might need better handling if user named it "Math" manually.
        const isStandard = streamSubjects.includes(t.subject);
        const isGeneral = SUBJECT_LISTS['general'].includes(t.subject);
        return isStandard || isGeneral || t.isCustom;
    });

    if (searchQuery.length > 0) {
        processedTasks = processedTasks.filter(t =>
            t.subject.includes(searchQuery) ||
            t.topic.includes(searchQuery) ||
            t.details.includes(searchQuery) ||
            (t.tags && t.tags.some(tag => tag.includes(searchQuery)))
        );
    }
    if (filterSubject !== 'ALL') {
        processedTasks = processedTasks.filter(t => t.subject === filterSubject);
    }

    const rawOverdueTasks = allTasks.filter(t => t.date < todayIso && !t.isCompleted);
    const showOverdue = rawOverdueTasks.length > 0 && searchQuery === '' && isTodayView && filterSubject === 'ALL';

    // Chart Data
    const dailyTasksForChart = getTasksByDate(activeDateIso);
    const completedDailyTasks = dailyTasksForChart.filter(t => t.isCompleted).length;
    const dailyProgress = dailyTasksForChart.length > 0 ? Math.round((completedDailyTasks / dailyTasksForChart.length) * 100) : 0;

    const displayChartData = dailyTasksForChart.length === 0 ? [{ name: 'Empty', value: 1 }] : [
        { name: 'Completed', value: completedDailyTasks },
        { name: 'Remaining', value: Math.max(0, dailyTasksForChart.length - completedDailyTasks) },
    ];
    const CHART_COLORS = ['#4f46e5', '#f3f4f6'];

    const handleSaveTask = (taskData: Partial<SubjectTask>) => {
        if (editingTask) {
            updateTask({ ...editingTask, ...taskData } as SubjectTask);
        } else {
            const newTask: SubjectTask = {
                id: crypto.randomUUID(),
                dayId: taskData.dayId || 0,
                date: taskData.date || activeDateIso,
                subject: taskData.subject!,
                topic: taskData.topic!,
                details: taskData.details!,
                testRange: taskData.testRange,
                isCompleted: false,
                isCustom: true,
                tags: taskData.tags || []
            };
            addTask(newTask);
        }
    };

    const handleMoveToToday = (taskId: string) => {
        moveTaskToDate(taskId, todayIso);
    };

    const openEdit = (e: React.MouseEvent, task: SubjectTask) => {
        e.stopPropagation();
        setEditingTask(task);
        setIsModalOpen(true);
    }

    const handleDelete = (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        deleteTask(id);
    }

    const openAdd = () => {
        setEditingTask(null);
        setIsModalOpen(true);
    }



    return (
        <div className="p-4 space-y-5 animate-in fade-in duration-500">
            <TaskModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSave={handleSaveTask}
                initialData={editingTask}
                currentDayId={currentDay}
                defaultDateStr={activeDateIso}
            />

            {/* Header & Quote */}
            <div className="flex flex-col gap-4">
                <div className="flex justify-between items-center bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl p-5 rounded-[2.5rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-none border border-white/40 dark:border-gray-700/50">
                    <div>
                        <h1 className="text-2xl font-black text-gray-800 dark:text-white tracking-tight leading-tight">سلام، {userName} 👋</h1>
                        <div className="flex flex-col mt-3 w-40 sm:w-48">
                            <div className="flex justify-between items-center mb-1 px-0.5">
                                <div className="flex items-center gap-1">
                                    <Trophy size={11} className="text-amber-500" />
                                    <span className="text-[10px] font-bold text-gray-500 dark:text-gray-400">سطح {level}</span>
                                </div>
                                <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500">{Math.floor(currentLevelXp)} / {xpForNextLevel} XP</span>
                            </div>
                            <div className="h-2 w-full bg-gray-100 dark:bg-gray-700/50 rounded-full overflow-hidden border border-gray-100 dark:border-gray-700/50 p-0.5">
                                <div
                                    className="h-full bg-gradient-to-r from-amber-400 to-amber-600 rounded-full shadow-[0_0_8px_rgba(245,158,11,0.3)] transition-all duration-1000 ease-out"
                                    style={{ width: `${progressPercent}%` }}
                                ></div>
                            </div>
                        </div>
                    </div>
                    <div className="relative w-14 h-14 flex items-center justify-center">
                        <svg className="w-full h-full transform -rotate-90">
                            <circle cx="28" cy="28" r="24" stroke="currentColor" strokeWidth="4" fill="transparent" className="text-indigo-50 dark:text-gray-700" />
                            <circle cx="28" cy="28" r="24" stroke="currentColor" strokeWidth="4" fill="transparent" strokeDasharray={150.72} strokeDashoffset={150.72 - (overallProgress / 100) * 150.72} className="text-indigo-600 dark:text-indigo-500 transition-all duration-1000 ease-out" strokeLinecap="round" />
                        </svg>
                        <span className="absolute text-[10px] font-black text-indigo-700 dark:text-indigo-300">{overallProgress}%</span>
                    </div>
                </div>

                {/* Mood Tracker (Feature 10) */}
                {isTodayView && (
                    <div className="bg-white/40 dark:bg-gray-800/20 backdrop-blur-sm rounded-[2rem] p-4 border border-white/40 dark:border-gray-700/30">
                        <MoodTracker />
                    </div>
                )}

                {/* Daily Quote */}
                {showQuotes && (
                    <div className="bg-gradient-to-r from-violet-600 to-indigo-600 rounded-3xl p-5 text-white shadow-lg relative overflow-hidden">
                        <Quote size={40} className="absolute right-2 top-2 text-white/10 rotate-180" />
                        <p className="text-sm font-medium leading-7 relative z-10 text-center px-4">
                            "{dailyQuote}"
                        </p>
                    </div>
                )}
            </div>

            {/* Day Navigator */}
            <div className={`bg-white dark:bg-gray-800 p-5 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 transition-all ${isTodayView ? 'ring-2 ring-indigo-50 dark:ring-indigo-900/30 border-indigo-200 dark:border-indigo-800' : ''}`}>

                {!isTodayView && (
                    <div className="flex justify-center mb-5">
                        <button onClick={goToToday} className="text-xs font-bold text-white bg-indigo-600 px-5 py-2.5 rounded-full hover:bg-indigo-700 shadow-lg shadow-indigo-200 dark:shadow-none transition-all flex items-center gap-2 active:scale-95">
                            برو به امروز <ArrowDownToLine size={14} />
                        </button>
                    </div>
                )}

                <div className="flex justify-between items-center mb-6">
                    <button onClick={() => setCurrentDay(currentDay - 1)} disabled={currentDay === 1} className="w-10 h-10 rounded-xl bg-gray-50 dark:bg-gray-700 text-gray-600 dark:text-gray-300 disabled:opacity-30 hover:bg-indigo-50 dark:hover:bg-gray-600 hover:text-indigo-600 transition flex items-center justify-center active:scale-95">
                        <ChevronRight size={20} />
                    </button>
                    <div className="text-center">
                        <div className="flex flex-col items-center">
                            <span className="text-xs text-gray-400 dark:text-gray-500 font-medium mb-1">روز {currentDay} از {totalDays}</span>
                            <div className="flex items-center gap-2">
                                <span className="text-xl font-black text-gray-800 dark:text-white">{activeDateShamsi}</span>
                                {isDayHoliday && (
                                    <span className="bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400 text-[10px] px-2 py-0.5 rounded-full font-bold border border-rose-200 dark:border-rose-800">تعطیل</span>
                                )}
                            </div>
                        </div>
                    </div>
                    <button onClick={() => setCurrentDay(currentDay + 1)} disabled={currentDay === totalDays} className="w-10 h-10 rounded-xl bg-gray-50 dark:bg-gray-700 text-gray-600 dark:text-gray-300 disabled:opacity-30 hover:bg-indigo-50 dark:hover:bg-gray-600 hover:text-indigo-600 transition flex items-center justify-center active:scale-95">
                        <ChevronLeft size={20} />
                    </button>
                </div>

                <div className="flex items-center gap-5">
                    <div className="w-16 h-16 relative flex-shrink-0">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie data={displayChartData} innerRadius={22} outerRadius={32} startAngle={90} endAngle={-270} dataKey="value" stroke="none" cornerRadius={4}>
                                    {displayChartData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={displayChartData[0].name === 'Empty' ? '#374151' : CHART_COLORS[index % CHART_COLORS.length]} />
                                    ))}
                                </Pie>
                            </PieChart>
                        </ResponsiveContainer>
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                            <span className="text-[10px] font-black text-gray-700 dark:text-gray-300">{dailyProgress}%</span>
                        </div>
                    </div>
                    <div className="flex-1 space-y-2">
                        <div className="flex justify-between text-xs font-bold text-gray-500 dark:text-gray-400">
                            <span>وضعیت روز</span>
                            <span>{completedDailyTasks} از {dailyTasksForChart.length}</span>
                        </div>
                        <ProgressBar percentage={dailyProgress} heightClass="h-2.5" colorClass="bg-indigo-600" />
                    </div>
                </div>
            </div>

            {/* Quick Actions */}
            <div>
                <h2 className="text-xs font-bold text-gray-400 mb-2 px-1">دسترسی سریع</h2>
                <div className="grid grid-cols-3 gap-2">
                    <button onClick={openAdd} className="col-span-1 bg-gray-900 dark:bg-indigo-600 text-white p-3 rounded-2xl flex flex-col items-center justify-center gap-1 shadow-lg shadow-gray-200 dark:shadow-none active:scale-95 transition-all">
                        <Plus size={20} />
                        <span className="text-[10px] font-bold">تسک جدید</span>
                    </button>
                    <button onClick={() => navigate('/ai-chat')} className="col-span-1 bg-gradient-to-br from-violet-500 to-purple-600 text-white p-3 rounded-2xl flex flex-col items-center justify-center gap-1 shadow-lg shadow-violet-200 dark:shadow-none active:scale-95 transition-all">
                        <Bot size={20} />
                        <span className="text-[10px] font-bold">دستیار AI</span>
                    </button>
                    <button onClick={() => setIsTimerOpen(true)} className="col-span-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 p-3 rounded-2xl flex flex-col items-center justify-center gap-1 shadow-sm active:scale-95 transition-all hover:bg-gray-50 dark:hover:bg-gray-700">
                        <Clock size={20} className="text-indigo-500" />
                        <span className="text-[10px] font-bold">تایمر</span>
                    </button>
                </div>
            </div>

            {/* Daily Note Section */}
            <div className={`bg-white/50 dark:bg-gray-800/50 backdrop-blur-xl rounded-[2rem] p-5 border border-white/40 dark:border-gray-700/50 shadow-[0_8px_30px_rgb(0,0,0,0.02)] transition-all duration-500 ${noteExpanded ? 'ring-2 ring-amber-100 dark:ring-amber-900/20' : ''}`}>
                <div className="flex justify-between items-center mb-3 cursor-pointer group" onClick={() => setNoteExpanded(!noteExpanded)}>
                    <h3 className="text-sm font-black text-gray-700 dark:text-gray-200 flex items-center gap-2">
                        <div className="w-8 h-8 bg-amber-100 dark:bg-amber-900/30 rounded-xl flex items-center justify-center text-amber-600 dark:text-amber-400 group-hover:scale-110 transition-transform">
                            <StickyNote size={18} fill="currentColor" className="opacity-70" />
                        </div>
                        یادداشت روزانه
                    </h3>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center bg-gray-50 dark:bg-gray-700/50 transition-all duration-300 ${noteExpanded ? 'rotate-180 bg-amber-50 dark:bg-amber-900/20 text-amber-600' : 'text-gray-400'}`}>
                        <ChevronRight size={18} className="rotate-270" />
                    </div>
                </div>

                <div className={`transition-all duration-500 overflow-hidden ${noteExpanded ? 'max-h-[300px] opacity-100 mt-2' : currentNote ? 'max-h-16 opacity-100' : 'max-h-0 opacity-0'}`}>
                    <textarea
                        value={currentNote}
                        onChange={(e) => setCurrentNote(e.target.value)}
                        onBlur={handleSaveNote}
                        placeholder="امروز چطور گذشت؟ اهداف انجام شد؟ ..."
                        className={`w-full bg-slate-50/50 dark:bg-gray-900/30 border border-slate-100 dark:border-gray-700 rounded-2xl p-4 text-sm outline-none focus:bg-white dark:focus:bg-gray-900 focus:ring-4 focus:ring-indigo-500/5 transition-all text-gray-800 dark:text-gray-200 placeholder:text-gray-400 leading-relaxed shadow-inner ${!noteExpanded ? 'h-14 overflow-hidden text-ellipsis line-clamp-2 py-2' : 'min-h-[120px]'}`}
                    />
                    {noteExpanded && (
                        <div className="flex justify-end mt-3">
                            <button onClick={handleSaveNote} className="px-6 py-2.5 text-xs font-black bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 shadow-lg shadow-indigo-200 dark:shadow-none transition-all active:scale-95 flex items-center gap-2">
                                <Save size={14} /> ذخیره نهایی
                            </button>
                        </div>
                    )}
                </div>
                {!noteExpanded && !currentNote && (
                    <p onClick={() => setNoteExpanded(true)} className="text-[11px] text-gray-400 font-medium cursor-pointer hover:text-indigo-500 transition-colors mr-10">یک یادداشت برای امروز بنویسید...</p>
                )}
            </div>

            {/* Filter Bar */}
            <div className="relative">
                <input
                    type="text"
                    placeholder="جستجو (نام درس، مبحث، تگ)..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl px-4 py-3 pl-10 text-sm outline-none focus:border-indigo-500 dark:focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition shadow-sm placeholder:text-gray-400 dark:text-white"
                />
                <button onClick={() => setShowFilters(!showFilters)} className={`absolute left-2 top-2 p-1.5 rounded-lg transition-colors ${showFilters || filterSubject !== 'ALL' ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400' : 'text-gray-400 hover:text-gray-600'}`}>
                    <SlidersHorizontal size={18} />
                </button>
            </div>

            {showFilters && (
                <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
                    <button onClick={() => setFilterSubject('ALL')} className={`whitespace-nowrap px-4 py-1.5 rounded-full text-xs font-bold border transition-all ${filterSubject === 'ALL' ? 'bg-gray-800 text-white border-gray-800 dark:bg-white dark:text-gray-900' : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700'}`}>همه</button>
                    {/* Combine stream subjects with any custom user subjects */}
                    {Array.from(new Set([...streamSubjects, ...subjects.map(s => s.name).filter(n => !Object.values(Subject).includes(n as any))])).map(sub => {
                        const style = getSubjectStyle(sub);
                        return (
                            <button key={sub} onClick={() => setFilterSubject(sub)} className={`whitespace-nowrap px-4 py-1.5 rounded-full text-xs font-bold border transition-all flex items-center gap-1 ${filterSubject === sub ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700'}`}>
                                <span>{style.icon}</span>
                                {sub}
                            </button>
                        )
                    })}
                </div>
            )}

            {/* List */}
            <div className="pb-24 space-y-3">
                {searchQuery === '' && (
                    <div className="flex items-center justify-between mb-2 px-1">
                        <div className="flex items-center gap-2">
                            <Zap size={16} className="text-amber-500" fill="currentColor" />
                            <h2 className="text-sm font-bold text-gray-800 dark:text-gray-200">برنامه امروز</h2>
                        </div>
                    </div>
                )}

                {showOverdue && (
                    <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800 rounded-2xl p-4 shadow-sm">
                        <div className="flex justify-between items-start mb-3">
                            <div className="flex items-center gap-2 text-amber-800 dark:text-amber-400 font-bold text-sm">
                                <AlertTriangle size={18} />
                                <div>
                                    <h3>{rawOverdueTasks.length} تسک عقب‌افتاده</h3>
                                    {(() => {
                                        const overdueTests = rawOverdueTasks.reduce((acc, t) => {
                                            // Calculate based on testRange using helper
                                            const planned = parseTestCount(t.testRange);
                                            return acc + (planned > 0 ? planned : 0);
                                        }, 0);

                                        return overdueTests > 0 ? (
                                            <p className="text-[10px] font-normal opacity-80">{overdueTests} تست نزده</p>
                                        ) : null;
                                    })()}
                                </div>
                            </div>
                            <button
                                onClick={shiftIncompleteTasks}
                                className="text-[10px] bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 px-2 py-1 rounded-lg flex items-center gap-1 hover:bg-amber-200 transition"
                            >
                                <ArrowRightCircle size={12} />
                                شیفت به آینده
                            </button>
                        </div>

                        <div className="space-y-2 max-h-60 overflow-y-auto pr-1 custom-scrollbar">
                            {rawOverdueTasks.map(task => (
                                <TaskCard
                                    key={task.id}
                                    task={task}
                                    isOverdue={true}
                                    onToggle={toggleTask}
                                    onEdit={openEdit}
                                    onDelete={handleDelete}
                                    onMoveToToday={handleMoveToToday}
                                    viewMode={viewMode}
                                />
                            ))}
                        </div>
                    </div>
                )}

                {processedTasks.length > 0 ? (
                    processedTasks.map(task => (
                        <TaskCard
                            key={task.id}
                            task={task}
                            onToggle={toggleTask}
                            onEdit={openEdit}
                            onDelete={handleDelete}
                            viewMode={viewMode}
                        />
                    ))
                ) : (
                    <div className="text-center py-10 bg-white dark:bg-gray-800 rounded-3xl border border-gray-100 dark:border-gray-700 border-dashed">
                        <p className="text-gray-400 text-sm font-medium">هیچ تسکی نیست!</p>
                        <button onClick={openAdd} className="mt-2 text-indigo-600 dark:text-indigo-400 text-sm font-bold hover:underline">افزودن</button>
                    </div>
                )}
            </div>


            {/* Task Modals - Moved outside to prevent stacking context issues */}
            {isModalOpen && (
                <TaskModal
                    isOpen={isModalOpen}
                    onClose={() => setIsModalOpen(false)}
                    initialData={editingTask}
                    currentDayId={currentDay}
                    onSave={handleSaveTask}
                />
            )}
        </div>
    );
};

export default Dashboard;
