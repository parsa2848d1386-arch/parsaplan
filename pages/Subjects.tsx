import React, { useState, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useStore } from '../context/StoreContext';
import { Subject, SubjectTask, getSubjectStyle, SUBJECT_ICONS, CustomSubject, SUBJECT_LISTS, isSpecializedSubject } from '../types';
import { ChevronDown, ChevronUp, Circle, CheckCircle2, Pencil, Trash2, Plus, X, Check, LayoutGrid, List, Calendar, GripVertical } from 'lucide-react';
import TaskModal from '../components/TaskModal';
import { getShamsiDate, toIsoString } from '../utils';

// Modal for adding/editing custom subjects
const SubjectModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onSave: (subject: CustomSubject) => void;
    editingSubject?: CustomSubject | null;
    existingSubjectNames: string[];
}> = ({ isOpen, onClose, onSave, editingSubject, existingSubjectNames }) => {
    const [name, setName] = useState(editingSubject?.name || '');
    const [selectedIcon, setSelectedIcon] = useState(editingSubject?.icon || '📚');
    const [selectedColor, setSelectedColor] = useState(editingSubject?.color || 'gray');

    React.useEffect(() => {
        if (editingSubject) {
            setName(editingSubject.name);
            setSelectedIcon(editingSubject.icon);
            setSelectedColor(editingSubject.color);
        } else {
            setName('');
            setSelectedIcon('📚');
            setSelectedColor('gray');
        }
    }, [editingSubject, isOpen]);

    const suggestedSubjects = Object.entries(SUBJECT_ICONS).filter(
        ([key]) => !existingSubjectNames.includes(key) && key !== 'شخصی'
    );

    const colors = ['emerald', 'violet', 'orange', 'blue', 'amber', 'cyan', 'indigo', 'purple', 'pink', 'teal', 'red', 'rose', 'green', 'sky'];

    if (!isOpen) return null;

    const handleSave = () => {
        if (!name.trim()) return;
        onSave({
            id: editingSubject?.id || crypto.randomUUID(),
            name: name.trim(),
            icon: selectedIcon,
            color: selectedColor
        });
        onClose();
    };

    const handleSelectSuggested = (subjectName: string) => {
        const style = getSubjectStyle(subjectName);
        setName(subjectName);
        setSelectedIcon(style.icon);
        setSelectedColor(style.color);
    };

    return createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center pointer-events-none">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity duration-300 pointer-events-auto" onClick={onClose}></div>
            <div className="relative pointer-events-auto w-full max-w-md m-4 bg-white dark:bg-gray-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 fade-in duration-300 border border-white/20 dark:border-gray-700/50">
                <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center">
                    <h2 className="text-lg font-bold text-gray-800 dark:text-white">
                        {editingSubject ? 'ویرایش درس' : 'افزودن درس جدید'}
                    </h2>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition">
                        <X size={20} className="text-gray-500" />
                    </button>
                </div>
                <div className="p-6 space-y-5 overflow-y-auto max-h-[60vh] custom-scrollbar">
                    <div>
                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">نام درس</label>
                        <input type="text" value={name} onChange={(e) => setName(e.target.value)}
                            placeholder="مثال: زبان انگلیسی"
                            className="w-full bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl px-4 py-3 outline-none focus:border-indigo-500 transition text-gray-800 dark:text-white" dir="rtl" />
                    </div>
                    <div>
                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">دروس پیشنهادی</label>
                        <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto p-1 custom-scrollbar">
                            {suggestedSubjects.map(([subjectName, style]) => (
                                <button key={subjectName} onClick={() => handleSelectSuggested(subjectName)}
                                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all border ${name === subjectName ? 'bg-indigo-100 dark:bg-indigo-500/20 border-indigo-300 dark:border-indigo-700 text-indigo-700 dark:text-indigo-300' : 'bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600'}`}>
                                    <span>{style.icon}</span><span>{subjectName}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                    <div className="flex items-center gap-4 p-4 bg-gray-50 dark:bg-gray-700 rounded-xl">
                        <div className={`w-16 h-16 rounded-2xl bg-${selectedColor}-100 dark:bg-${selectedColor}-500/20 text-${selectedColor}-600 dark:text-${selectedColor}-400 flex items-center justify-center text-2xl`}>
                            {selectedIcon}
                        </div>
                        <div>
                            <p className="font-bold text-gray-800 dark:text-white">{name || 'درس جدید'}</p>
                            <p className="text-xs text-gray-500">پیش‌نمایش</p>
                        </div>
                    </div>
                    <div>
                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">انتخاب رنگ</label>
                        <div className="flex flex-wrap gap-2">
                            {colors.map((color) => (
                                <button key={color} onClick={() => setSelectedColor(color)}
                                    className={`w-8 h-8 rounded-lg bg-${color}-500 transition-all ${selectedColor === color ? 'ring-2 ring-offset-2 ring-gray-400 scale-110' : 'hover:scale-105'}`} />
                            ))}
                        </div>
                    </div>
                </div>
                <div className="p-6 border-t border-gray-100 dark:border-gray-700 flex gap-3">
                    <button onClick={onClose} className="flex-1 py-3 rounded-xl border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-bold hover:bg-gray-50 dark:hover:bg-gray-700 transition">انصراف</button>
                    <button onClick={handleSave} disabled={!name.trim()} className="flex-1 py-3 rounded-xl bg-indigo-600 text-white font-bold hover:bg-indigo-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                        <Check size={18} />ذخیره
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
};

// === نمای تب‌ها ===
type ViewMode = 'subjects' | 'daily' | 'monthly';

const Subjects = () => {
    const { toggleTask, tasks, updateTask, deleteTask, getDayDate, subjects, addSubject, updateSubject, deleteSubject, reorderSubjects, settings, todayDayId, currentDay, totalDays, startDate } = useStore();
    const [expandedSubject, setExpandedSubject] = useState<string | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingTask, setEditingTask] = useState<SubjectTask | null>(null);
    const [isSubjectModalOpen, setIsSubjectModalOpen] = useState(false);
    const [editingSubject, setEditingSubject] = useState<CustomSubject | null>(null);
    const [activeView, setActiveView] = useState<ViewMode>('subjects');

    // === Drag & Drop State ===
    const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
    const [draggedSubjectId, setDraggedSubjectId] = useState<string | null>(null);

    const currentStream = settings?.stream || 'general';
    const streamSubjects = SUBJECT_LISTS[currentStream] || [];
    const [onlySpecialized, setOnlySpecialized] = useState(true);

    const displayedSubjects = subjects.filter(s => {
        if (s.name === 'شخصی') return true;
        const isDefault = Object.keys(SUBJECT_ICONS).includes(s.name);
        if (isDefault) {
            const inStream = streamSubjects.includes(s.name) || SUBJECT_LISTS['general'].includes(s.name);
            if (!inStream) return false;

            if (onlySpecialized && currentStream !== 'general') {
                const isSpecial = isSpecializedSubject(currentStream, s.name);
                if (!isSpecial) return false;
            }
            return true;
        }
        return true;
    });

    const getSubjectTasks = (subjectName: string) => {
        return tasks.filter(t => t.subject === subjectName).sort((a, b) => a.dayId - b.dayId);
    };

    const handleSaveTask = (taskData: Partial<SubjectTask>) => {
        if (editingTask) {
            updateTask({ ...editingTask, ...taskData } as SubjectTask);
        }
    };

    const openEdit = (e: React.MouseEvent, task: SubjectTask) => {
        e.stopPropagation();
        setEditingTask(task);
        setIsModalOpen(true);
    };

    const handleDelete = (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        deleteTask(id);
    };

    const handleSaveSubject = (subject: CustomSubject) => {
        if (editingSubject) updateSubject(subject);
        else addSubject(subject);
    };

    const handleEditSubject = (e: React.MouseEvent, subject: CustomSubject) => {
        e.stopPropagation();
        setEditingSubject(subject);
        setIsSubjectModalOpen(true);
    };

    const handleDeleteSubject = (e: React.MouseEvent, subjectId: string) => {
        e.stopPropagation();
        deleteSubject(subjectId);
    };

    const openAddSubject = () => {
        setEditingSubject(null);
        setIsSubjectModalOpen(true);
    };

    // === Drag & Drop Handlers ===
    const handleDragStart = (e: React.DragEvent, taskId: string) => {
        setDraggedTaskId(taskId);
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', taskId);
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    };

    const handleDrop = (e: React.DragEvent, targetTaskId: string) => {
        e.preventDefault();
        if (!draggedTaskId || draggedTaskId === targetTaskId) return;

        const draggedTask = tasks.find(t => t.id === draggedTaskId);
        const targetTask = tasks.find(t => t.id === targetTaskId);
        if (!draggedTask || !targetTask) return;

        // جابجایی dayId و date بین دو تسک
        updateTask({ ...draggedTask, dayId: targetTask.dayId, date: targetTask.date });
        setDraggedTaskId(null);
    };

    const handleDragEnd = () => {
        setDraggedTaskId(null);
    };

    // === Subject Drag & Drop ===
    const handleSubjectDragStart = (e: React.DragEvent, subjectId: string) => {
        setDraggedSubjectId(subjectId);
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', subjectId);
    };

    const handleSubjectDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    };

    const handleSubjectDrop = (e: React.DragEvent, targetSubjectId: string) => {
        e.preventDefault();
        e.stopPropagation(); // Prevent propagation to task drop
        if (!draggedSubjectId || draggedSubjectId === targetSubjectId) return;

        const sourceIndex = subjects.findIndex(s => s.id === draggedSubjectId);
        const targetIndex = subjects.findIndex(s => s.id === targetSubjectId);

        if (sourceIndex === -1 || targetIndex === -1) return;

        const newSubjects = [...subjects];
        const [removed] = newSubjects.splice(sourceIndex, 1);
        newSubjects.splice(targetIndex, 0, removed);

        reorderSubjects(newSubjects);
        setDraggedSubjectId(null);
    };

    const handleSubjectDragEnd = () => {
        setDraggedSubjectId(null);
    };

    // === نمای روزانه: گروه‌بندی تسک‌ها بر اساس تاریخ ===
    const tasksByDate = useMemo(() => {
        const groups: Record<string, SubjectTask[]> = {};
        tasks.forEach(t => {
            const key = t.date || 'بدون تاریخ';
            if (!groups[key]) groups[key] = [];
            groups[key].push(t);
        });
        return Object.entries(groups)
            .sort(([a], [b]) => a.localeCompare(b))
            .filter(([date]) => {
                // فقط ۷ روز آینده + ۳ روز گذشته
                const today = new Date();
                const d = new Date(date);
                const diffDays = Math.floor((d.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
                return diffDays >= -3 && diffDays <= 7;
            });
    }, [tasks]);

    // === نمای ماهانه: تقویم شمسی ===
    const monthlyView = useMemo(() => {
        const today = new Date();
        const days: { date: string; dayNum: number; tasks: SubjectTask[]; isToday: boolean }[] = [];

        // ۳۰ روز آینده
        for (let i = -3; i <= 30; i++) {
            const d = new Date(today);
            d.setDate(today.getDate() + i);
            const iso = d.toISOString().split('T')[0];
            const dayTasks = tasks.filter(t => t.date === iso);
            days.push({
                date: iso,
                dayNum: d.getDate(),
                tasks: dayTasks,
                isToday: i === 0
            });
        }
        return days;
    }, [tasks]);

    // ===== رندر تسک با قابلیت drag =====
    const renderTask = (task: SubjectTask, subjectStyle: { color: string; icon: string }) => {
        const isDone = task.isCompleted;
        return (
            <div
                key={task.id}
                draggable
                onDragStart={(e) => handleDragStart(e, task.id)}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, task.id)}
                onDragEnd={handleDragEnd}
                onClick={() => toggleTask(task.id)}
                className={`group p-4 flex items-start gap-3 transition-all duration-200 border-b border-gray-50 dark:border-gray-700/50 last:border-0 hover:bg-white dark:hover:bg-gray-700/50 cursor-grab active:cursor-grabbing relative ${isDone ? 'bg-gray-50 dark:bg-gray-900/40' : 'bg-transparent'} ${draggedTaskId === task.id ? 'opacity-50 scale-95' : ''}`}
            >
                {/* آیکون drag */}
                <div className="mt-1.5 text-gray-300 dark:text-gray-600 cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity">
                    <GripVertical size={14} />
                </div>

                <div className={`mt-1 transition-all duration-300 ${isDone ? `text-${subjectStyle.color}-500 scale-110` : 'text-gray-300 dark:text-gray-600 hover:text-gray-400'}`}>
                    {isDone ? <CheckCircle2 size={20} fill="currentColor" className="text-white dark:text-gray-800" /> : <Circle size={20} strokeWidth={2} />}
                </div>

                <div className={`flex-1 transition-all duration-500 ${isDone ? 'opacity-50 grayscale' : ''}`}>
                    <div className="flex justify-between items-center mb-1">
                        <div className="flex items-center gap-2">
                            <span className="text-[10px] font-bold text-gray-400">روز {task.dayId} ({getDayDate(task.dayId)})</span>
                            {task.dayId === todayDayId && (
                                <span className="text-[9px] bg-indigo-500 text-white px-1.5 py-0.5 rounded-full animate-pulse font-black">الان</span>
                            )}
                        </div>
                        <span className={`text-[10px] px-2 py-0.5 rounded-lg font-bold bg-${subjectStyle.color}-100 dark:bg-${subjectStyle.color}-500/20 text-${subjectStyle.color}-800 dark:text-${subjectStyle.color}-300`}>{task.details}</span>
                    </div>
                    <p className={`text-sm text-gray-800 dark:text-gray-200 font-bold leading-5 transition-all ${isDone ? 'line-through' : ''}`}>{task.topic}</p>
                    {task.testRange && <p className="text-xs text-gray-500 mt-1 font-mono bg-white dark:bg-gray-700 inline-block px-1 rounded border border-gray-100 dark:border-gray-600">{task.testRange}</p>}
                </div>

                {task.dayId === todayDayId && (
                    <div className="absolute right-0 top-2 bottom-2 w-1 bg-indigo-500 rounded-l-full shadow-[0_0_10px_rgba(99,102,241,0.5)] animate-pulse" />
                )}

                <div className="flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity pl-1 absolute left-2 top-4">
                    <button onClick={(e) => openEdit(e, task)} className="text-blue-500 hover:text-blue-700 bg-white dark:bg-gray-700 p-1 rounded-md shadow-sm border border-gray-100 dark:border-gray-600"><Pencil size={14} /></button>
                    <button onClick={(e) => handleDelete(e, task.id)} className="text-rose-500 hover:text-rose-700 bg-white dark:bg-gray-700 p-1 rounded-md shadow-sm border border-gray-100 dark:border-gray-600"><Trash2 size={14} /></button>
                </div>
            </div>
        );
    };

    return (
        <div className="p-5 pb-32 animate-in fade-in duration-300">
            <TaskModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSave={handleSaveTask}
                initialData={editingTask}
                currentDayId={1}
            />
            <SubjectModal
                isOpen={isSubjectModalOpen}
                onClose={() => setIsSubjectModalOpen(false)}
                onSave={handleSaveSubject}
                editingSubject={editingSubject}
                existingSubjectNames={subjects.map(s => s.name)}
            />

            {/* هدر + تب‌ها */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                <div className="flex items-center gap-3">
                    <div className="w-11 h-11 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-md shadow-indigo-200/50 dark:shadow-none shrink-0">
                        <LayoutGrid className="text-white" size={22} />
                    </div>
                    <div>
                        <h1 className="text-xl md:text-2xl font-black text-gray-800 dark:text-white tracking-tight">مدیریت دروس</h1>
                        <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-0.5 font-medium">وضعیت مطالعه و تست‌ها به تفکیک درس</p>
                    </div>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                    {/* تب‌های نمایش */}
                    <div className="flex items-center bg-gray-100 dark:bg-gray-800 rounded-xl p-1 gap-1">
                        <button
                            onClick={() => setActiveView('subjects')}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all ${activeView === 'subjects' ? 'bg-white dark:bg-gray-700 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700'}`}
                        >
                            <LayoutGrid size={13} />
                            دروس
                        </button>
                        <button
                            onClick={() => setActiveView('daily')}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all ${activeView === 'daily' ? 'bg-white dark:bg-gray-700 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700'}`}
                        >
                            <List size={13} />
                            روزانه
                        </button>
                        <button
                            onClick={() => setActiveView('monthly')}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all ${activeView === 'monthly' ? 'bg-white dark:bg-gray-700 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700'}`}
                        >
                            <Calendar size={13} />
                            ماهانه
                        </button>
                    </div>
                    {currentStream !== 'general' && activeView === 'subjects' && (
                        <button
                            onClick={() => setOnlySpecialized(!onlySpecialized)}
                            className={`text-[11px] px-3.5 py-2.5 rounded-2xl font-black transition-all border shrink-0 ${
                                onlySpecialized
                                    ? 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 border-indigo-100/30 dark:border-indigo-900/30'
                                    : 'bg-gray-50 dark:bg-gray-800 text-gray-400 border-gray-200/30 dark:border-gray-700/30'
                            }`}
                        >
                            {onlySpecialized ? 'فقط دروس تخصصی 🎯' : 'همه دروس 📚'}
                        </button>
                    )}
                    <button
                        onClick={openAddSubject}
                        className="flex items-center gap-2 bg-indigo-600 text-white px-5 py-2.5 rounded-2xl font-black text-[11px] shadow-lg shadow-indigo-200 dark:shadow-none hover:bg-indigo-700 hover:translate-y-[-2px] transition-all active:scale-95 shrink-0"
                    >
                        <Plus size={18} />
                        درس جدید
                    </button>
                </div>
            </div>

            {/* ===== نمای ۱: دروس (پیش‌فرض) با Drag & Drop ===== */}
            {activeView === 'subjects' && (
                <div className="space-y-4">
                    {displayedSubjects.map(subject => {
                        const subjectName = subject.name;
                        const subjectTasks = getSubjectTasks(subjectName);
                        const style = { icon: subject.icon, color: subject.color, bgColor: `bg-${subject.color}-50 dark:bg-${subject.color}-500/20` };
                        const completedCount = subjectTasks.filter(t => t.isCompleted).length;
                        const progress = subjectTasks.length > 0 ? Math.round((completedCount / subjectTasks.length) * 100) : 0;
                        const isExpanded = expandedSubject === subjectName;
                        const isOriginalDefault = Object.keys(SUBJECT_ICONS).includes(subjectName) && subjectName !== 'شخصی';

                        return (
                            <div
                                key={subject.id}
                                draggable
                                onDragStart={(e) => handleSubjectDragStart(e, subject.id)}
                                onDragOver={handleSubjectDragOver}
                                onDrop={(e) => handleSubjectDrop(e, subject.id)}
                                onDragEnd={handleSubjectDragEnd}
                                className={`bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden transition-all duration-300 hover:shadow-md ${draggedSubjectId === subject.id ? 'opacity-50 scale-95 border-indigo-300 border-dashed' : ''} cursor-grab active:cursor-grabbing`}
                            >
                                <div onClick={() => setExpandedSubject(isExpanded ? null : subjectName)} className="p-4 flex items-center justify-between cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 active:scale-[0.99] transition-all select-none">
                                    <div className="flex items-center gap-3">
                                        <div className="text-gray-300 dark:text-gray-600 cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity absolute right-2">
                                            {/* We can add grip here but the whole card is draggable now */}
                                        </div>
                                        <div className={`w-12 h-12 rounded-2xl ${style.bgColor} flex items-center justify-center text-2xl`}>{style.icon}</div>
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <h3 className="font-bold text-gray-800 dark:text-white text-lg">{subjectName}</h3>
                                                {!isOriginalDefault && <span className="text-[10px] bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 px-1.5 py-0.5 rounded">سفارشی</span>}
                                            </div>
                                            <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">{completedCount} از {subjectTasks.length} انجام شده</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <div className="flex gap-1">
                                            <button onClick={(e) => handleEditSubject(e, subject)} className="p-1.5 text-gray-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition"><Pencil size={14} /></button>
                                            <button onClick={(e) => handleDeleteSubject(e, subject.id)} className="p-1.5 text-gray-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/30 rounded-lg transition"><Trash2 size={14} /></button>
                                        </div>
                                        <div className="text-xs font-bold text-gray-400">{progress}%</div>
                                        {isExpanded ? <ChevronUp size={20} className="text-gray-400" /> : <ChevronDown size={20} className="text-gray-400" />}
                                    </div>
                                </div>

                                <div className="h-1.5 w-full bg-gray-50 dark:bg-gray-900/50">
                                    <div className={`h-full bg-${style.color}-500 transition-all duration-500`} style={{ width: `${progress}%` }}></div>
                                </div>

                                {isExpanded && (
                                    <div className="bg-gray-50/50 dark:bg-gray-900/30 divide-y divide-gray-100 dark:divide-gray-700">
                                        {subjectTasks.length === 0 ? (
                                            <div className="p-8 text-center"><p className="text-gray-400 text-sm">هیچ تسکی برای این درس ثبت نشده</p></div>
                                        ) : (
                                            subjectTasks.map(task => renderTask(task, style))
                                        )}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}

            {/* ===== نمای ۲: روزانه ===== */}
            {activeView === 'daily' && (
                <div className="space-y-6">
                    {tasksByDate.length === 0 ? (
                        <div className="text-center py-16">
                            <p className="text-gray-400 text-sm">تسکی در این بازه زمانی وجود ندارد</p>
                        </div>
                    ) : (
                        tasksByDate.map(([date, dateTasks]) => {
                            const isToday = date === new Date().toISOString().split('T')[0];
                            const completedCount = dateTasks.filter(t => t.isCompleted).length;
                            return (
                                <div key={date} className={`bg-white dark:bg-gray-800 rounded-2xl border overflow-hidden transition-all ${isToday ? 'border-indigo-200 dark:border-indigo-800 shadow-md shadow-indigo-50 dark:shadow-none' : 'border-gray-100 dark:border-gray-700 shadow-sm'}`}>
                                    <div className={`px-4 py-3 flex items-center justify-between ${isToday ? 'bg-indigo-50 dark:bg-indigo-900/30' : 'bg-gray-50 dark:bg-gray-900/30'}`}>
                                        <div className="flex items-center gap-2">
                                            {isToday && <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />}
                                            <h3 className={`text-sm font-extrabold ${isToday ? 'text-indigo-700 dark:text-indigo-300' : 'text-gray-700 dark:text-gray-200'}`}>
                                                {isToday ? '📌 امروز' : getShamsiDate(date)}
                                            </h3>
                                            <span className="text-[10px] text-gray-400 font-mono">{date}</span>
                                        </div>
                                        <span className="text-[11px] font-bold text-gray-400">{completedCount}/{dateTasks.length}</span>
                                    </div>
                                    <div className="divide-y divide-gray-50 dark:divide-gray-700/50">
                                        {dateTasks.map(task => {
                                            const st = getSubjectStyle(task.subject);
                                            return renderTask(task, st);
                                        })}
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            )}

            {/* ===== نمای ۳: ماهانه (تقویم) ===== */}
            {activeView === 'monthly' && (
                <div>
                    {/* هدر هفته */}
                    <div className="grid grid-cols-7 gap-2 mb-3">
                        {['ش', 'ی', 'د', 'س', 'چ', 'پ', 'ج'].map(d => (
                            <div key={d} className="text-center text-[11px] font-bold text-gray-400 dark:text-gray-500 py-1">{d}</div>
                        ))}
                    </div>

                    {/* گرید روزها */}
                    <div className="grid grid-cols-7 gap-2">
                        {monthlyView.map(day => {
                            const hasTasks = day.tasks.length > 0;
                            const allDone = hasTasks && day.tasks.every(t => t.isCompleted);
                            const someDone = hasTasks && day.tasks.some(t => t.isCompleted) && !allDone;

                            return (
                                <div
                                    key={day.date}
                                    className={`relative min-h-[72px] rounded-xl p-2 border transition-all cursor-pointer hover:shadow-md ${day.isToday
                                        ? 'bg-indigo-50 dark:bg-indigo-900/30 border-indigo-200 dark:border-indigo-800 shadow-sm'
                                        : 'bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700'
                                        }`}
                                    title={`${getShamsiDate(day.date)} — ${day.tasks.length} تسک`}
                                >
                                    <div className="flex items-center justify-between mb-1">
                                        <span className={`text-[11px] font-bold ${day.isToday ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-500 dark:text-gray-400'}`}>
                                            {day.dayNum}
                                        </span>
                                        {hasTasks && (
                                            <span className={`w-2 h-2 rounded-full ${allDone ? 'bg-emerald-400' : someDone ? 'bg-amber-400' : 'bg-gray-300 dark:bg-gray-600'}`} />
                                        )}
                                    </div>
                                    {day.tasks.slice(0, 2).map(t => {
                                        const st = getSubjectStyle(t.subject);
                                        return (
                                            <div key={t.id} className={`text-[8px] font-bold px-1 py-0.5 rounded mb-0.5 truncate bg-${st.color}-100 dark:bg-${st.color}-500/20 text-${st.color}-700 dark:text-${st.color}-300`}>
                                                {st.icon} {t.subject}
                                            </div>
                                        );
                                    })}
                                    {day.tasks.length > 2 && (
                                        <div className="text-[8px] text-gray-400 font-bold">+{day.tasks.length - 2} دیگر</div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
};

export default Subjects;
