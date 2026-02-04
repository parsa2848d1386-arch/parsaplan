import React, { useState, useEffect } from 'react';
import { useStore } from '../context/StoreContext';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { ChevronLeft, ChevronRight, CheckCircle2, Circle, Trash2, Pencil, Plus, Search, AlertTriangle, ArrowDownToLine, X, Calendar, SlidersHorizontal, BookOpen, Clock, Zap, StickyNote, Save, Quote, Trophy, ArrowRightCircle, Target, Bot } from 'lucide-react';
import AISettings from '../components/AISettings';
import ProgressBar from '../components/ProgressBar';
import { Subject, SubjectTask } from '../types';
import TaskModal from '../components/TaskModal';
import MoodTracker from '../components/MoodTracker';
import { getShamsiDate, toIsoString, isHoliday } from '../utils';
import { useNavigate } from 'react-router-dom';

const Dashboard = () => {
    const {
        userName, currentDay, setCurrentDay, goToToday, todayDayId,
        getProgress, getTasksByDate, getDayDate,
        toggleTask, deleteTask, addTask, updateTask, moveTaskToDate,
        tasks: allTasks,
        getDailyNote, saveDailyNote,
        viewMode, setIsTimerOpen,
        level, xp, dailyQuote, shiftIncompleteTasks,
        totalDays
    } = useStore();

    const navigate = useNavigate();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingTask, setEditingTask] = useState<SubjectTask | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [showFilters, setShowFilters] = useState(false);
    const [filterSubject, setFilterSubject] = useState<string>('ALL');
    const [noteExpanded, setNoteExpanded] = useState(false);
    const [currentNote, setCurrentNote] = useState('');
    const [isAIOpen, setIsAIOpen] = useState(false);

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
    let processedTasks = searchQuery.length > 0 ? allTasks : getTasksByDate(activeDateIso);
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
                dayId: 0,
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

    const renderTaskCard = (task: SubjectTask, isOverdue = false) => {
        const isDone = task.isCompleted;
        const taskDateShamsi = getShamsiDate(task.date);

        let subColor = 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300';
        if (task.subject.includes('زیست')) subColor = 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300';
        if (task.subject.includes('ریاضی')) subColor = 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300';
        if (task.subject.includes('فیزیک')) subColor = 'bg-violet-100 text-violet-800 dark:bg-violet-900/40 dark:text-violet-300';
        if (task.subject.includes('شیمی')) subColor = 'bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300';
        if (task.isCustom) subColor = 'bg-gray-800 text-white dark:bg-gray-700';

        const hasTestStats = task.testStats && task.testStats.total > 0;
        const accuracy = hasTestStats ? Math.round(((task.testStats!.correct * 3 - task.testStats!.wrong) / (task.testStats!.total * 3)) * 100) : 0;

        if (viewMode === 'compact') {
            return (
                <div
                    key={task.id}
                    onClick={() => toggleTask(task.id)}
                    className={`group relative bg-white dark:bg-gray-800 p-3 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 flex items-center gap-3 transition-all duration-300 active:scale-[0.99] cursor-pointer hover:shadow-md ${isDone ? 'bg-gray-50/80 dark:bg-gray-800/50' : ''} ${isOverdue ? 'border-amber-200 dark:border-amber-800' : ''}`}
                >
                    <div className={`flex-shrink-0 transition-all ${isDone ? 'text-emerald-500' : 'text-gray-300 dark:text-gray-600'}`}>
                        {isDone ? <CheckCircle2 size={20} fill="currentColor" className="text-white dark:text-gray-800" /> : <Circle size={20} strokeWidth={2} />}
                    </div>
                    <div className="flex-1 min-w-0 flex items-center justify-between">
                        <div className={`truncate ${isDone ? 'opacity-50 line-through' : ''}`}>
                            <span className="font-bold text-sm text-gray-800 dark:text-gray-200">{task.subject}</span>
                            <span className="mx-2 text-xs text-gray-400 dark:text-gray-500">|</span>
                            <span className="text-xs text-gray-600 dark:text-gray-400 truncate">{task.topic}</span>
                        </div>
                        <div className="flex gap-1 items-center">
                            {hasTestStats && (
                                <div className="hidden sm:flex items-center gap-1 bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded text-[9px] font-bold">
                                    <span className="text-emerald-600 dark:text-emerald-400">{task.testStats?.correct}✅</span>
                                    <span className="text-rose-500">{task.testStats?.wrong}❌</span>
                                    <span className="text-gray-400">|</span>
                                    <span className={`${accuracy >= 50 ? 'text-emerald-600' : 'text-amber-500'}`}>{accuracy}%</span>
                                </div>
                            )}
                            {task.tags && task.tags.length > 0 && <span className="text-[9px] bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 px-1 rounded flex items-center">#{task.tags[0]}</span>}
                            <span className={`text-[10px] px-2 py-0.5 rounded-md font-bold whitespace-nowrap ml-1 ${subColor}`}>
                                {task.details}
                            </span>
                        </div>
                    </div>
                    <div className="flex gap-1 pl-1">
                        <button onClick={(e) => openEdit(e, task)} className="text-gray-400 hover:text-blue-500"><Pencil size={14} /></button>
                        <button onClick={(e) => handleDelete(e, task.id)} className="text-gray-400 hover:text-rose-500"><Trash2 size={14} /></button>
                    </div>
                </div>
            );
        }

        return (
            <div
                key={task.id}
                onClick={() => toggleTask(task.id)}
                className={`group relative bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 flex items-start gap-3 transition-all duration-300 active:scale-[0.99] cursor-pointer hover:shadow-md ${isDone ? 'bg-gray-50/80 dark:bg-gray-800/50' : ''} ${isOverdue ? 'border-amber-200 bg-amber-50/30 dark:border-amber-900/50 dark:bg-amber-900/10' : ''}`}
            >
                <div className={`mt-1 transition-all duration-300 transform ${isDone ? 'text-emerald-500 scale-110' : 'text-gray-300 dark:text-gray-600 group-hover:text-indigo-400'}`}>
                    {isDone ? <CheckCircle2 size={24} fill="currentColor" className="text-white dark:text-gray-800" /> : <Circle size={24} strokeWidth={2} />}
                </div>
                <div className={`flex-1 transition-all duration-500 pl-8 ${isDone ? 'opacity-40 grayscale blur-[0.5px]' : ''}`}>
                    <div className="flex justify-between items-start">
                        <h3 className={`font-bold text-gray-800 dark:text-gray-200 transition-all ${isDone ? 'line-through decoration-2 decoration-gray-300 dark:decoration-gray-600' : ''}`}>{task.subject}</h3>
                        <div className="flex flex-col items-end gap-1">
                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${subColor}`}>
                                {task.details}
                            </span>
                            <span className="flex items-center gap-1 text-[10px] text-gray-400 dark:text-gray-500 font-medium">
                                <Calendar size={10} />
                                {taskDateShamsi}
                            </span>
                        </div>
                    </div>
                    <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 leading-relaxed font-medium">
                        <span className="font-bold text-gray-800 dark:text-gray-300">مبحث:</span> {task.topic}
                    </p>

                    <div className="flex flex-wrap items-center gap-2 mt-3">
                        {hasTestStats && (
                            <div className="flex items-center gap-2 bg-gray-50 dark:bg-gray-700 border border-gray-100 dark:border-gray-600 rounded-lg px-2 py-1 text-[10px] font-bold">
                                <span className="flex items-center gap-0.5 text-emerald-600 dark:text-emerald-400" title="تعداد درست"><Target size={10} /> {task.testStats?.correct}</span>
                                <span className="text-gray-300 dark:text-gray-600">|</span>
                                <span className="text-rose-500 dark:text-rose-400" title="تعداد غلط">{task.testStats?.wrong} غلط</span>
                                <span className="text-gray-300 dark:text-gray-600">|</span>
                                <span className={`${accuracy >= 50 ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-500 dark:text-amber-400'}`}>{accuracy}%</span>
                            </div>
                        )}

                        {task.tags && task.tags.length > 0 && (
                            <div className="flex gap-1">
                                {task.tags.map(t => (
                                    <span key={t} className="text-[10px] bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 px-1.5 py-0.5 rounded border border-indigo-100 dark:border-indigo-800 hover:bg-indigo-100 transition">#{t}</span>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                <div className="absolute left-2 top-2 flex flex-col gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                    <button onClick={(e) => openEdit(e, task)} className="p-1.5 rounded-lg bg-gray-50 dark:bg-gray-700 text-blue-600 dark:text-blue-400 border border-gray-100 dark:border-gray-600 hover:bg-blue-50 dark:hover:bg-blue-900/30"><Pencil size={14} /></button>
                    <button onClick={(e) => handleDelete(e, task.id)} className="p-1.5 rounded-lg bg-gray-50 dark:bg-gray-700 text-rose-600 dark:text-rose-400 border border-gray-100 dark:border-gray-600 hover:bg-rose-50 dark:hover:bg-rose-900/30"><Trash2 size={14} /></button>
                    {isOverdue && <button onClick={(e) => { e.stopPropagation(); handleMoveToToday(task.id); }} className="p-1.5 rounded-lg bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100"><ArrowDownToLine size={14} /></button>}
                </div>
            </div>
        );
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
                <div className="flex justify-between items-center bg-white dark:bg-gray-800 p-4 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700">
                    <div>
                        <h1 className="text-xl font-black text-gray-800 dark:text-white tracking-tight">سلام، {userName} 👋</h1>
                        <div className="flex items-center gap-2 mt-1">
                            <span className="text-[10px] font-bold bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 px-2 py-0.5 rounded-full flex items-center gap-1">
                                <Trophy size={10} />
                                سطح {level}
                            </span>
                            <span className="text-[10px] text-gray-400">({xp} XP)</span>
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
                {isTodayView && <MoodTracker />}

                {/* Daily Quote */}
                <div className="bg-gradient-to-r from-violet-600 to-indigo-600 rounded-3xl p-4 text-white shadow-lg relative overflow-hidden">
                    <Quote size={40} className="absolute right-2 top-2 text-white/10 rotate-180" />
                    <p className="text-sm font-medium leading-6 relative z-10 text-center px-4">
                        "{dailyQuote}"
                    </p>
                </div>
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
                <div className="grid grid-cols-4 gap-2">
                    <button onClick={openAdd} className="col-span-1 bg-gray-900 dark:bg-indigo-600 text-white p-3 rounded-2xl flex flex-col items-center justify-center gap-1 shadow-lg shadow-gray-200 dark:shadow-none active:scale-95 transition-all">
                        <Plus size={20} />
                        <span className="text-[10px] font-bold">تسک جدید</span>
                    </button>
                    <button onClick={() => setIsAIOpen(true)} className="col-span-1 bg-gradient-to-br from-violet-500 to-purple-600 text-white p-3 rounded-2xl flex flex-col items-center justify-center gap-1 shadow-lg shadow-violet-200 dark:shadow-none active:scale-95 transition-all">
                        <Bot size={20} />
                        <span className="text-[10px] font-bold">دستیار AI</span>
                    </button>
                    <button onClick={() => setIsTimerOpen(true)} className="col-span-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 p-3 rounded-2xl flex flex-col items-center justify-center gap-1 shadow-sm active:scale-95 transition-all hover:bg-gray-50 dark:hover:bg-gray-700">
                        <Clock size={20} className="text-indigo-500" />
                        <span className="text-[10px] font-bold">تایمر</span>
                    </button>
                    <button onClick={() => navigate('/routine')} className="col-span-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 p-3 rounded-2xl flex flex-col items-center justify-center gap-1 shadow-sm active:scale-95 transition-all hover:bg-gray-50 dark:hover:bg-gray-700">
                        <Zap size={20} className="text-amber-500" />
                        <span className="text-[10px] font-bold">روتین</span>
                    </button>
                </div>
            </div>

            {/* Daily Note Section */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 border border-gray-200 dark:border-gray-700 shadow-sm">
                <div className="flex justify-between items-center mb-2 cursor-pointer" onClick={() => setNoteExpanded(!noteExpanded)}>
                    <h3 className="text-xs font-bold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                        <StickyNote size={14} className="text-amber-500" />
                        یادداشت روزانه
                    </h3>
                    <div className={`transition-transform duration-300 ${noteExpanded ? 'rotate-180' : ''}`}>
                        <ChevronLeft size={16} className="text-gray-400" />
                    </div>
                </div>

                {(noteExpanded || currentNote) && (
                    <div className={`transition-all duration-300 ${noteExpanded ? 'opacity-100' : 'opacity-80'}`}>
                        <textarea
                            value={currentNote}
                            onChange={(e) => setCurrentNote(e.target.value)}
                            onBlur={handleSaveNote}
                            placeholder="امروز چطور گذشت؟ ..."
                            className={`w-full bg-amber-50/50 dark:bg-gray-700/50 border border-amber-100 dark:border-gray-600 rounded-xl p-3 text-sm outline-none focus:bg-white dark:focus:bg-gray-700 transition text-gray-800 dark:text-gray-200 placeholder:text-gray-400 min-h-[80px] ${!noteExpanded ? 'h-10 min-h-0 overflow-hidden text-ellipsis whitespace-nowrap pt-2' : ''}`}
                        />
                        {noteExpanded && (
                            <button onClick={handleSaveNote} className="mt-2 w-full text-xs font-bold bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 py-2 rounded-lg hover:bg-amber-200 transition">ذخیره یادداشت</button>
                        )}
                    </div>
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
                    {Object.values(Subject).map(sub => (
                        <button key={sub} onClick={() => setFilterSubject(sub)} className={`whitespace-nowrap px-4 py-1.5 rounded-full text-xs font-bold border transition-all ${filterSubject === sub ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700'}`}>{sub}</button>
                    ))}
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
                                        const calculateTestCount = (range: string | undefined): number => {
                                            if (!range) return 0;
                                            const clean = range.replace(/[^\d\-\,]/g, ''); // Remove non-numeric/separator chars
                                            if (!clean) return 0;

                                            // Handle "10-20"
                                            if (clean.includes('-')) {
                                                const parts = clean.split('-');
                                                const start = parseInt(parts[0]);
                                                const end = parseInt(parts[1]);
                                                if (!isNaN(start) && !isNaN(end)) return Math.abs(end - start) + 1;
                                            }
                                            // Handle "10,12,15"
                                            if (clean.includes(',')) {
                                                return clean.split(',').filter(Boolean).length;
                                            }
                                            // Single number? Assume 1 for now or maybe it's just a number
                                            // If it looks like a count (e.g. "20 test"), user might enter anything.
                                            // Safest is to rely on ranges. If just "100", implies test 100 (1 test).
                                            return 1;
                                        };

                                        const overdueTests = rawOverdueTasks.reduce((acc, t) => {
                                            if (t.testStats && t.testStats.total > 0) return acc + t.testStats.total;
                                            return acc + calculateTestCount(t.testRange);
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
                            {rawOverdueTasks.map(task => renderTaskCard(task, true))}
                        </div>
                    </div>
                )}

                {processedTasks.length > 0 ? (
                    processedTasks.map(task => renderTaskCard(task))
                ) : (
                    <div className="text-center py-10 bg-white dark:bg-gray-800 rounded-3xl border border-gray-100 dark:border-gray-700 border-dashed">
                        <p className="text-gray-400 text-sm font-medium">هیچ تسکی نیست!</p>
                        <button onClick={openAdd} className="mt-2 text-indigo-600 dark:text-indigo-400 text-sm font-bold hover:underline">افزودن</button>
                    </div>
                )}
            </div>

            {/* AI Settings Modal */}
            <AISettings isOpen={isAIOpen} onClose={() => setIsAIOpen(false)} />
        </div>
    );
};

export default Dashboard;
